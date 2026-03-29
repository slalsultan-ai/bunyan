---
name: Stickiness Update
description: Auth system (OTP email), multi-child support, weekly email (8 weeks × 3 age groups), registration prompts
type: project
---

Implemented in March 2026. All features built on top of existing guest mode (which still works unchanged).

**Auth system:**
- Custom OTP-via-email (no NextAuth). Pattern: send-otp → verify-otp → session cookie (`parent_token`, 30 days, httpOnly)
- Tables: `parents`, `children`, `otp_codes`, `parent_sessions`
- `src/lib/parent-auth.ts` — session helpers
- `src/lib/email/otp.ts` — OTP email via Resend

**Multi-child:**
- `children` table linked to `parents` with cascade delete
- `/api/children` CRUD, max 10 children per parent
- Dashboard at `/dashboard` (client component, fetches `/api/auth/me`)

**Weekly email:**
- 24 content groups (8 weeks × 3 age groups: 4-5, 6-9, 10-12)
- Seed: `src/lib/db/seed-weekly-content.ts`
- Builder: `src/lib/email/weekly.ts`
- Cron: `POST /api/cron/weekly-email` — protected by `CRON_SECRET`
- Schedule: every Sunday 5:00 UTC (= 8am Riyadh)
- Unsubscribe: `GET /api/unsubscribe?token=<unsubscribeToken>` — no login needed
- `vercel.json` updated with cron config

**Registration prompts (inline, no modals):**
- `RegisterPrompt` component in results page and progress page
- Weekly email section added to landing page (before FooterCTA)
- "سجّل" button added to landing navbar

**New env vars needed in production:**
- `CRON_SECRET` — protect cron endpoint
- `NEXT_PUBLIC_APP_URL` — for unsubscribe links (e.g. https://bunyan.guru)

**Why:** Convert anonymous visitors to registered weekly-email users without forcing registration.
**How to apply:** When adding features to dashboard/auth flows, check parent-auth.ts and the children API pattern.
