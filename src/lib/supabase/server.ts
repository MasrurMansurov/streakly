import "server-only"

import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

import type { Database } from "./database.types"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/**
 * Supabase client bound to the current request's auth cookies.
 * Reads cookies → request-time only; render it behind <Suspense>.
 * Create a new one per request, never share it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The session is refreshed in src/proxy.ts instead.
        }
      },
    },
  })
}

/**
 * Cookie-less client with the anon role. Sees only public rows (RLS),
 * so it is safe to use inside `"use cache"` functions.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
