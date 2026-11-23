// Streakly reminders: sends a Web Push notification to users who still have
// habits due today, at their chosen local time.
//
// Called by:
//   - pg_cron every 15 min      → { action: "send" }            auth: x-cron-token (Vault secret)
//   - the app ("Send test")     → { action: "test" }            auth: the user's JWT
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
type Payload = { title: string; body: string; url: string; tag: string }

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

/** Habits still due today for a user (not done today, weekly target not reached). */
async function dueHabits(userId: string, localDate: string) {
  return await sql<{ name: string }[]>`
    select h.name
    from public.habits h
    where h.user_id = ${userId}
      and h.archived_at is null
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

function message(names: string[]): Payload {
  const body =
    names.length === 1
      ? `“${names[0]}” is still waiting for you today.`
      : `${names.length} habits left today: ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`
  return { title: "Keep your streak alive 🔥", body, url: "/dashboard", tag: "daily-reminder" }
}

/** Users whose local reminder time passed in the last 2 hours and who weren't reminded today. */
async function runReminders(dryRun: boolean) {
  const candidates = await sql<{ user_id: string; local_date: string }[]>`
    select rs.user_id, ((now() at time zone rs.timezone)::date)::text as local_date
    from public.reminder_settings rs
    join pg_timezone_names tz on tz.name = rs.timezone
    where rs.enabled
      and exists (select 1 from public.push_subscriptions s where s.user_id = rs.user_id)
      and ((now() at time zone rs.timezone)::time - rs.remind_at) >= interval '0'
      and ((now() at time zone rs.timezone)::time - rs.remind_at) < interval '2 hours'
      and (rs.last_reminded_on is null or rs.last_reminded_on < (now() at time zone rs.timezone)::date)`

  const results = []
  for (const c of candidates) {
    const names = (await dueHabits(c.user_id, c.local_date)).map((h) => h.name)
    if (dryRun) {
      results.push({ user: c.user_id.slice(0, 8), due: names.length })
      continue
    }
    // claim the day atomically, so overlapping runs never double-send
    const claimed = await sql`
      update public.reminder_settings set last_reminded_on = ${c.local_date}::date
      where user_id = ${c.user_id}
        and (last_reminded_on is null or last_reminded_on < ${c.local_date}::date)
      returning user_id`
    if (claimed.length === 0 || names.length === 0) continue
    const subs = await sql<Sub[]>`select id, endpoint, p256dh, auth from public.push_subscriptions where user_id = ${c.user_id}`
    results.push({ user: c.user_id.slice(0, 8), due: names.length, ...(await push(subs, message(names))) })
  }
  return { candidates: candidates.length, results }
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
    JSON.stringify(message(["Self-test"])),
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
  const { action, dryRun } = await req.json().catch(() => ({}))

  try {
    if (action === "test") {
      const userId = await userIdFromJwt(req)
      if (!userId) return json({ error: "unauthorized" }, 401)
      const subs = await sql<Sub[]>`select id, endpoint, p256dh, auth from public.push_subscriptions where user_id = ${userId}`
      if (subs.length === 0) return json({ error: "no subscriptions" }, 400)
      return json(await push(subs, { title: "Streakly", body: "Reminders are on. See you tonight! 🔥", url: "/dashboard", tag: "test" }))
    }

    if (!(await isCron(req))) return json({ error: "unauthorized" }, 401)

    if (action === "setup") return json({ publicKey: (await vapidKeys(true)).publicKey })
    if (action === "selftest") return json(await selfTest())
    if (action === "send") return json(await runReminders(Boolean(dryRun)))
    return json({ error: "unknown action" }, 400)
  } catch (e) {
    console.error(e)
    return json({ error: (e as Error).message }, 500)
  }
})
