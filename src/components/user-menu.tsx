"use client"

import { ArchiveIcon, CircleUserRoundIcon, ExternalLinkIcon, LogOutIcon, SettingsIcon } from "lucide-react"

import { Link } from "@/components/link"
import { signOutEverywhere } from "@/components/sign-out-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useI18n } from "@/i18n/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { initials } from "@/lib/initials"

type Props = {
  email: string | null
  username: string
  displayName: string | null
  isPublic: boolean
  avatarUrl: string | null
}

export function UserMenu({ email, username, displayName, isPublic, avatarUrl }: Props) {
  const { t } = useI18n()
  const name = displayName || username
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" />
        }
      >
        {/* named by its content: "Account menu" + the visible initials (WCAG 2.5.3) */}
        <span className="sr-only">{t.nav.accountMenu} </span>
        <Avatar className="size-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="truncate font-medium text-foreground">{name}</div>
            {email && <div className="truncate text-xs font-normal">{email}</div>}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {/* only the personal, occasional things — the sections themselves live in the header */}
        <DropdownMenuItem render={<Link href="/me" />}>
          <CircleUserRoundIcon /> {t.nav.me}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/archive" />}>
          <ArchiveIcon /> {t.nav.archive}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <SettingsIcon /> {t.nav.settings}
        </DropdownMenuItem>
        {isPublic && (
          <DropdownMenuItem render={<Link href={`/u/${username}`} />}>
            <ExternalLinkIcon /> {t.nav.publicProfile}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOutEverywhere}>
          <LogOutIcon /> {t.nav.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
