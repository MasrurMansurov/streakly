import { z } from "zod"

import { HABIT_COLOR_NAMES } from "./habit-colors"

// Messages are keys into `t.validation` (see src/i18n): the same schema runs in
// the browser and on the server, and the text is picked in the user's language.

export const authSchema = z.object({
  email: z.email("emailInvalid"),
  password: z.string().min(8, "passwordMin").max(72),
})
export type AuthInput = z.infer<typeof authSchema>

export const habitSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(60, "nameMax"),
  description: z.string().trim().max(200, "descriptionMax").optional().or(z.literal("")),
  color: z.enum(HABIT_COLOR_NAMES),
  /** 7 = every day, 1–6 = times per week */
  target_per_week: z.number().int().min(1).max(7),
})
export type HabitInput = z.infer<typeof habitSchema>

export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/, "usernameFormat"),
  display_name: z.string().trim().max(50, "displayNameMax").optional().or(z.literal("")),
  bio: z.string().trim().max(160, "bioMax").optional().or(z.literal("")),
  is_public: z.boolean(),
})
export type ProfileInput = z.infer<typeof profileSchema>

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }
