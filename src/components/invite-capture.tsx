"use client"

import { useEffect } from "react"

import { INVITE_COOKIE } from "@/lib/invite"

/** The invite page: keep the code through sign-up (30 days), so it's applied after the first sign-in. */
export function InviteCapture({ code }: { code: string }) {
  useEffect(() => {
    document.cookie = `${INVITE_COOKIE}=${code}; path=/; max-age=${30 * 86400}; samesite=lax`
  }, [code])
  return null
}
