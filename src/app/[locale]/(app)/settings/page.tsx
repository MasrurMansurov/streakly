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
    <div className="mx-auto grid max-w-3xl gap-6">
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
  const sections = [
    { id: "profile", label: t.settings.sections.profile },
    { id: "look", label: t.settings.sections.look },
    { id: "notifications", label: t.settings.sections.notifications },
    { id: "day", label: t.settings.sections.day },
    { id: "data", label: t.settings.sections.data },
  ]
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
      {/* section index: a sticky list on wide screens, a scrollable row on phones */}
      <nav aria-label={t.settings.title} className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm lg:mx-0 lg:grid lg:px-0">
          {sections.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                className="block rounded-md px-3 py-1.5 whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid min-w-0 gap-10">
        <section id="profile" className="grid scroll-mt-24 gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t.settings.sections.profile}</h2>
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
          <ProfileForm profile={profile} />
        </section>

        <section id="look" className="grid scroll-mt-24 gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t.settings.sections.look}</h2>
          <AppearanceCard
            userId={look.userId}
            profile={profile}
            earned={look.earned}
            habits={look.habits.map((h) => ({ ...h, streak: t.habit.streak(h.streak.current, h.streak.unit) }))}
          />
        </section>

        <section id="notifications" className="grid scroll-mt-24 gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t.settings.sections.notifications}</h2>
          <RemindersCard initial={reminders} />
        </section>

        <section id="day" className="grid scroll-mt-24 gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t.settings.sections.day}</h2>
          <DayStartCard dayStart={day.dayStart} today={day.today} timeZone={day.timeZone} />
          <VacationCard today={vacation.today} pause={"id" in vacation ? vacation : null} />
        </section>

        <section id="data" className="grid scroll-mt-24 gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">{t.settings.sections.data}</h2>
          <AccountCard username={profile.username} />
        </section>
      </div>
    </div>
  )
}
