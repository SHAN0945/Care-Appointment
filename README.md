# CareFlow — Healthcare Appointment & Follow-up Manager

A clinic appointment platform with separate patient, doctor, and admin portals: symptom intake with AI pre-visit summaries, post-visit AI patient summaries, medication reminders, email notifications, and Google Calendar sync.

**Live app:** https://care-appointment-ecru.vercel.app/ 

**System design write-up:** [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) — double-booking prevention, slot hold mechanism, doctor leave conflict handling, notification failure handling.
**Build log / phase-by-phase status:** [PROGRESS.md](PROGRESS.md)

## Demo credentials

Same password across one pre-seeded account per role, so evaluating all three portals doesn't need separate passwords. These are three separate accounts, not one account with three roles — every account has exactly one role by design (see [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md)).

| Portal | URL | Email | Password |
|---|---|---|---|
| Patient | `/login/patient` | qwerty@gm.com | QWERTY11 |
| Doctor | `/login/doctor` | priya.sharma@clinic.test | QWERTY11 |
| Admin | `/login/admin` | admin@clinic.test | QWERTY11 |

## App structure

- **`/`** — public marketing landing page (hero, how-it-works, specialties and doctor listings pulled live from the database, features, footer)
- **`/login`** — portal chooser; **`/login/patient`**, **`/login/doctor`**, **`/login/admin`** — separately themed sign-in pages. A successful sign-in is rejected with a clear message if the account's actual role doesn't match the chosen portal.
- **`/register`** — patient self-registration
- **`/patient`**, **`/patient/book`** (4-step wizard: doctor → date & time → symptoms → confirmed), **`/patient/appointments`**, **`/patient/profile`**, **`/patient/settings`**
- **`/doctor`**, **`/doctor/settings`**
- **`/admin`**, **`/admin/settings`**

Every page supports light and dark mode — toggle in the header, or a full Light/Dark picker on each role's Settings page.

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **Database:** PostgreSQL (Neon), via Prisma ORM
- **Auth:** NextAuth.js (Auth.js) v5, credentials provider, role-based (patient / doctor / admin)
- **LLM:** Anthropic Claude API or Google Gemini API — pre-visit/post-visit summaries and the standalone symptom checker (degrades gracefully if neither is set, see below)
- **Email:** Resend
- **Calendar:** Google Calendar API (OAuth 2.0)
- **Background jobs:** Vercel Cron, hitting 4 dedicated API routes
- **UI:** Tailwind CSS, self-built components (no UI kit)
- **Deploy:** Vercel

## Setup guide

```bash
git clone <repo-url>
cd healthcare-appointment-manager
npm install
cp .env.example .env    # fill in at least DATABASE_URL/DIRECT_URL to run migrations
npx prisma migrate deploy
npx prisma db seed             # bootstraps the admin account from ADMIN_EMAIL/ADMIN_PASSWORD
npx tsx prisma/seed-doctors.ts # optional: 3 demo doctors so booking has real data to try
npm run dev
```

Open http://localhost:3000. Sign in as the seeded admin, or register a new patient account at `/register`.

### Running the background jobs locally

The four cron routes (`/api/cron/sweep-holds`, `/api/cron/process-notifications`, `/api/cron/appointment-reminders`, `/api/cron/medication-reminders`) are plain `GET` routes protected by `CRON_SECRET` — call them directly to test without waiting for a schedule:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/process-notifications
```

## Environment variables

Full list with explanations in [.env.example](.env.example). Summary:

| Variable | Required for | Behavior if unset |
|---|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Everything (Neon Postgres) | App won't start |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Auth sessions | App won't start |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `prisma db seed` only | Seed uses a dev-only default |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Using a real LLM for pre/post-visit summaries and the symptom checker (Anthropic takes priority if both are set) | Falls back to the local rule-based/knowledge-base engines (see below) — booking/visit flows, the symptom checker, and medication reminders all still work, just tagged `aiSource: "LOCAL"` instead of `"LLM"` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Sending real emails | Notification rows are queued and marked `FAILED` with the exact reason; nothing crashes |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Calendar sync | "Connect Google Calendar" hides itself (`isGoogleConfigured()`); calendar notification rows no-op |
| `CRON_SECRET` | Protecting the 4 cron routes | Routes stay callable but log a warning — set this before deploying |

## Google Calendar setup

1. Google Cloud Console → new (or existing) project → **APIs & Services → Library** → enable **Google Calendar API**.
2. **APIs & Services → Credentials → Create Credentials → OAuth client ID** (type: Web application).
3. Under **Authorized redirect URIs**, add exactly `<NEXTAUTH_URL>/api/google/callback` — one entry per environment you run (e.g. both `http://localhost:3000/api/google/callback` and `https://<your-vercel-url>/api/google/callback`).
4. If the OAuth consent screen is in **Testing** mode, add every Google account you'll test with under **Audience → Test users**, or Google blocks the login with `access_blocked`.
5. Copy the client ID/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
6. From a patient or doctor dashboard's Settings page, click **Connect Google Calendar** and complete the consent screen. `access_type: offline` + `prompt: consent` are set so a refresh token is always issued, even on a repeat connect.

