import type { Metadata } from "next"

import { Suspense } from "react"

import { getT } from "@/i18n/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getActivePause, getAppearanceData, getMyProfile, getReminderSettings, getToday } from "@/lib/data"

import { AccountCard } from "./account-card"
import { AppearanceCard } from "./appearance-card"
import { AvatarUploader } from "./avatar-uploader"
import { DayStartCard } from "./day-start-card"
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
  const [profile, reminders, vacation, look, { t }, day] = await Promise.all([
    getMyProfile(),
    getReminderSettings(),
    getActivePause(),
    getAppearanceData(),
    getT(),
    getToday(),
  ])
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
      <AppearanceCard
        userId={look.userId}
        profile={profile}
        earned={look.earned}
        habits={look.habits.map((h) => ({ ...h, streak: t.habit.streak(h.streak.current, h.streak.unit) }))}
      />
      <RemindersCard initial={reminders} />
      <DayStartCard dayStart={day.dayStart} today={day.today} timeZone={day.timeZone} />
      <VacationCard today={vacation.today} pause={"id" in vacation ? vacation : null} />
      <ProfileForm profile={profile} />
      <AccountCard username={profile.username} />
    </div>
  )
}
