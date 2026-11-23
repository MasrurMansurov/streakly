import { z } from "zod"

import { HABIT_COLOR_NAMES } from "./habit-colors"

export const authSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(72),
})
export type AuthInput = z.infer<typeof authSchema>

export const habitSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Max 60 characters"),
  description: z.string().trim().max(200, "Max 200 characters").optional().or(z.literal("")),
  color: z.enum(HABIT_COLOR_NAMES),
})
export type HabitInput = z.infer<typeof habitSchema>

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: a–z, 0–9 and _"),
  display_name: z.string().trim().max(50, "Max 50 characters").optional().or(z.literal("")),
  bio: z.string().trim().max(160, "Max 160 characters").optional().or(z.literal("")),
  is_public: z.boolean(),
})
export type ProfileInput = z.infer<typeof profileSchema>

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }
