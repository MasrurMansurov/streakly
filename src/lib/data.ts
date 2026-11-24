import "server-only"

import { cacheLife, cacheTag } from "next/cache"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { redirect } from "next/navigation"

import type { Pact } from "./pacts"
import { addDays, DEFAULT_TIMEZONE, isValidTimezone, TIMEZONE_COOKIE, todayIn, type ISODate } from "./dates"
import { createClient, createPublicClient } from "./supabase/server"
import type { AchievementStats } from "./achievements"
import type { Tables } from "./supabase/database.types"

export type Profile = Tables<"profiles">
export type Habit = Pick<Tables<"habits">, "id" | "name" | "description" | "color" | "position" | "target_per_week" | "created_at">
export type HabitLog = Pick<Tables<"habit_logs">, "habit_id" | "log_date">

/** How far back the dashboard and public profile look. */
export const HISTORY_DAYS = 26 * 7

const PAGE = 1000 // PostgREST default max rows per request

/** All-time totals for achievements (computed in Postgres, RLS applies). */
async function achievementStats(
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createPublicClient>,
  userId: string
): Promise<AchievementStats> {
  const { data } = await supabase.rpc("achievement_stats", { p_user: userId })
  return { totalCheckins: Number(data?.[0]?.total_checkins ?? 0), bestStreak: Number(data?.[0]?.best_streak ?? 0) }
}

/** The viewer's "today", based on the timezone cookie set by <TimezoneSync />. */
export async function getToday(): Promise<{ today: ISODate; timeZone: string }> {
  await connection() // "today" depends on the current time → request-time only
  const tz = (await cookies()).get(TIMEZONE_COOKIE)?.value
  const timeZone = isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE
  return { today: todayIn(timeZone), timeZone }
}

/** Signed-in user (JWT verified) or null. */
export async function getCurrentUser() {
  await connection() // JWT expiry check uses the current time → request-time only
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null }
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

export async function getDashboardData() {
  const user = await requireUser()
  const [{ today, timeZone }, supabase] = await Promise.all([getToday(), createClient()])
  const since = addDays(today, -(HISTORY_DAYS - 1))

  const [habitsRes, logs, profileRes, archivedCount, notesRes, stats] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, description, color, position, target_per_week, created_at")
      .eq("user_id", user.id) // RLS also exposes other users' *public* habits
      .is("archived_at", null)
      .order("position")
      .order("created_at"),
    fetchAllLogs((from, to) =>
      supabase
        .from("habit_logs")
        .select("habit_id, log_date")
        .eq("user_id", user.id)
        .gte("log_date", since)
        .order("log_date")
        .range(from, to)
    ),
    supabase.from("profiles").select("username, display_name, is_public").eq("id", user.id).single(),
    getArchivedCount(user.id),
    supabase.from("habit_notes").select("habit_id, note").eq("user_id", user.id).eq("log_date", today),
    achievementStats(supabase, user.id),
  ])
  if (habitsRes.error) throw habitsRes.error

  return {
    user,
    profile: profileRes.data,
    habits: habitsRes.data,
    logs,
    today,
    timeZone,
    archivedCount,
    stats,
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
    .select("id, username, display_name, bio, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle()
  if (!profile) return null

  // a little extra history so any viewer timezone is covered
  const since = addDays(new Date().toISOString().slice(0, 10), -(HISTORY_DAYS + 1))
  const [habitsRes, logs] = await Promise.all([
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
  ])

  return { profile, habits: habitsRes.data ?? [], logs, stats: await achievementStats(supabase, profile.id) }
}

export type ArchivedHabit = Habit & { archived_at: string; checkIns: number }

/** The user's archived habits, newest first, with their total check-ins. */
export async function getArchivedHabits(): Promise<ArchivedHabit[]> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("habits")
    .select("id, name, description, color, position, target_per_week, created_at, archived_at, habit_logs(count)")
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
async function getArchivedCount(userId: string): Promise<number> {
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
  const { data: habit } = await supabase
    .from("habits")
    .select("id, name, description, color, position, target_per_week, created_at, archived_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!habit) return null

  const since = addDays(today, -370)
  const logs = await fetchAllLogs((from, to) =>
    supabase
      .from("habit_logs")
      .select("habit_id, log_date")
      .eq("habit_id", id)
      .eq("user_id", user.id)
      .gte("log_date", since)
      .order("log_date")
      .range(from, to)
  )
  const { data: notes } = await supabase
    .from("habit_notes")
    .select("log_date, note")
    .eq("habit_id", id)
    .eq("user_id", user.id)
  return { habit, logs, today, notes: Object.fromEntries((notes ?? []).map((n) => [n.log_date, n.note])) }
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
  person: { username: string; name: string; avatarUrl: string | null }
}

/** People the user follows (only those still public) and their check-ins from the last 7 days. */
export async function getFriendsData() {
  const user = await requireUser()
  const [{ today, timeZone }, supabase] = await Promise.all([getToday(), createClient()])

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", user.id)
    .order("created_at", { ascending: false })
  const ids = (follows ?? []).map((f) => f.following_id)
  if (ids.length === 0) return { people: [], feed: [] as FeedItem[], today, timeZone }

  // RLS hides profiles that went private, so they simply drop out
  const [{ data: profiles }, { data: logs }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ids),
    supabase
      .from("habit_logs")
      .select("log_date, created_at, user_id, habits(name, color)")
      .in("user_id", ids)
      .gte("log_date", addDays(today, -6))
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
  const people = ids.flatMap((id) => {
    const p = byId.get(id)
    return p ? [{ id: p.id, username: p.username, name: p.display_name || p.username, avatarUrl: p.avatar_url }] : []
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
        person: { username: p.username, name: p.display_name || p.username, avatarUrl: p.avatar_url },
      },
    ]
  })
  return { people, feed, today, timeZone }
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
  await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("my_pacts")
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({
    id: r.id,
    status: r.status === "active" ? "active" : "pending",
    iInvited: r.i_invited,
    partner: { username: r.partner_username, name: r.partner_name, avatarUrl: r.partner_avatar },
    myHabit: r.my_habit_id && r.my_habit_name ? { id: r.my_habit_id, name: r.my_habit_name } : null,
    partnerHabit: r.partner_habit_name ? { name: r.partner_habit_name, color: r.partner_habit_color ?? "emerald" } : null,
    partnerDates: (r.partner_dates ?? []) as ISODate[],
  }))
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
