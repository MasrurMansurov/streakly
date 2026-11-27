import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { redirect } from "next/navigation"
import { cache } from "react"

import type { Pact, PactProof } from "./pacts"
import type { PauseReason } from "./pause"
import { buildChallenges, type Challenge } from "./challenges"
import { periodRange, type SharePeriod, type ShareHabit } from "./share"
import type { DayFeeling } from "./insights"
import { bridgesFor, habitStreak, weekStart } from "./streaks"
import { evaluateAchievements, statsFromRow } from "./achievements"
import { addDays, DEFAULT_TIMEZONE, isValidTimezone, logicalToday, parseDayStart, TIMEZONE_COOKIE, type DayStart, type ISODate } from "./dates"
import { createClient, createPublicClient } from "./supabase/server"
import type { AchievementStats } from "./achievements"
import type { Tables } from "./supabase/database.types"

export type Profile = Tables<"profiles">
export type Habit = Pick<Tables<"habits">, "id" | "name" | "description" | "color" | "position" | "target_per_week" | "created_at" | "mini_label" | "cue" | "graduated_at" | "is_private"> & {
  /** own reminder time "HH:MM" (owner only) */
  remind_at?: string | null
  /** optional steps in order (owner only) */
  steps?: { id: string; title: string }[]
}
export type HabitLog = Pick<Tables<"habit_logs">, "habit_id" | "log_date"> & { is_mini?: boolean }

/** How far back the dashboard and public profile look. */
export const HISTORY_DAYS = 26 * 7

const PAGE = 1000 // PostgREST default max rows per request

/** All-time totals for achievements (computed in Postgres, RLS applies). */
async function achievementStats(
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createPublicClient>,
  userId: string
): Promise<AchievementStats> {
  const { data } = await supabase.rpc("achievement_stats", { p_user: userId })
  return statsFromRow(data?.[0])
}

/** The verified JWT claims of this request (one check per request), or null. */
const getClaims = cache(async () => {
  await connection() // JWT expiry check uses the current time → request-time only
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims ?? null
})

/**
 * The viewer's "today": their time zone (cookie set by <TimezoneSync />) and
 * their day-start hour (auth metadata, see DayStart). The one place the
 * server decides what day it is.
 */
export async function getToday(): Promise<{ today: ISODate; timeZone: string; dayStart: DayStart }> {
  await connection() // "today" depends on the current time → request-time only
  const [jar, claims] = await Promise.all([cookies(), getClaims()])
  const tz = jar.get(TIMEZONE_COOKIE)?.value
  const timeZone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
  const meta = claims?.user_metadata as Record<string, unknown> | undefined
  const dayStart = parseDayStart(meta?.day_start)
  return { today: logicalToday(timeZone, dayStart), timeZone, dayStart }
}

/** Signed-in user (JWT verified) or null. */
export async function getCurrentUser() {
  const claims = await getClaims()
  if (!claims?.sub) return null
  // a guest: the no-sign-up demo (Supabase anonymous sign-in) — private, no social features
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null, isGuest: claims.is_anonymous === true }
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function getMyProfile(): Promise<Profile> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (error || !data) throw new Error("Profile not found")
  return data
}

type LogQuery = (from: number, to: number) => PromiseLike<{ data: HabitLog[] | null; error: unknown }>

