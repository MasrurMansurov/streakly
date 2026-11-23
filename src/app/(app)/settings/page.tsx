import type { Metadata } from "next"
import { Suspense } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getMyProfile, getReminderSettings } from "@/lib/data"

import { AvatarUploader } from "./avatar-uploader"
import { ProfileForm } from "./profile-form"
import { RemindersCard } from "./reminders-card"

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
  const [profile, reminders] = await Promise.all([getMyProfile(), getReminderSettings()])
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Photo</CardTitle>
          <CardDescription>Shown in the header and on your public page.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader
            userId={profile.id}
            avatarUrl={profile.avatar_url}
            name={profile.display_name || profile.username}
          />
        </CardContent>
      </Card>
      <RemindersCard initial={reminders} />
      <ProfileForm profile={profile} />
    </div>
  )
}
