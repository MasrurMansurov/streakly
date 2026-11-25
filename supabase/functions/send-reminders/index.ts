// Streakly reminders: sends a Web Push notification to users who still have
// habits due today, at their chosen local time — plus a separate push for each
// habit that has its own reminder time.
//
// Called by:
//   - pg_cron every 15 min      → { action: "send" }            auth: x-cron-token (Vault secret)
//   - the app ("Send test")     → { action: "test" }            auth: the user's JWT
//   - the app (pact check-in)   → { action: "pact", habitId }   auth: the user's JWT
//   - pg_cron daily             → { action: "cleanup" }         auth: x-cron-token
//   - setup / diagnostics       → { action: "setup" | "selftest" | "send", dryRun? }  auth: x-cron-token
//
// Secrets live in Supabase Vault and are read over the built-in DB connection,
// so nothing sensitive has to be configured by hand.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import postgres from "npm:postgres@3.4.5"
import webpush from "npm:web-push@3.6.7"

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 3 })
const SITE_URL = "https://streakly-pied-six.vercel.app"

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

async function vaultSecret(name: string): Promise<string | null> {
  const [row] = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name}`
  return row?.decrypted_secret ?? null
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function isCron(req: Request) {
  const token = req.headers.get("x-cron-token")
  const expected = await vaultSecret("reminders_cron_token")
  return Boolean(token && expected && safeEqual(token, expected))
}

/** Verifies the caller's Supabase JWT and returns the user id. */
async function userIdFromJwt(req: Request): Promise<string | null> {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) return null
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
    headers: { authorization: auth, apikey: Deno.env.get("SUPABASE_ANON_KEY")! },
  })
  if (!res.ok) return null
  const user = await res.json()
  return typeof user?.id === "string" ? user.id : null
}

/** VAPID keys are generated once and stored in Vault. */
async function vapidKeys(create = false) {
  const [publicKey, privateKey] = await Promise.all([vaultSecret("vapid_public_key"), vaultSecret("vapid_private_key")])
  if (publicKey && privateKey) return { publicKey, privateKey }
  if (!create) return null
  const keys = webpush.generateVAPIDKeys()
  await sql`select vault.create_secret(${keys.publicKey}, 'vapid_public_key')`
  await sql`select vault.create_secret(${keys.privateKey}, 'vapid_private_key')`
  return keys
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string }
type Payload = {
  title: string
  body: string
  url: string
  tag: string
  /** one-tap check-in button (where the browser supports notification actions) */
  actions?: { action: "checkin"; title: string }[]
  habitId?: string
  doneText?: string
  /** habits still due today → app-icon badge */
  due?: number
}

/** Sends to every subscription; removes ones the push service says are gone. */
async function push(subs: Sub[], payload: Payload) {
  const keys = await vapidKeys()
  if (!keys) throw new Error("VAPID keys missing — run setup")
  let sent = 0
  let removed = 0
  const errors: string[] = []
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
        vapidDetails: { subject: SITE_URL, publicKey: keys.publicKey, privateKey: keys.privateKey },
        TTL: 60 * 60,
        urgency: "normal",
      })
      sent++
      await sql`update public.push_subscriptions set last_success_at = now() where id = ${s.id}`
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await sql`delete from public.push_subscriptions where id = ${s.id}`
        removed++
      } else {
        errors.push(`${status ?? "?"}: ${(e as Error).message}`.slice(0, 200))
      }
    }
  }
  return { sent, removed, errors }
}

/**
 * Habits still due today for a user (not done today, weekly target not reached),
 * with the daily streak that ends yesterday (consecutive dates d where d + rank = today).
 */
async function dueHabits(userId: string, localDate: string, scope: { only?: string; skipTimed?: boolean } = {}) {
  return await sql<{ id: string; name: string; streak: number; cue: string | null }[]>`
    select h.id, h.name, h.cue,
      case when h.target_per_week >= 7 then (
        select count(*)::int from (
          select l.log_date, row_number() over (order by l.log_date desc) as rn
          from public.habit_logs l
          where l.habit_id = h.id and l.log_date < ${localDate}::date and l.log_date >= ${localDate}::date - 400
        ) x where x.log_date + x.rn::int = ${localDate}::date
      ) else 0 end as streak
    from public.habits h
    where h.user_id = ${userId}
      and h.archived_at is null
      and h.graduated_at is null  -- graduated habits run on autopilot: no reminders
      ${scope.only ? sql`and h.id = ${scope.only}` : sql``}
      -- habits with their own time get their own push, not the daily one
      ${scope.skipTimed ? sql`and not exists (select 1 from public.habit_reminders r where r.habit_id = h.id)` : sql``}
      and not exists (select 1 from public.habit_logs l where l.habit_id = h.id and l.log_date = ${localDate}::date)
      and (
        h.target_per_week >= 7
        or (select count(*) from public.habit_logs l
            where l.habit_id = h.id
              and l.log_date between ${localDate}::date - (extract(isodow from ${localDate}::date)::int - 1)
                                 and ${localDate}::date) < h.target_per_week
      )
    order by h.position, h.created_at`
}

type Locale = "en" | "ru"

const ruPlural = (n: number, one: string, few: string, many: string) => {
  const rule = new Intl.PluralRules("ru-RU").select(n)
  return rule === "one" ? one : rule === "few" ? few : many
}

/** Notification texts (kept in sync with src/i18n/dictionaries → push). */
const TEXT = {
  en: {
    title: "Keep your streak alive 🔥",
    one: (name: string) => `“${name}” is still waiting for you today.`,
    many: (n: number, names: string) => `${n} habits left today: ${names}`,
    testTitle: "Streakly",
    testBody: "Reminders are on. See you tonight! 🔥",
    riskTitle: (n: number) => `Your ${n}-day streak is at risk`,
    risk: (name: string, n: number) => `“${name}” — ${n} days in a row. One check-in today keeps it going.`,
    checkIn: (name: string) => `✓ ${name}`,
    done: "Done:",
    cue: (cue: string, name: string) => `${cue} → time for “${name}”.`,
    pactTurnTitle: "Your pact partner checked in",
    pactTurn: (name: string, habit: string) => `${name} is done with “${habit}”. Your turn — keep your shared streak going!`,
    pactBothTitle: "You both did it today",
    pactBoth: (name: string) => `${name} checked in too — your shared streak grows.`,
  },
  ru: {
    title: "Не прерывайте серию 🔥",
    one: (name: string) => `«${name}» ещё ждёт вас сегодня.`,
    many: (n: number, names: string) =>
      `На сегодня ${ruPlural(n, "осталась", "осталось", "осталось")} ${n} ${ruPlural(n, "привычка", "привычки", "привычек")}: ${names}`,
    testTitle: "Streakly",
    testBody: "Напоминания включены. До вечера! 🔥",
    riskTitle: (n: number) => `Серия ${n} ${ruPlural(n, "день", "дня", "дней")} под угрозой`,
    risk: (name: string, n: number) => `«${name}» — ${n} ${ruPlural(n, "день", "дня", "дней")} подряд. Одна отметка сегодня — и серия продолжится.`,
    checkIn: (name: string) => `✓ ${name}`,
    done: "Отмечено:",
    cue: (cue: string, name: string) => `${cue} → пора: «${name}».`,
    pactTurnTitle: "Партнёр по пакту отметился",
    pactTurn: (name: string, habit: string) => `${name}: «${habit}» — готово. Ваша очередь, чтобы сохранить общую серию!`,
    pactBothTitle: "Сегодня вы оба справились",
    pactBoth: (name: string) => `${name} — отметка есть. Общая серия растёт!`,
  },
} satisfies Record<Locale, unknown>

const asLocale = (value: unknown): Locale => (value === "ru" ? "ru" : "en")

const short = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/**
 * The daily reminder. If a streak of 3+ days is at stake, lead with it ("at risk");
 * the most important habit gets a one-tap check-in button.
 */
function message(
  habits: { id: string; name: string; streak: number; cue?: string | null }[],
  locale: Locale,
  opts: { tag?: string; due?: number } = {}
): Payload {
  const t = TEXT[locale]
  const names = habits.map((h) => h.name)
  const top = [...habits].sort((a, b) => b.streak - a.streak)[0]
  const list = `${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`
  const atRisk = top && top.streak >= 3
  return {
    title: atRisk ? t.riskTitle(top.streak) : t.title,
    // the if-then plan is the strongest cue we have — use it when there is one
    body: atRisk
      ? t.risk(top.name, top.streak)
      : top?.cue
        ? t.cue(top.cue, top.name)
        : names.length === 1
          ? t.one(names[0])
          : t.many(names.length, list),
    url: top ? `/${locale}/dashboard#habit-${top.id}` : `/${locale}/dashboard`,
    tag: opts.tag ?? "daily-reminder",
    actions: top ? [{ action: "checkin", title: short(t.checkIn(top.name)) }] : [],
    habitId: top?.id,
    doneText: t.done,
    due: opts.due ?? habits.length,
  }
}