async function fetchAllLogs(query: LogQuery): Promise<HabitLog[]> {
  const rows: HabitLog[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

/** `gift`: made with a spare repair from an invite — it doesn't use up the monthly one. */
export type Repair = { habit_id: string; day: ISODate; gift: boolean }
export type Pause = { id: string; start_date: ISODate; end_date: ISODate; reason: PauseReason }

/** Repaired days and vacation ranges of a user (RLS: own, or a public profile's). */
async function bridgesData(supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createPublicClient>, userId: string, since: ISODate) {
  const [{ data: repairs }, { data: pauses }] = await Promise.all([
    supabase.from("habit_repairs").select("habit_id, day, gift").eq("user_id", userId).gte("day", since),
    supabase.from("pauses").select("id, start_date, end_date, reason").eq("user_id", userId).gte("end_date", since).order("start_date"),
  ])
  return { repairs: (repairs ?? []) as Repair[], pauses: (pauses ?? []) as Pause[] }
}

export async function getDashboardData() {
  const user = await requireUser()
  const [{ today, timeZone }, supabase] = await Promise.all([getToday(), createClient()])
  const since = addDays(today, -(HISTORY_DAYS - 1))

  // one wave: every query only needs the user and the date range
  const [habitsRes, logs, profileRes, archivedCount, notesRes, stats, { repairs, pauses }, { data: strengthRows }, { data: moodRows }, { count: spareRepairs }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, description, color, position, target_per_week, created_at, mini_label, cue, graduated_at, is_private, habit_reminders(remind_at), habit_steps(id, title, position)")
      .eq("user_id", user.id) // RLS also exposes other users' *public* habits
      .is("archived_at", null)
      .order("position")
      .order("created_at")
      .order("position", { referencedTable: "habit_steps" }),
    fetchAllLogs((from, to) =>
      supabase
        .from("habit_logs")
        .select("habit_id, log_date, is_mini")
        .eq("user_id", user.id)
        .gte("log_date", since)
        .order("log_date")
        .range(from, to)
    ),
    supabase.from("profiles").select("username, display_name, is_public").eq("id", user.id).single(),
    getArchivedCount(user.id),
    supabase.from("habit_notes").select("habit_id, note").eq("user_id", user.id).eq("log_date", today),
    achievementStats(supabase, user.id),
    bridgesData(supabase, user.id, since),
    supabase.from("habit_strength").select("habit_id, week_start, score").eq("user_id", user.id).gte("week_start", addDays(today, -7 * 10)).order("week_start", { ascending: false }),
    supabase.from("daily_moods").select("day, mood, energy").eq("user_id", user.id).gte("day", addDays(today, -90)),
    // spare streak repairs from accepted invites (growth plan 3.3)
    supabase.from("streak_gifts").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("used_at", null),
  ])
  if (habitsRes.error) throw habitsRes.error
  // which steps are ticked today (steps exist only on some habits)
  const { data: stepLogRows } = habitsRes.data.some((h) => h.habit_steps.length)
    ? await supabase.from("habit_step_logs").select("habit_id, step_id").eq("user_id", user.id).eq("log_date", today)
    : { data: [] }
  const todaySteps: Record<string, string[]> = {}
  for (const r of stepLogRows ?? []) (todaySteps[r.habit_id] ??= []).push(r.step_id)
  // weekly self-reports per habit, newest first
  const strength: Record<string, { week: ISODate; score: number }[]> = {}
  for (const r of strengthRows ?? []) (strength[r.habit_id] ??= []).push({ week: r.week_start as ISODate, score: r.score })
  const feelings = Object.fromEntries((moodRows ?? []).map((m) => [m.day, { mood: m.mood, energy: m.energy }])) as Record<ISODate, DayFeeling>

  return {
    user,
    profile: profileRes.data,
    habits: habitsRes.data.map(({ habit_reminders, habit_steps, ...h }): Habit => ({
      ...h,
      remind_at: habit_reminders?.remind_at.slice(0, 5) ?? null,
      steps: habit_steps.map(({ id, title }) => ({ id, title })),
    })),
    todaySteps,
    logs,
    today,
    timeZone,
    archivedCount,
    stats,
    repairs,
    pauses,
    strength,
    feelings,
    spareRepairs: spareRepairs ?? 0,
    todayNotes: Object.fromEntries((notesRes.data ?? []).map((n) => [n.habit_id, n.note])) as Record<string, string>,
  }
}

/**
 * Public profile data. Uses the anon client, so RLS only returns rows of
 * profiles with is_public = true. Cached on the server for a few minutes and
 * invalidated with updateTag(`profile:<username>`) when the owner changes it.
 */
export async function getPublicProfile(username: string) {
  "use cache"
  cacheTag(`profile:${username}`)
  cacheLife("minutes")

  const supabase = createPublicClient()
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, created_at, banner, banner_url, accent, avatar_frame, status, pronouns, links, showcase, featured_habit_id"
    )
    .eq("username", username)
    .maybeSingle()
  if (!profile) return null

  // a little extra history so any viewer timezone is covered
  const since = addDays(new Date().toISOString().slice(0, 10), -(HISTORY_DAYS + 1))
  const [habitsRes, logs, stats, { repairs, pauses }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, description, color, position, target_per_week, created_at")
      .eq("user_id", profile.id)
      .is("archived_at", null)
      .order("position")
      .order("created_at"),
    fetchAllLogs((from, to) =>
      supabase
        .from("habit_logs")
        .select("habit_id, log_date")
        .eq("user_id", profile.id)
        .gte("log_date", since)
        .order("log_date")
        .range(from, to)
    ),
    achievementStats(supabase, profile.id),
    bridgesData(supabase, profile.id, since),
  ])
  return { profile, habits: habitsRes.data ?? [], logs, stats, repairs, pauses }
}

