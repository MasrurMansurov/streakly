/** Invite links (growth plan 1.2): /{locale}/i/{code}. */
export const INVITE_COOKIE = "st_invite"
export const INVITE_CODE_RE = /^[a-z0-9]{8}$/

export const isInviteCode = (v: unknown): v is string => typeof v === "string" && INVITE_CODE_RE.test(v)

/** 8 random chars from a–z0–9 (≈ 2.8·10¹² codes). */
export function newInviteCode(): string {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789"
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => abc[b % abc.length]).join("")
}