/** Users whose local reminder time passed in the last 2 hours and who weren't reminded today. */
async function runReminders(dryRun: boolean) {
  const candidates = await sql<{ user_id: string; local_date: string; locale: string }[]>`
    select rs.user_id, rs.locale, ((now() at time zone rs.timezone)::date)::text as local_date
    from public.reminder_settings rs
    join pg_timezone_names tz on tz.name = rs.timezone
    where rs.enabled
      and exists (select 1 from public.push_subscriptions s where s.user_id = rs.user_id)
      and ((now() at time zone rs.timezone)::time - rs.remind_at) >= interval '0'
      and ((now() at time zone rs.timezone)::time - rs.remind_at) < interval '2 hours'
      and (rs.last_reminded_on is null or rs.last_reminded_on < (now() at time zone rs.timezone)::date)
      -- vacation mode: stay quiet
      and not exists (
        select 1 from public.pauses p
        where p.user_id = rs.user_id
          and (now() at time zone rs.timezone)::date between p.start_date and p.end_date
      )`

  const results = []
  for (const c of candidates) {
    if (dryRun) {
      const due = await dueHabits(c.user_id, c.local_date, { skipTimed: true })
      results.push({ user: c.user_id.slice(0, 8), due: due.length, risk: Math.max(0, ...due.map((h) => h.streak)) })
      continue
    }
    // claim the day atomically, so overlapping runs never double-send
    const claimed = await sql`
      update public.reminder_settings set last_reminded_on = ${c.local_date}::date
      where user_id = ${c.user_id}
        and (last_reminded_on is null or last_reminded_on < ${c.local_date}::date)
      returning user_id`
    if (claimed.length === 0) continue
    // "still due?" is decided after the claim, right before sending: a check-in
    // made meanwhile means no push at all (a silent push gets revoked on iOS)
    const due = await dueHabits(c.user_id, c.local_date, { skipTimed: true })
    if (due.length === 0) continue
    const subs = await sql<Sub[]>`select id, endpoint, p256dh, auth from public.push_subscriptions where user_id = ${c.user_id}`
    const allDue = (await dueHabits(c.user_id, c.local_date)).length
    results.push({ user: c.user_id.slice(0, 8), due: due.length, ...(await push(subs, message(due, asLocale(c.locale), { due: allDue }))) })
  }
  return { candidates: candidates.length, results }
}

