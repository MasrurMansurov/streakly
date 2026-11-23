"use client"

import { UserCheckIcon, UserPlusIcon } from "lucide-react"
import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { setFollowing } from "@/app/actions/follows"
import { Link } from "@/components/link"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n/client"

type Props = { profileId: string; name: string; following: boolean; signedIn: boolean; size?: "sm" | "default" }

export function FollowButton({ profileId, name, following, signedIn, size = "sm" }: Props) {
  const { t } = useI18n()
  const [optimistic, setOptimistic] = useOptimistic(following)
  const [pending, startTransition] = useTransition()

  if (!signedIn) {
    return (
      <Button variant="outline" size={size} render={<Link href="/login" />}>
        <UserPlusIcon /> {t.friends.signInToFollow}
      </Button>
    )
  }

  const toggle = () =>
    startTransition(async () => {
      const next = !optimistic
      setOptimistic(next)
      const res = await setFollowing(profileId, next)
      if (!res.ok) toast.error(res.error)
      else toast.success(next ? t.friends.followed(name) : t.friends.unfollowed(name))
    })

  return (
    <Button
      variant={optimistic ? "outline" : "default"}
      size={size}
      disabled={pending}
      aria-pressed={optimistic}
      onClick={toggle}
    >
      {optimistic ? <UserCheckIcon /> : <UserPlusIcon />}
      {optimistic ? t.friends.following : t.friends.follow}
    </Button>
  )
}
