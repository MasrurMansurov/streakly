"use client"

import { ArchiveIcon, ExternalLinkIcon, LayoutDashboardIcon, LogOutIcon, SettingsIcon } from "lucide-react"
import Link from "next/link"

import { signOut } from "@/app/actions/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
}

export function UserMenu({ email, username, displayName, isPublic }: Props) {
  const name = displayName || username
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu" />
        }
      >
        <Avatar className="size-8">
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
          <LayoutDashboardIcon /> Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/archive" />}>
          <ArchiveIcon /> Archive
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <SettingsIcon /> Settings
        </DropdownMenuItem>
        {isPublic && (
          <DropdownMenuItem render={<Link href={`/u/${username}`} />}>
            <ExternalLinkIcon /> Public profile
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