/**
 * Per-habit reminders ("Workout" at 07:00): one push per habit at its own local
 * time, once a day, only while it's still due. Same master switch, time zone and
 * vacation rules as the daily reminder.
 */
async function runHabitReminders(dryRun: boolean) {
  const candidates = await sql<{ habit_id: string; user_id: string; local_date: string; locale: string }[]>`
    select r.habit_id, r.user_id, rs.locale, ((now() at time zone rs.timezone)::date)::text as local_date
    from public.habit_reminders r
    join public.reminder_settings rs on rs.user_id = r.user_id
    join pg_timezone_names tz on tz.name = rs.timezone
    where rs.enabled
      and exists (select 1 from public.push_subscriptions s where s.user_id = r.user_id)
      and ((now() at time zone rs.timezone)::time - r.remind_at) >= interval '0'
      and ((now() at time zone rs.timezone)::time - r.remind_at) < interval '2 hours'
      and (r.last_sent_on is null or r.last_sent_on < (now() at time zone rs.timezone)::date)
      and not exists (
        select 1 from public.pauses p
        where p.user_id = r.user_id
          and (now() at time zone rs.timezone)::date between p.start_date and p.end_date
      )`

  const results = []
  for (const c of candidates) {
    if (dryRun) {
      const due = await dueHabits(c.user_id, c.local_date, { only: c.habit_id })
      results.push({ habit: c.habit_id.slice(0, 8), due: due.length })
      continue
    }
    const claimed = await sql`
      update public.habit_reminders set last_sent_on = ${c.local_date}::date
      where habit_id = ${c.habit_id}
        and (last_sent_on is null or last_sent_on < ${c.local_date}::date)
      returning habit_id`
    if (claimed.length === 0) continue
    const due = await dueHabits(c.user_id, c.local_date, { only: c.habit_id })
    if (due.length === 0) continue // already done today → stay quiet
    const subs = await sql<Sub[]>`select id, endpoint, p256dh, auth from public.push_subscriptions where user_id = ${c.user_id}`
    const allDue = (await dueHabits(c.user_id, c.local_date)).length
    results.push({
      habit: c.habit_id.slice(0, 8),
      ...(await push(subs, message(due, asLocale(c.locale), { tag: `habit-${c.habit_id}`, due: allDue }))),
    })
  }
  return { candidates: candidates.length, results }
}