export type ArchivedHabit = Habit & { archived_at: string; checkIns: number }

/** The user's archived habits, newest first, with their total check-ins. */
export async function getArchivedHabits(): Promise<ArchivedHabit[]> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("habits")
    .select("id, name, description, color, position, target_per_week, created_at, mini_label, cue, graduated_at, is_private, archived_at, habit_logs(count)")
    .eq("user_id", user.id)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
  if (error) throw error
  return data.map(({ habit_logs, archived_at, ...h }) => ({
    ...h,
    archived_at: archived_at!,
    checkIns: habit_logs[0]?.count ?? 0,
  }))
}

/** How many habits are archived (for the dashboard link). */
export async function getArchivedCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("archived_at", "is", null)
  return count ?? 0
}

/** One of the user's own habits (active or archived) with a year of history. */
export async function getHabitDetail(id: string) {
  const user = await requireUser()
  const [{ today }, supabase] = await Promise.all([getToday(), createClient()])
  const since = addDays(today, -370)

  // one wave: every query is scoped to the user, so nothing leaks if the habit isn't theirs
  const [{ data: row }, logs, { data: notes }, { repairs, pauses }, { data: strengthRows }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, description, color, position, target_per_week, created_at, mini_label, cue, graduated_at, is_private, archived_at, habit_reminders(remind_at)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    fetchAllLogs((from, to) =>
      supabase
        .from("habit_logs")
        .select("habit_id, log_date")
        .eq("habit_id", id)
        .eq("user_id", user.id)
        .gte("log_date", since)
        .order("log_date")
        .range(from, to)
    ),
    supabase.from("habit_notes").select("log_date, note").eq("habit_id", id).eq("user_id", user.id),
    bridgesData(supabase, user.id, since),
    supabase
      .from("habit_strength")
      .select("week_start, score")
      .eq("habit_id", id)
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(12),
  ])
  if (!row) return null
  const { habit_reminders, ...rest } = row
  const habit = { ...rest, remind_at: habit_reminders?.remind_at.slice(0, 5) ?? null }

  return {
    habit,
    logs,
    today,
    strength: (strengthRows ?? []).map((r) => ({ week: r.week_start as ISODate, score: r.score })),
    repairs: repairs.filter((r) => r.habit_id === id),
    pauses,
    notes: Object.fromEntries((notes ?? []).map((n) => [n.log_date, n.note])),
  }
}

export type ReminderSettings = { enabled: boolean; remindAt: string; timezone: string; devices: number }

/** The user's reminder settings (defaults if never saved) and how many devices are subscribed. */
export async function getReminderSettings(): Promise<ReminderSettings> {
  const user = await requireUser()
  const supabase = await createClient()
  const [{ data }, { count }] = await Promise.all([
    supabase.from("reminder_settings").select("enabled, remind_at, timezone").eq("user_id", user.id).maybeSingle(),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ])
  return {
    enabled: data?.enabled ?? false,
    remindAt: (data?.remind_at ?? "20:00").slice(0, 5),
    timezone: data?.timezone ?? "UTC",
    devices: count ?? 0,
  }
}

export type FeedItem = {
  date: string
  createdAt: string
  habit: { name: string; color: string }
  person: { id: string; username: string; name: string; avatarUrl: string | null }
}

/**
 * People the user follows (only those still public), their check-ins from the
 * last 7 days, and the cheers the user already sent: high fives as
 * "personId:day", today's nudges as person ids.
 */
