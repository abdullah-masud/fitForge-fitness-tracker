# FitForge — Personal Gym & Fitness Tracker

A mobile-first home training journal built with Next.js App Router, React, TypeScript, Tailwind CSS, a shadcn-style Radix/CVA Button, Lucide, Recharts, and Supabase Auth/PostgreSQL. The initial program has Wednesday / Friday / Sunday strength sessions, with an optional recovery activity day. All personal records and charts derive from completed user logs; the app starts with no workout history.

The simplified home screen focuses on today's activity, the weekly schedule, exercise guides and progress. Exercise guides and live workouts now use a **real WebGL / Three.js 3D mannequin**, with front, three-quarter and side cameras, drag-to-rotate, pinch-to-zoom, and a hands close-up. Left and right wrist colors help distinguish the arms. Playback supports pause, restart, half speed and scrubbing, and starts paused for reduced-motion preferences. The original shaded SVG remains a clearly labelled compatibility fallback when WebGL is unavailable; catalogue thumbnails stay lightweight SVGs. Models are original instructional approximations, not motion capture or a clinical form assessment.

## Your 12–24 week program

Open **Weekly Plan → Your 3–6 month roadmap → Start this plan**. Existing saved routines are not silently overwritten by a deployment. This explicit action updates Strength A/B/C while retaining custom days and all history. The proposal is prefilled from the supplied profile: age 27, 172.7 cm (5′8″), 65 kg, no reported injuries or pain. Those values remain editable and are saved only when applied.

- Weeks 1–4: two sets per movement, usually 8–12 reps, learning technique and leaving 2–3 reps in reserve.
- Weeks 5–8: after reviewing consistency and recovery, optionally add a third set to chest, back and major leg exercises. Direct biceps and core work remain at two sets per session.
- Weeks 9–12: consolidate; progress reps and confirmed available loads. Review performance and optional body measurements.
- Weeks 13–24: repeat the consolidation phase with four-week reviews. No automatic escalation in sets or weight. A one-set lighter-week option is available if recovery warrants it.

All three strength days include chest, biceps and core work. Squat/lunge and hip-hinge patterns are distributed across the week, with rows, shoulder work and calf raises retained. Planned per-muscle sets count unilateral work per side (distinct from side-specific completed logging totals). Program weeks use Perth calendar dates. Calendar time alone does not demonstrate readiness or change phase automatically.