### Universal calendar export (works without Google OAuth)

Google Calendar sync is opt-in — Google Calendar API OAuth is a real setup step, and not every patient or doctor will complete it. Every confirmed appointment also gets a **"📅 Add to calendar"** link (on the patient's appointment list and the doctor's appointment card) that downloads a plain [RFC 5545](https://www.rfc5545.com/) `.ics` file — hand-rolled in `src/lib/ics.ts`, no dependency. It opens correctly in Apple Calendar, Outlook, or Google Calendar's own "Import," so calendar sync works for 100% of appointments regardless of whether OAuth was ever set up, not just the ones where it was.

## Database schema

Full definition in [prisma/schema.prisma](prisma/schema.prisma).

- **`User`** — email/password (bcrypt), `role` (`PATIENT`/`DOCTOR`/`ADMIN`). One-to-one with `DoctorProfile` or `PatientProfile` depending on role.
- **`DoctorProfile`** — specialization, bio, `workingHours` (JSON, per-weekday `{start, end}`), `slotDurationMinutes`. Has many `Leave` and `Appointment`.
- **`Leave`** — one row per doctor per day off; `@@unique([doctorId, date])`.
- **`Appointment`** — `slotStart`/`slotEnd`, `status` (`PENDING`/`CONFIRMED`/`CANCELLED`/`COMPLETED`), `holdExpiresAt` (5-minute hold on `PENDING`). The double-booking guard is a **hand-written partial unique index** on `(doctorId, slotStart) WHERE status IN ('PENDING','CONFIRMED')` — not expressible in Prisma's schema DSL, added via raw SQL in migration `20260820150751_partial_unique_active_slot`. See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) for why.
- **`SymptomForm`** — one-to-one with `Appointment`; raw symptoms plus `aiUrgency`/`aiChiefComplaint`/`aiSuggestedQuestions` (nullable), `aiSummaryFailed`/`aiSummaryError`, and `aiSource` (`"LLM"` or `"LOCAL"` — see LLM prompts section below).
- **`VisitNotes`** — one-to-one with `Appointment`; doctor notes + prescription plus `aiPatientSummary` (nullable), the same failure-flag pattern, and `aiSource`.
- **`MedicationReminder`** — one row per prescribed medication with a normalized `intervalHours`, `remindersLeft`, `nextSendAt`, `sent`.
- **`NotificationLog`** — the single write path for every EMAIL/CALENDAR send (`queueNotification` in `src/lib/notifications.ts`); tracks `status`, `attempts`, `lastError`, `externalEventId` (for calendar deletes).
- **`GoogleCalendarToken`** — one-to-one with `User`; stores the OAuth access/refresh token pair.

## LLM prompts

Exact wording used in `src/lib/llm.ts` (verbatim from the brief's LLM Usage Guidance):

**Pre-visit summary** — structured output (`urgency: Low|Medium|High`, `chiefComplaint`, `suggestedQuestions: string[3]`):
> "Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: `<symptoms>`"

**Post-visit summary** — structured output (`patientSummary`, `medicationSchedule[]`, `followUpSteps: string[]`), with one addition beyond the brief's wording — asking for a normalized `intervalHours`/`durationDays` per medication so the same call doubles as the data source for medication-reminder scheduling, with no second parsing pass over the prescription text:
> "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: `<notes>`
>
> For each medication, also give a normalized reminder interval in hours (e.g. "twice daily" -> 12, "every 8 hours" -> 8, "once daily" -> 24) and, if a course length is mentioned, its duration in days."

Both calls use `messages.parse()` with a Zod schema (`zodOutputFormat`) when running on Anthropic, or a hand-written Gemini `responseSchema` (still validated against the same Zod schema afterward) when running on Gemini — no manual JSON parsing or regex extraction either way.

### Symptom Checker (standalone, patient-facing)

Separate from the booking flow's pre-visit triage, `/patient/symptom-checker` is a self-serve "what might this be" tool: a patient describes symptoms (or taps quick-add chips grouped by category), and gets back up to 5 possible conditions with an urgency level, plain-language explanation, and recommended next step — always with a prominent "not a medical diagnosis" disclaimer and a straight line to book an appointment. Same `generateSymptomCheck()` LLM-or-local pattern as the other two calls; see below for what backs the local path.

### Local fallback engines (no API key required)

When neither `ANTHROPIC_API_KEY` nor `GEMINI_API_KEY` is set, `src/lib/llm.ts` doesn't just fail — every one of the three calls above falls back to a **local, rule-based engine** that produces the same shape of output with no network call and no training data:

- **Pre-visit** — `src/lib/symptom-triage.ts`: ~50 hand-built symptom rules (cardiac, respiratory, neurological, GI, mental health, obstetric, pediatric, etc.), each with a baseline urgency and its own follow-up questions. A small set of rules are marked as **red flags** (chest pain, stroke signs, anaphylaxis, active suicidal ideation, severe bleeding, sudden vision loss, …) that force `High` urgency regardless of anything else matched, mirroring how real triage protocols like the Manchester Triage System or the Emergency Severity Index actually work — a decision list, not a black box. Intensifier words ("severe", "sudden", "worst") bump non-red-flag matches up a level.
- **Post-visit** — `src/lib/prescription-parser.ts`: regex-based extraction of medication name/dosage/frequency/duration from free-text prescriptions (handles `mg`/`mcg`/`ml`, "twice daily"/"BID"/"every 8 hours" style frequency phrasing, "for N days/weeks" duration), producing the same normalized `intervalHours` the medication-reminder scheduler needs.
- **Symptom checker** — `src/lib/symptom-database.ts` + `src/lib/symptom-checker.ts`: a curated, hand-authored knowledge base of 300+ common symptom phrases across 14 categories, mapped onto 68 common conditions (each with its own baseline urgency, description, and advice — including red-flag emergencies like stroke, anaphylaxis, appendicitis, and sepsis). Matching is plain keyword/overlap scoring against the patient's free text — not a trained classifier.

Every `SymptomForm`/`VisitNotes` row (and every symptom-checker response) records which engine actually produced it via `aiSource`/`source: "LLM" | "LOCAL"`, and the UI shows a small badge (✨ AI-generated / 🤖 Local triage engine or knowledge base) rather than presenting a rule-based result as if it came from a live model. Set either `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` and the real LLM path takes over automatically for all three features — nothing else changes. See [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md#notification-failure-handling) for how a real LLM failure (as opposed to a missing key) is still handled without breaking booking/visit flows.

## API reference

All routes are under `/api`. Page-level access is also gated by role in `src/proxy.ts` (Next's middleware); each handler additionally re-checks via `requireRole`/`auth()` since API routes are reachable directly.

**Auth**
- `POST /api/auth/register` — patient self-registration (name, email, password, optional phone)
- `POST /api/auth/callback/credentials`, `GET /api/auth/csrf`, etc. — NextAuth's own routes under `/api/auth/[...nextauth]`

**Doctors (patient-facing)**
- `GET /api/doctors?specialization=` — search doctors, optionally filtered
- `GET /api/doctors/:id/slots?date=YYYY-MM-DD` — available slots for a doctor on a date (working hours minus leave minus active/held appointments minus the past)

**Patient appointments**
- `GET /api/patient/appointments` — the signed-in patient's appointments
- `POST /api/patient/appointments` — hold a slot (`{doctorId, slotStart}`) → `201` with a `PENDING` row + 5-minute hold, or `409` if the slot's taken
- `POST /api/patient/appointments/:id/confirm` — submit symptoms (`{symptoms}`), runs the pre-visit LLM call, flips to `CONFIRMED`, queues booking-confirmation notifications
- `POST /api/patient/appointments/:id/cancel` — cancel a `PENDING`/`CONFIRMED` appointment; queues cancellation notifications only if it was `CONFIRMED`
- `GET /api/patient/appointments/:id/ics` — download a universal calendar file for a `CONFIRMED`/`COMPLETED` appointment (see "Universal calendar export" below); `409` otherwise

- `POST /api/patient/symptom-checker` — standalone self-check (`{symptoms}`), runs `generateSymptomCheck()`; returns up to 5 possible conditions, an overall urgency, a disclaimer, and the recognized-symptom keywords — nothing persisted, stateless

**Doctor**
- `GET /api/doctor/appointments` — the signed-in doctor's `CONFIRMED`/`COMPLETED` appointments
- `POST /api/doctor/appointments/:id/notes` — submit `{doctorNotes, prescription}`, runs the post-visit LLM call, marks `COMPLETED`, creates `MedicationReminder` rows from the structured schedule
- `GET /api/doctor/appointments/:id/ics` — same calendar export, for the doctor's own copy

**Admin**
- `GET /api/admin/doctors` / `POST /api/admin/doctors` — list / create doctor profiles (`{name, email, password, specialization, bio?, slotDurationMinutes, workingHours}`)
- `PATCH /api/admin/doctors/:id` — update a doctor profile
- `GET /api/admin/doctors/:id/leave` / `POST .../leave` — list / mark a leave day (`{date, reason?}`) — cancels conflicting appointments and queues patient notifications, returns `cancelledCount`
- `DELETE /api/admin/doctors/:id/leave/:leaveId` — remove a leave day
- `GET /api/admin/stats` — clinic-wide counts (patients, doctors, appointments, upcoming)

**Google Calendar**
- `GET /api/google/connect` — starts the OAuth flow (redirects to Google)
- `GET /api/google/callback` — OAuth callback; exchanges the code, stores the token, redirects back to the dashboard with a `?google=connected|error` banner

**Notifications**
- `GET /api/notifications` — the signed-in user's recent EMAIL notifications, for the header bell

**Cron** (each requires `Authorization: Bearer <CRON_SECRET>`)
- `GET /api/cron/sweep-holds` — cancel expired `PENDING` holds
- `GET /api/cron/process-notifications` — send queued/retryable `NotificationLog` rows
- `GET /api/cron/appointment-reminders` — queue reminder emails for appointments in the next 24h
- `GET /api/cron/medication-reminders` — dispatch due `MedicationReminder` rows

## Dependency footprint

11 runtime dependencies, all directly load-bearing for a requirement in the brief — auth (`next-auth`), ORM (`prisma`/`@prisma/client`), password hashing (`bcryptjs`), the LLM (`@anthropic-ai/sdk`), email (`resend`), Google Calendar (`googleapis`), and validation (`zod`). Nothing decorative was added on top: the calendar export (`.ics`), the local symptom-triage/prescription-parsing/symptom-checker fallback engines, and date formatting are all hand-rolled in plain TypeScript rather than reached for as libraries — `@auth/prisma-adapter` (never actually wired up — the credentials provider doesn't use it) and `date-fns` (pulled in for exactly two one-line functions) were removed during a pass specifically to trim anything not earning its place; see `src/lib/date-utils.ts` for the native replacements. Gemini support (an alternative to Anthropic when only a `GEMINI_API_KEY` is available) is a ~20-line `fetch()` call against Gemini's REST API in `src/lib/llm.ts` rather than the `@google/generative-ai` SDK — one more dependency avoided for something that's just a JSON POST.

## Known limitations

- **Vercel Hobby plan** restricts Cron Jobs to roughly daily frequency, so [vercel.json](vercel.json)'s 4 schedules are coarsened to once/day rather than the minutes-level cadence the background jobs are actually designed for. For real usage, either upgrade to Pro or point an external scheduler (e.g. cron-job.org) at the same routes with the `CRON_SECRET` bearer token.
- **Resend's free tier** (no verified domain) only delivers to the account's own signup address — fine for a demo, not for real patients, until a domain is verified at resend.com/domains.
- Single-timezone assumption throughout (`workingHours`/slots are clinic-local time, not per-user timezone-aware).
