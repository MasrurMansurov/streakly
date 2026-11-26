"use client"

import { CheckIcon, ImageIcon, PaletteIcon } from "lucide-react"
import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { updateAppearance, updateBanner } from "@/app/actions/profile"
import { AchievementBadge } from "@/components/achievement-badge"
import { IconTile } from "@/components/icon-tile"
import { ProfileHeader } from "@/components/profile-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/i18n/client"
import type { AchievementId } from "@/lib/achievements"
import { habitColor } from "@/lib/habit-colors"
import { ACCENTS, asAccent, asBanner, asFrame, BANNERS, bannerBackground, PICKABLE_FRAMES, type AccentKey, type BannerKey, type FrameKey } from "@/lib/profile-style"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Props = {
  userId: string
  profile: {
    username: string
    display_name: string | null
    avatar_url: string | null
    bio: string | null
    status: string | null
    pronouns: string | null
    banner: string
    banner_url: string | null
    accent: string
    avatar_frame: string
    links: string[]
    showcase: string[]
    featured_habit_id: string | null
  }
  earned: AchievementId[]
  habits: { id: string; name: string; color: string; streak: string }[]
}

/** Downscale a banner to ≤1500px wide JPEG before upload. */
async function compressBanner(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1500 / bitmap.width)
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85))
}