/**
 * The caller just checked in `habitId`. For each active pact built on it, tell the
 * partner (once per their local day): "your turn" or "you both did it".
 */
async function runPactNudge(userId: string, habitId: string) {
  // the caller must own a recent check-in of this habit — no nudges out of thin air
  const [recent] = await sql`
    select 1 from public.habit_logs
    where habit_id = ${habitId} and user_id = ${userId} and log_date >= current_date - 1`
  if (!recent) return { pacts: 0, results: [] }

  const pacts = await sql<{ id: string; partner_is_inviter: boolean; partner_id: string; partner_habit_id: string; my_habit: string; my_name: string }[]>`
    select p.id,
           p.invitee_id = ${userId} as partner_is_inviter,
           case when p.inviter_id = ${userId} then p.invitee_id else p.inviter_id end as partner_id,
           case when p.inviter_id = ${userId} then p.invitee_habit_id else p.inviter_habit_id end as partner_habit_id,
           h.name as my_habit,
           coalesce(me.display_name, me.username) as my_name
    from public.pacts p
    join public.habits h on h.id = ${habitId}
    join public.profiles me on me.id = ${userId}
    where p.status = 'active'
      and ((p.inviter_id = ${userId} and p.inviter_habit_id = ${habitId})
        or (p.invitee_id = ${userId} and p.invitee_habit_id = ${habitId}))`

  const results = []
  for (const p of pacts) {
    const [rs] = await sql<{ enabled: boolean; locale: string; local_date: string }[]>`
      select enabled, locale, ((now() at time zone timezone)::date)::text as local_date
      from public.reminder_settings where user_id = ${p.partner_id}`
    if (!rs?.enabled) continue
    const [onVacation] = await sql`
      select 1 from public.pauses
      where user_id = ${p.partner_id} and ${rs.local_date}::date between start_date and end_date`
    if (onVacation) continue

    // claim the partner's day for this pact so repeated check-ins never spam
    const claimed = p.partner_is_inviter
      ? await sql`update public.pacts set inviter_nudged_on = ${rs.local_date}::date
                  where id = ${p.id} and (inviter_nudged_on is null or inviter_nudged_on < ${rs.local_date}::date) returning id`
      : await sql`update public.pacts set invitee_nudged_on = ${rs.local_date}::date
                  where id = ${p.id} and (invitee_nudged_on is null or invitee_nudged_on < ${rs.local_date}::date) returning id`
    if (claimed.length === 0) continue

    const [partnerDone] = await sql`
      select 1 from public.habit_logs where habit_id = ${p.partner_habit_id} and log_date = ${rs.local_date}::date`
    const locale = asLocale(rs.locale)
    const t = TEXT[locale]
    const payload: Payload = partnerDone
      ? { title: t.pactBothTitle, body: t.pactBoth(p.my_name), url: `/${locale}/dashboard`, tag: `pact-${p.id}` }
      : { title: t.pactTurnTitle, body: t.pactTurn(p.my_name, p.my_habit), url: `/${locale}/dashboard`, tag: `pact-${p.id}` }
    const subs = await sql<Sub[]>`select id, endpoint, p256dh, auth from public.push_subscriptions where user_id = ${p.partner_id}`
    results.push({ pact: p.id.slice(0, 8), both: Boolean(partnerDone), ...(await push(subs, payload)) })
  }
  return { pacts: pacts.length, results }
}

