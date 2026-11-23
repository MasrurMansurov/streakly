import type { Metadata } from "next"

import { Suspense } from "react"

import { getT } from "@/i18n/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getMyProfile, getReminderSettings } from "@/lib/data"

import { AvatarUploader } from "./avatar-uploader"
import { ProfileForm } from "./profile-form"
import { RemindersCard } from "./reminders-card"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT()).t.meta.settings }
}

export default async function SettingsPage() {
  const { t } = await getT()
  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.settings.title}</h1>
        <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        <Settings />
      </Suspense>
    </div>
  )
}

async function Settings() {
  const [profile, reminders, { t }] = await Promise.all([getMyProfile(), getReminderSettings(), getT()])
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.photo}</CardTitle>
          <CardDescription>{t.settings.photoSub}</CardDescription>
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
