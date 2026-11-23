import type { Metadata } from "next"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { getMyProfile } from "@/lib/data"

import { ProfileForm } from "./profile-form"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your profile and how others can see it.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Settings />
      </Suspense>
    </div>
  )
}

async function Settings() {
  const profile = await getMyProfile()
  return <ProfileForm profile={profile} />
}