The nutrition panel gives a general protein range of 1.4–2.0 g/kg/day (about 91–130 g at 65 kg), balanced meals and gradual walking. It does not prescribe a weight-loss calorie deficit from height/weight alone. Core training cannot promise a visible six-pack within 12 or 24 weeks. Sources: [ACSM 2026 resistance-training guidance](https://acsm.org/resistance-training-guidelines-update-2026/), [ISSN protein position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/), [abdominal exercise trial](https://pubmed.ncbi.nlm.nih.gov/21804427/).

## Run locally

Use Node.js 22 or later and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. On Windows, use `Copy-Item .env.example .env.local` instead of `cp` if needed.

With both Supabase variables empty, FitForge runs in **clearly labelled local demo mode**. The demo is functional and uses browser localStorage, but is **not cloud-synced**. Export backups regularly. Clearing browser storage or changing browsers does not transfer your records. Historical November sessions are opt-in under History → Import; they are never preloaded into charts.

## Supabase setup

1. Create a Supabase project at https://supabase.com/dashboard.
2. Open SQL Editor and execute `supabase/migrations/001_fitforge.sql`.
3. Execute `supabase/seed.sql`. It is generated from the original catalogue in `src/lib/catalog.ts` with `npm run seed`.
4. In Authentication → Providers, enable Email/password. Keep confirmation emails enabled. Configure your production SMTP provider before public account registration.
5. In Authentication → URL Configuration, set Site URL to your production origin. Add both `http://localhost:3000` and your exact production URL to allowed redirect URLs. Confirmation and password recovery return to the app root.
6. Copy the project URL and **anon/publishable public key** from Project Settings → API into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-PUBLIC-ANON-OR-PUBLISHABLE-KEY
```

Never use a service-role key in either variable. These public values are included in the browser build; database access is protected by PostgreSQL row-level security, not by hiding the public key. Restart the development server after changing environment variables.

With Supabase configured, an authentication gate protects every personal screen. Sign-up, sign-in, sign-out and email password recovery are implemented. Local demo data does not silently migrate into an account; export it and explicitly restore the JSON backup after signing in if desired.

## Data architecture and security

- `exercises` holds the read-only catalogue. Anonymous database access is revoked; authenticated users may select, not modify, catalogue rows. The app bundles the same catalogue for fast visual guides.
- `user_preferences` stores a versioned, validated JSONB personal aggregate. Every select, insert, update and delete checks `auth.uid() = user_id`. The foreign key cascades when an Auth account is deleted.
- A single atomic aggregate write keeps session state and exercise logs together. `profiles`, `equipment`, `workout_plans`, `workout_days`, `planned_exercises`, `workout_sessions`, `exercise_logs`, `body_measurements`, and `personal_records` are **PostgreSQL 15+ security-invoker reporting views**, not duplicate writable tables; they inherit the underlying RLS.
- The browser saves every valid edit locally before attempting cloud sync, debounced to 1.5 seconds. Sync errors remain visible and are retried. Device caches are scoped to account IDs. Signing out never exposes one account’s cache through another account’s UI.
- This initial personal app uses last-write-wins aggregate synchronization. **Use one active browser/device for edits at a time**; simultaneous editing on multiple devices is not collaboratively merged. Export a backup before switching from an offline device with pending edits. This is an explicit initial-version limitation.
- Zod rejects malformed imports, invalid dates, out-of-range values, unknown exercise IDs and incorrect load units. JSON import is limited to 10 MB. CSV exports neutralize spreadsheet-formula prefixes.

Before enabling real accounts, test RLS with two Supabase users: each user must retrieve only their own `user_preferences` row and reporting views; attempts to insert/update another UUID must fail. No Supabase credentials are included in this repository, so remote auth/email/RLS integration must be checked against your configured project.

## Deploy to Vercel and get a live URL

### GitHub workflow (recommended)

1. Create an empty GitHub repository, then push this directory. Never add `.env.local` or credentials. `.gitignore` excludes secrets, builds, and dependencies.
2. In Vercel, choose Add New → Project → Import the GitHub repository.
3. Choose Next.js, root directory `./`, install command `npm ci`, build command `npm run build`. Use Node.js 22 or 24.
4. For a working local-demo deployment, leave the two Supabase variables unset. For cloud accounts, add both public Supabase values for Production and Preview before building.
5. Click Deploy. Vercel provides a `https://…vercel.app` URL. Add that exact URL to Supabase’s Site URL / redirect allowlist.
6. Rebuild after any `NEXT_PUBLIC_*` environment change, then test sign-up, email confirmation, sign-in, a saved session, and password recovery on the actual domain.

### Vercel CLI

```sh
vercel login
vercel --prod
```

Select your account, create a project named `fitforge` (or an available name), use the current directory, and accept Next.js defaults. If a stored login is invalid, run `vercel logout` followed by `vercel login`; use the browser/device authorization prompt. Do not put tokens in source files or messages.

Deployment is authorized for this project, but publishing requires a valid Vercel account session. An invalid existing CLI token does not produce a live deployment.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Unit tests cover per-dumbbell and unilateral volume, excluded band/bodyweight volume, unknown historical reps, completion accounting, progression gates, configured equipment, Perth schedule/date boundaries, weekly consistency streaks, and idempotent imports. The Playwright tests use Microsoft Edge (`channel: 'msedge'`) and covers onboarding, refreshing a logged set, pause/resume, explicit partial-session completion, import deduplication, guides, charts and a 390px mobile layout, plus real 3D camera controls, reduced-motion playback, and explicit phase application/persistence. Install Edge or change the Playwright channel to Chromium after `npx playwright install chromium` on non-Windows CI.

## Training and calculation conventions

- All calendar dates and week boundaries use **Australia/Perth**. Weeks begin Monday. The displayed streak is consecutive calendar weeks containing at least one completed session, not an invented daily streak.
- Default strength sessions use two sets, usually 8–12 reps; planks use 20–40 seconds. Estimated session/exercise durations are labelled targets, not recorded performance. Warm-up and recovery are encouraged. Goals change emphasis descriptions; plan edits remain explicit.
- Weight inputs are **kg per dumbbell**, and the catalogue records how many are used. A bilateral curl with two 4 kg dumbbells × 12 reps has 96 kg-reps of external load volume. A one-arm row has one dumbbell. A split squat uses two dumbbells but logs each leg separately. Side-specific sets count separately in totals.
- Band load is **nominal pounds**, never converted to kg or included in conventional external-weight volume. Bands, bodyweight and unknown repetition counts are excluded from kg-rep totals. Timed holds do not become repetitions.
- The imported sessions retain unknown duration and original ranges. Their exact known rep total is 246; four curl sets have unknown exact reps. They do not qualify for progression because technique and RIR were not recorded.
- Progression requires two completed sessions at the top of the target range, good technique and at least two reps in reserve. Suggested load must be in the configured available list; increases above 15% are not proposed. Suggestions require explicit confirmation and never promise safety. Pain, poor recovery and excessive difficulty take priority.
- Every catalogue exercise includes an original start/finish SVG schematic, steps, muscles, common mistakes, breathing cues, precautions and easier/harder variants. Schematics are instructional aids rather than verified anatomical motion capture. No third-party photographs or unverified tutorial links are bundled.
- Body measurements are optional user-entered values. The app does not infer body-fat percentage or guarantee visible abs.

Programming reference: ACSM, *Progression Models in Resistance Training for Healthy Adults* (https://pubmed.ncbi.nlm.nih.gov/19204579/). Technical setup follows the official Next.js installation documentation (https://nextjs.org/docs/app/getting-started/installation) and Supabase Auth documentation (https://supabase.com/docs/guides/auth).

## Install and offline behavior

Safari → Share → Add to Home Screen installs the standalone manifest shell. An internet connection is required to load the application; this release does not advertise a fully offline service-worker cache. Once loaded, device autosave retains workout edits across refreshes and connection failures. Rest timers are convenience UI and restart if their exercise panel is remounted; set records and session timing persist.

## Source map

- `src/lib/catalog.ts`: equipment, original exercise guides, beginner templates.
- `src/lib/engine.ts`: deterministic schedule/statistics/progression/coach rules.
- `src/lib/imports.ts`: opt-in historical sessions with stable IDs.
- `src/lib/validation.ts`: typed state and import validation.
- `src/components/provider.tsx`: account gate, local cache, cloud persistence.
- `src/components/`: reusable screens, Three.js player, fallback SVG demonstrations and UI primitives.
- `src/lib/motion-rig.ts`: deterministic 3D joint trajectories and fixed-elbow interpolation.
- `src/lib/program.ts`: phased templates, readiness summaries and per-muscle planned volume.
- `supabase/`: schema/RLS migration and generated catalogue seed.
- `tests/`: unit and browser flow tests.

Optional AI providers, progress-photo storage, multi-device conflict merging and full offline caching are intentionally not active features. No paid AI API is required.
