import { Suspense, type ReactNode } from "react"

import { DayStartFromServer } from "@/components/day-start-server"
import { PushSync } from "@/components/push-sync"
import { SiteHeader } from "@/components/site-header"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <PushSync />
      <Suspense fallback={null}>
        <DayStartFromServer />
      </Suspense>
    </>
  )
}