/**
 * Pact proof photos are kept for 30 days, and removed as soon as their pact is
 * gone. Storage objects can only be deleted through the Storage API.
 */
async function cleanupProofs() {
  const rows = await sql<{ name: string }[]>`
    select o.name from storage.objects o
    where o.bucket_id = 'proofs'
      and (o.created_at < now() - interval '30 days'
           or not exists (select 1 from public.pacts p where p.id::text = split_part(o.name, '/', 1)))
    limit 500`
  if (rows.length === 0) return { removed: 0 }
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/storage/v1/object/proofs`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prefixes: rows.map((r) => r.name) }),
  })
  if (!res.ok) throw new Error(`storage delete failed: ${res.status}`)
  return { removed: rows.length }
}

/** Encrypts a payload for a throwaway subscription without sending it. */
async function selfTest() {
  const keys = await vapidKeys()
  if (!keys) return { ok: false, error: "VAPID keys missing" }
  const ecdh = (await import("node:crypto")).createECDH("prime256v1")
  ecdh.generateKeys()
  const p256dh = ecdh.getPublicKey().toString("base64url")
  const auth = crypto.getRandomValues(new Uint8Array(16))
  const details = webpush.generateRequestDetails(
    { endpoint: "https://fcm.googleapis.com/fcm/send/selftest", keys: { p256dh, auth: btoa(String.fromCharCode(...auth)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_") } },
    JSON.stringify(message([{ id: "00000000-0000-0000-0000-000000000000", name: "Self-test", streak: 5 }], "en")),
    { vapidDetails: { subject: SITE_URL, publicKey: keys.publicKey, privateKey: keys.privateKey } }
  )
  return {
    ok: Boolean(details.body && details.headers.Authorization?.startsWith("vapid ")),
    encoding: details.headers["Content-Encoding"],
    bodyBytes: details.body?.length ?? 0,
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405)
  const body = await req.json().catch(() => ({}))
  const { action, dryRun } = body

  try {
    if (action === "test") {
      const userId = await userIdFromJwt(req)
      if (!userId) return json({ error: "unauthorized" }, 401)
      const subs = await sql<Sub[]>`select id, endpoint, p256dh, auth from public.push_subscriptions where user_id = ${userId}`
      if (subs.length === 0) return json({ error: "no subscriptions" }, 400)
      const [settings] = await sql`select locale from public.reminder_settings where user_id = ${userId}`
      const locale = asLocale(settings?.locale)
      const t = TEXT[locale]
      return json(await push(subs, { title: t.testTitle, body: t.testBody, url: `/${locale}/dashboard`, tag: "test" }))
    }

    if (action === "pact") {
      const userId = await userIdFromJwt(req)
      if (!userId) return json({ error: "unauthorized" }, 401)
      const { habitId } = body
      if (typeof habitId !== "string" || !/^[0-9a-f-]{36}$/i.test(habitId)) return json({ error: "bad habitId" }, 400)
      return json(await runPactNudge(userId, habitId))
    }

    if (!(await isCron(req))) return json({ error: "unauthorized" }, 401)

    if (action === "setup") return json({ publicKey: (await vapidKeys(true)).publicKey })
    if (action === "selftest") return json(await selfTest())
    if (action === "send") {
      const [daily, perHabit] = [await runReminders(Boolean(dryRun)), await runHabitReminders(Boolean(dryRun))]
      return json({ ...daily, perHabit })
    }
    if (action === "cleanup") return json(await cleanupProofs())
    return json({ error: "unknown action" }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: (e as Error).message }, 500)
  }
})