export function AppearanceCard({ userId, profile, earned, habits }: Props) {
  const { t } = useI18n()
  const a = t.appearance
  const [banner, setBanner] = useState<BannerKey>(asBanner(profile.banner))
  const [bannerUrl, setBannerUrl] = useState<string | null>(profile.banner_url)
  const [accent, setAccent] = useState<AccentKey>(asAccent(profile.accent))
  const [frame, setFrame] = useState<FrameKey>(asFrame(profile.avatar_frame))
  const [status, setStatus] = useState(profile.status ?? "")
  const [pronouns, setPronouns] = useState(profile.pronouns ?? "")
  const [links, setLinks] = useState<string[]>([...profile.links, "", "", ""].slice(0, 3))
  const [showcase, setShowcase] = useState<string[]>(profile.showcase.filter((id) => (earned as string[]).includes(id)))
  const [featured, setFeatured] = useState<string | null>(profile.featured_habit_id)
  const [pending, start] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const featuredHabit = habits.find((h) => h.id === featured)
  const look = {
    name: profile.display_name || profile.username,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    bio: profile.bio,
    status: status.trim() || null,
    pronouns: pronouns.trim() || null,
    banner,
    bannerUrl,
    accent,
    avatarFrame: frame,
    links: links.map((l) => l.trim()).filter(Boolean).map((l) => (/^https?:\/\//.test(l) ? l : `https://${l}`)),
    showcase: showcase.map((id) => ({ id: id as AchievementId, name: t.achievements.items[id as AchievementId].name })),
    featured: featuredHabit ? { name: featuredHabit.name, color: featuredHabit.color, streak: featuredHabit.streak } : null,
  }

  const toggleBadge = (id: string) =>
    setShowcase((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s))

  const uploadBanner = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const blob = await compressBanner(file)
      const path = `${userId}/banner-${Date.now()}.jpg`
      const supabase = createClient()
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" })
      if (error) throw error
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl
      const res = await updateBanner(url)
      if (!res.ok) throw new Error(res.error)
      setBannerUrl(url)
    } catch {
      toast.error(t.common.somethingWrong)
    } finally {
      setUploading(false)
    }
  }

  const save = () =>
    start(async () => {
      const res = await updateAppearance({
        banner,
        accent,
        avatarFrame: frame,
        status,
        pronouns,
        links,
        showcase,
        featuredHabitId: featured,
      })
      if (!res.ok) toast.error(res.error)
      else toast.success(res.message)
    })

  return (
    <Card id="appearance" className="scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconTile icon={PaletteIcon} tone="violet" size="sm" /> {a.title}
        </CardTitle>
        <CardDescription>{a.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <span className="text-sm text-muted-foreground">{a.preview}</span>
          <ProfileHeader look={look} labels={{ featured: a.featured, links: a.linksLabel }} compact />
        </div>

        {/* banner */}
        <div className="grid gap-2">
          <Label id="banner-label">{a.banner}</Label>
          <div role="radiogroup" aria-labelledby="banner-label" className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {(Object.keys(BANNERS) as BannerKey[]).map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={!bannerUrl && banner === key}
                aria-label={key}
                onClick={() => {
                  setBanner(key)
                  if (bannerUrl) {
                    setBannerUrl(null)
                    void updateBanner(null)
                  }
                }}
                className={cn(
                  "relative h-10 rounded-lg ring-offset-2 ring-offset-background transition",
                  !bannerUrl && banner === key ? "ring-2 ring-foreground" : "hover:opacity-80"
                )}
                style={{ background: bannerBackground(key) }}
              >
                {!bannerUrl && banner === key && <CheckIcon className="absolute inset-0 m-auto size-4 text-white drop-shadow" />}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-label={a.uploadBanner}
              onChange={(e) => uploadBanner(e.target.files?.[0])}
            />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
              <ImageIcon /> {a.uploadBanner}
            </Button>
            {bannerUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setBannerUrl(null)
                  void updateBanner(null)
                }}
              >
                {a.removeBanner}
              </Button>
            )}
            <span className="text-xs text-muted-foreground">{a.bannerHint}</span>
          </div>
        </div>

        {/* accent + frame */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label id="accent-label">{a.accent}</Label>
            <div role="radiogroup" aria-labelledby="accent-label" className="flex flex-wrap gap-2">
              {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={accent === key}
                  aria-label={key}
                  onClick={() => setAccent(key)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition",
                    accent === key && "ring-2 ring-foreground"
                  )}
                  style={{ background: ACCENTS[key] }}
                >
                  {accent === key && <CheckIcon className="size-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label id="frame-label">{a.frame}</Label>
            <div role="radiogroup" aria-labelledby="frame-label" className="flex flex-wrap gap-2">
              {PICKABLE_FRAMES.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={frame === f}
                  onClick={() => setFrame(f)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition",
                    frame === f ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {a.frames[f]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* status + pronouns */}
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div className="grid gap-2">
            <Label htmlFor="profile-status">{a.status}</Label>
            <Input id="profile-status" value={status} maxLength={60} placeholder={a.statusPlaceholder} onChange={(e) => setStatus(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-pronouns">{a.pronouns}</Label>
            <Input id="profile-pronouns" value={pronouns} maxLength={20} placeholder={a.pronounsPlaceholder} onChange={(e) => setPronouns(e.target.value)} />
          </div>
        </div>

        {/* showcase */}
        <div className="grid gap-2">
          <Label>{a.showcase}</Label>
          {earned.length === 0 ? (
            <p className="text-sm text-muted-foreground">{a.noBadges}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {earned.map((id) => {
                  const on = showcase.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={t.achievements.items[id].name}
                      onClick={() => toggleBadge(id)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition",
                        on ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <AchievementBadge id={id} size={26} />
                      {t.achievements.items[id].name}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">{a.showcaseHint}</p>
            </>
          )}
        </div>

        {/* featured habit */}
        <div className="grid gap-2">
          <Label id="featured-label">{a.featured}</Label>
          <div role="radiogroup" aria-labelledby="featured-label" className="flex flex-wrap gap-2">
            {[{ id: null, name: a.noFeatured, color: "slate" }, ...habits].map((h) => (
              <button
                key={h.id ?? "none"}
                type="button"
                role="radio"
                aria-checked={featured === h.id}
                onClick={() => setFeatured(h.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                  featured === h.id ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {h.id && <span className={cn("size-2 rounded-full", habitColor(h.color).dot)} />}
                {h.name}
              </button>
            ))}
          </div>
        </div>

        {/* links */}
        <div className="grid gap-2">
          <Label>{a.links}</Label>
          {links.map((value, i) => (
            <Input
              key={i}
              aria-label={`${a.links} ${i + 1}`}
              value={value}
              inputMode="url"
              placeholder={a.linkPlaceholder}
              onChange={(e) => setLinks((ls) => ls.map((l, j) => (j === i ? e.target.value : l)))}
            />
          ))}
        </div>

        <Button className="w-fit" onClick={save} disabled={pending}>
          {a.save}
        </Button>
      </CardContent>
    </Card>
  )
}
