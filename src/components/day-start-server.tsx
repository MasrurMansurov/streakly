import { getToday } from "@/lib/data"

import { DayStartSync } from "./day-start-sync"

/** Server half of DayStartSync: reads the setting from the signed-in user's token. */
export async function DayStartFromServer() {
  const { dayStart } = await getToday()
  return <DayStartSync value={dayStart} />
}
