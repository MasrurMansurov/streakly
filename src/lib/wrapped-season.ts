import type { ISODate } from "@/lib/dates"

/** Dec 1 – Jan 15: the year's recap is offered (Today banner, the Profile list). */
export function isWrappedSeason(today: ISODate) {
  const md = today.slice(5)
  return md >= "12-01" || md <= "01-15"
}
