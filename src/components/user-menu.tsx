"use client"

import { ArchiveIcon, ExternalLinkIcon, LayoutDashboardIcon, LogOutIcon, SettingsIcon, TrophyIcon, UsersIcon } from "lucide-react"

import { signOut } from "@/app/actions/auth"
import { Link } from "@/components/link"
import { clearOfflinePages } from "@/components/sw-register"
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
          <Button variant="ghost" size="icon" className="rounded-full" aria-label={t.nav.accountMenu} />
        }
      >
        <Avatar className="size-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
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
        <DropdownMenuItem render={<Link href="/dashboard" />}>
          <LayoutDashboardIcon /> {t.nav.dashboard}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/friends" />}>
          <UsersIcon /> {t.nav.friends}
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/leaderboard" />}>
          <TrophyIcon /> {t.nav.leaderboard}
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
        <DropdownMenuItem onClick={async () => { await clearOfflinePages(); await signOut() }}>
          <LogOutIcon /> {t.nav.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