export async function getFriendsData() {
  const user = await requireUser()
  const [{ today, timeZone }, supabase] = await Promise.all([getToday(), createClient()])

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", user.id)
    .order("created_at", { ascending: false })
  const ids = (follows ?? []).map((f) => f.following_id)
  if (ids.length === 0)
    return { people: [], feed: [] as FeedItem[], today, timeZone, highFived: new Set<string>(), nudgedToday: new Set<string>(), sharedStreaks: [] }

  // RLS hides profiles that went private, so they simply drop out
  const [{ data: profiles }, { data: logs }, { data: sent }, { data: shared }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url, status").in("id", ids),
    supabase
      .from("habit_logs")
      .select("log_date, created_at, user_id, habits(name, color)")
      .in("user_id", ids)
      .gte("log_date", addDays(today, -6))
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("cheers").select("to_id, kind, day").eq("from_id", user.id).gte("day", addDays(today, -6)),
    // shared streaks with people who follow back (growth plan 3.2)
    supabase.rpc("shared_streaks", { p_today: today }),
  ])

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const people = ids.flatMap((id) => {
    const p = byId.get(id)
    return p ? [{ id: p.id, username: p.username, name: p.display_name || p.username, avatarUrl: p.avatar_url, status: p.status }] : []
  })
  const feed: FeedItem[] = (logs ?? []).flatMap((l) => {
    const p = byId.get(l.user_id)
    // habits(...) is null for archived habits (not public)
    if (!p || !l.habits) return []
    return [
      {
        date: l.log_date,
        createdAt: l.created_at,
        habit: { name: l.habits.name, color: l.habits.color },
        person: { id: p.id, username: p.username, name: p.display_name || p.username, avatarUrl: p.avatar_url },
      },
    ]
  })
  const highFived = new Set((sent ?? []).filter((c) => c.kind === "high_five").map((c) => `${c.to_id}:${c.day}`))
  // up to five, longest first; only people still in the list (public, followed)
  const sharedStreaks = (shared ?? [])
    .flatMap((r) => {
      const person = people.find((p) => p.id === r.friend_id)
      return person ? [{ person, streak: r.streak, meToday: r.me_today, friendToday: r.friend_today }] : []
    })
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5)
  const nudgedToday = new Set((sent ?? []).filter((c) => c.kind === "nudge" && c.day === today).map((c) => c.to_id))
  return { people, feed, today, timeZone, highFived, nudgedToday, sharedStreaks }
}

/** Who gave the user a high five or a nudge in the last day and a half (names, newest first, no repeats). */
export async function getRecentCheers(): Promise<{ highFives: string[]; nudges: string[] }> {
  // the session first: it makes the render dynamic before the client touches the clock
  await requireUser()
  const supabase = await createClient()
  const { data } = await supabase.rpc("my_recent_cheers")
  const names = (kind: string) => [...new Set((data ?? []).filter((c) => c.kind === kind).map((c) => c.from_name))]
  return { highFives: names("high_five"), nudges: names("nudge") }
}

/** Follow state between the viewer and a profile, plus public counters. */
export async function getFollowInfo(profileId: string) {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()])
  const [{ data: counts }, { data: row }] = await Promise.all([
    supabase.rpc("follow_counts", { p_profile: profileId }),
    user
      ? supabase.from("follows").select("following_id").eq("follower_id", user.id).eq("following_id", profileId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  return {
    signedIn: Boolean(user),
    isSelf: user?.id === profileId,
    following: Boolean(row),
    followers: Number(counts?.[0]?.followers ?? 0),
    followingCount: Number(counts?.[0]?.following ?? 0),
  }
}

/** The viewer's pacts (pending and active) with partner details. */
export async function getPacts(): Promise<Pact[]> {
  const user = await requireUser()
  const [{ today }, supabase] = await Promise.all([getToday(), createClient()])
  const [{ data, error }, { data: proofs }, { data: lockedIds }] = await Promise.all([
    supabase.rpc("my_pacts"),
    // RLS returns my proofs and the partner's only if I've checked in that day
    // yesterday too: a partner in another time zone may still be on "yesterday"
    supabase
      .from("pact_proofs")
      .select("pact_id, user_id, note, photo_path, day")
      .gte("day", addDays(today, -1))
      .order("day", { ascending: false }),
    supabase.rpc("pacts_with_partner_proof", { p_day: addDays(today, -1) }),
  ])
  if (error) throw new Error(error.message)

  // short-lived links for the private photos we're allowed to see
  const paths = (proofs ?? []).flatMap((p) => (p.photo_path ? [p.photo_path] : []))
  const signed = paths.length ? (await supabase.storage.from("proofs").createSignedUrls(paths, 60 * 60)).data ?? [] : []
  const urlOf = new Map(signed.flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : [])))
  const toProof = (p: { note: string | null; photo_path: string | null }): PactProof => ({
    note: p.note,
    photoUrl: p.photo_path ? (urlOf.get(p.photo_path) ?? null) : null,
  })
  const partnerHasProof = new Set(lockedIds ?? [])

  return (data ?? []).map((r) => {
    // newest first: my proof for today, the partner's latest (today or yesterday)
    const mine = proofs?.find((p) => p.pact_id === r.id && p.user_id === user.id && p.day === today)
    const theirs = proofs?.find((p) => p.pact_id === r.id && p.user_id !== user.id)
    return {
      id: r.id,
      status: r.status === "active" ? "active" : "pending",
      iInvited: r.i_invited,
      partner: { username: r.partner_username, name: r.partner_name, avatarUrl: r.partner_avatar },
      myHabit: r.my_habit_id && r.my_habit_name ? { id: r.my_habit_id, name: r.my_habit_name } : null,
      partnerHabit: r.partner_habit_name ? { name: r.partner_habit_name, color: r.partner_habit_color ?? "emerald" } : null,
      partnerDates: (r.partner_dates ?? []) as ISODate[],
      pausedDays: (r.paused_days ?? []) as ISODate[],
      proofs: {
        mine: mine ? toProof(mine) : null,
        partner: theirs ? toProof(theirs) : null,
        partnerLocked: !theirs && partnerHasProof.has(r.id),
      },
    }
  })
}

