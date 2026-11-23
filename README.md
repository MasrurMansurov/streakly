# 🔥 Streakly

A daily habit tracker with streaks, a GitHub-style activity heatmap and shareable public profiles.

**🌐 Live:** https://streakly-pied-six.vercel.app

**Demo account:** `demo@streakly.dev` / `streakly-demo` · public profile: [/u/demo](https://streakly-pied-six.vercel.app/u/demo)

## Features

- **One-tap check-ins** with optimistic UI (`useOptimistic`), plus a 7-day strip to fix missed days
- **Streaks:** current and best streak per habit, 30-day completion rate
- **Activity heatmap** (26 weeks) and a 30-day bar chart (Recharts)
- **Public profile** at `/u/<username>`, opt-in; archived habits stay private
- **Auth:** email + password via Supabase Auth with cookie sessions (`@supabase/ssr`)
- **Timezone-aware:** "today" is computed in the user's own timezone, not the server's
- Dark mode, responsive layout, accessible controls

## Tech stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, Cache Components, Partial Prefetching) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4, shadcn/ui (Base UI), lucide-react, sonner, next-themes |
| Forms | react-hook-form + zod (same schemas validate on client and server) |
| Backend | Supabase: Postgres, Auth, Row Level Security |
| Charts | Recharts + a hand-made heatmap |
| Tests | Vitest |
| Hosting | Vercel (auto-deploy from `main`) |

## Architecture

```
src/
├── proxy.ts                  # refreshes the Supabase session, guards /dashboard and /settings
├── app/
│   ├── page.tsx              # landing (static)
│   ├── login/                # sign in / sign up
│   ├── auth/callback/        # email confirmation → session
│   ├── (app)/dashboard/      # habits, stats, heatmap, chart
│   ├── (app)/settings/       # profile and public toggle
│   ├── u/[username]/         # public profile (server-cached, tag-invalidated)
│   └── actions/              # server actions; each one re-checks the session
└── lib/
    ├── data.ts               # data access layer (server-only)
    ├── streaks.ts, dates.ts  # pure logic, unit-tested
    ├── validation.ts         # zod schemas
    └── supabase/             # server, proxy and public clients + generated types
supabase/migrations/          # schema, RLS policies, triggers
```

### Database

```
auth.users ─1:1─ profiles (username, display_name, bio, is_public)
                    └─1:n─ habits (name, color, position, archived_at)
                              └─1:n─ habit_logs (log_date)  unique(habit_id, log_date)
```

**Security is enforced in Postgres, not in the UI:**
- RLS on every table. Owners have full access. Anyone can *read* rows of profiles with `is_public = true`.
- A trigger checks that a log belongs to a habit of the same user.
- A profile row is created automatically on sign-up (a `security definer` trigger, not callable through the API).

**Caching:** public profiles are fetched with a cookie-less anon client inside `"use cache"` and invalidated with `updateTag("profile:<username>")` when the owner changes data. Authenticated pages are rendered at request time behind `<Suspense>`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm run dev
```

Apply the migrations from `supabase/migrations` to your Supabase project (SQL editor or `supabase db push`).

```bash
npm test          # unit tests
npm run typecheck
npm run lint
npm run build
```

## Roadmap

- [ ] Google / GitHub OAuth
- [ ] Drag-and-drop habit ordering (dnd-kit)
- [ ] Weekly targets ("3× per week")
- [ ] Reminders (Edge Function + cron)
- [ ] OG image for public profiles
- [ ] Playwright e2e tests
