import type { Metadata } from "next"

import { Suspense } from "react"

import { getT } from "@/i18n/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getActivePause, getMyProfile, getReminderSettings } from "@/lib/data"

import { AccountCard } from "./account-card"
import { AvatarUploader } from "./avatar-uploader"
import { ProfileForm } from "./profile-form"
import { RemindersCard } from "./reminders-card"
import { VacationCard } from "./vacation-card"

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
  const [profile, reminders, vacation, { t }] = await Promise.all([getMyProfile(), getReminderSettings(), getActivePause(), getT()])
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
      <VacationCard today={vacation.today} pause={"id" in vacation ? vacation : null} />
      <ProfileForm profile={profile} />
      <AccountCard username={profile.username} />
    </div>
  )
}