/** The viewer's active habits, for pickers. */
export async function getMyHabitChoices() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase
    .from("habits")
    .select("id, name, color")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("position")
  return data ?? []
}

export type LeaderboardRow = {
  username: string
  name: string
  avatarUrl: string | null
  checkins: number
  activeDays: number
  score: number
}

/** Top public profiles over the last 30 days (cached for a few minutes). */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  "use cache"
  cacheTag("leaderboard")
  cacheLife("minutes")
  const { data, error } = await createPublicClient().rpc("leaderboard", { p_limit: 50 })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    username: r.username,
    name: r.display_name || r.username,
    avatarUrl: r.avatar_url,
    checkins: r.checkins_30,
    activeDays: r.active_days_30,
    score: r.score,
  }))
}

/** Public profiles matching a name or @username (excluding the viewer), with follow state. */
export async function searchPeople(query: string) {
  const user = await requireUser()
  // keep letters, digits, spaces, "_", "-", "." — nothing that could change the filter syntax
  const q = query.replace(/^@/, "").replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 40)
  if (q.length < 2) return []
  // "_" stays a one-character wildcard in ILIKE — harmless, it only widens the match
  const like = `*${q}*`
  const supabase = await createClient()
  const [{ data: people }, { data: follows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .eq("is_public", true)
      .neq("id", user.id)
      .or(`username.ilike."${like}",display_name.ilike."${like}"`)
      .order("username")
      .limit(10),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
  ])
  const following = new Set((follows ?? []).map((f) => f.following_id))
  return (people ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    name: p.display_name || p.username,
    avatarUrl: p.avatar_url,
    bio: p.bio,
    following: following.has(p.id),
  }))
}

/** The viewer's current or upcoming vacation, if any. */
export async function getActivePause(): Promise<(Pause & { today: ISODate }) | { today: ISODate }> {
  const user = await requireUser()
  const [{ today }, supabase] = await Promise.all([getToday(), createClient()])
  const { data } = await supabase
    .from("pauses")
    .select("id, start_date, end_date, reason")
    .eq("user_id", user.id)
    .gte("end_date", today)
    .order("start_date")
    .limit(1)
    .maybeSingle()
  return data ? { ...(data as Pause), today } : { today }
}

/** Everything the share card needs for the signed-in user (null when signed out). */
export async function getShareData(period: SharePeriod) {
  const user = await getCurrentUser()
  if (!user) return null
  const [{ today }, supabase] = await Promise.all([getToday(), createClient()])
  const { start } = periodRange(period, today)
  const since = [start, addDays(today, -400)].sort()[0] as ISODate

  const [{ data: profile }, { data: habits }, logs, { repairs, pauses }] = await Promise.all([
    supabase.from("profiles").select("username, display_name").eq("id", user.id).single(),
    supabase
      .from("habits")
      .select("id, name, color, target_per_week")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("position"),
    fetchAllLogs((from, to) =>
      supabase
        .from("habit_logs")
        .select("habit_id, log_date")
        .eq("user_id", user.id)
        .gte("log_date", since)
        .order("log_date")
        .range(from, to)
    ),
    bridgesData(supabase, user.id, since),
  ])
  const byHabit = new Map<string, Set<ISODate>>()
  for (const l of logs) byHabit.set(l.habit_id, (byHabit.get(l.habit_id) ?? new Set()).add(l.log_date as ISODate))
  const shareHabits: ShareHabit[] = (habits ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    color: h.color,
    target: h.target_per_week,
    done: byHabit.get(h.id) ?? new Set(),
    bridges: bridgesFor(h.id, repairs, pauses),
  }))
  return { today, name: profile?.display_name || `@${profile?.username ?? "me"}`, habits: shareHabits }
}

/** The viewer's challenges (active, upcoming and finished in the last week) with standings. */
export async function getChallenges(): Promise<Challenge[]> {
  await requireUser()
  const [{ today }, supabase] = await Promise.all([getToday(), createClient()])
  const { data, error } = await supabase.rpc("my_challenges", { p_today: today })
  if (error) throw new Error(error.message)
  return buildChallenges(data ?? [], today)
}

/** For "Profile look" in Settings: earned badges and habits with their current streak. */
export async function getAppearanceData() {
  const user = await requireUser()
  const [{ today }, supabase] = await Promise.all([getToday(), createClient()])
  const since = addDays(today, -400)
  const [stats, { data: habits }, logs, { repairs, pauses }] = await Promise.all([
    achievementStats(supabase, user.id),
    supabase.from("habits").select("id, name, color, target_per_week").eq("user_id", user.id).is("archived_at", null).order("position"),
    fetchAllLogs((from, to) =>
      supabase.from("habit_logs").select("habit_id, log_date").eq("user_id", user.id).gte("log_date", since).order("log_date").range(from, to)
    ),
    bridgesData(supabase, user.id, since),
  ])
  const byHabit = new Map<string, Set<ISODate>>()
  for (const l of logs) byHabit.set(l.habit_id, (byHabit.get(l.habit_id) ?? new Set()).add(l.log_date as ISODate))
  return {
    userId: user.id,
    earned: evaluateAchievements(stats).filter((a) => a.earned).map((a) => a.id),
    habits: (habits ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      streak: habitStreak(byHabit.get(h.id) ?? new Set(), today, h.target_per_week, bridgesFor(h.id, repairs, pauses)),
    })),
  }
}

/** This week's AI letter, if one was written. */
export async function getWeeklyLetter() {
  const user = await requireUser()
  const [{ today }, supabase] = await Promise.all([getToday(), createClient()])
  const { data } = await supabase
    .from("weekly_letters")
    .select("body, created_at")
    .eq("user_id", user.id)
    .eq("week_start", weekStart(today))
    .maybeSingle()
  return data
}

/**
 * Year in review (growth plan 2.1). The recap year is the current one, and
 * still the previous one during the first half of January.
 */
export async function getWrappedData() {
  const user = await requireUser()
  const [{ today, timeZone }, supabase] = await Promise.all([getToday(), createClient()])
  const thisYear = Number(today.slice(0, 4))
  const year = today.slice(5) <= "01-15" ? thisYear - 1 : thisYear
  const start = `${year}-01-01` as ISODate
  const end = `${year}-12-31` as ISODate

  const [{ data: habits }, logs, { repairs, pauses }, { data: profile }] = await Promise.all([
    supabase.from("habits").select("id, name, color, target_per_week").eq("user_id", user.id).order("position"),
    fetchAllRows<{ habit_id: string; log_date: string; created_at: string }>((from, to) =>
      supabase
        .from("habit_logs")
        .select("habit_id, log_date, created_at")
        .eq("user_id", user.id)
        .gte("log_date", start)
        .lte("log_date", end)
        .order("log_date")
        .range(from, to)
    ),
    bridgesData(supabase, user.id, start),
    supabase.from("profiles").select("username, is_public").eq("id", user.id).single(),
  ])

  // local hour of each check-in (early bird / night owl)
  const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" })
  const hours = logs.map((l) => Number(hourFmt.format(new Date(l.created_at))))
  const byHabit = new Map<string, ISODate[]>()
  for (const l of logs) byHabit.set(l.habit_id, [...(byHabit.get(l.habit_id) ?? []), l.log_date as ISODate])

  return {
    year,
    today,
    username: profile?.username ?? null,
    isPublic: Boolean(profile?.is_public),
    hours,
    habits: (habits ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      target: h.target_per_week,
      done: byHabit.get(h.id) ?? [],
      bridges: [...bridgesFor(h.id, repairs, pauses)],
    })),
  }
}

async function fetchAllRows<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}
