# Setup: working on SnagemV3 from another machine

Everything you need to clone this project onto a new computer, run it, and
reconnect hosting, Firebase, and the deploy pipeline. Read `CLAUDE.md` first
if you are using Claude Code: it holds the coding rules, and this file holds
the environment and deploy wiring.

## What this project is

Pokemon roleplay community site (forums, dashboard, character and team
management). Live at https://snagemguild.com.

Two halves, deployed separately:

| Half | What | Where it deploys | Trigger |
| --- | --- | --- | --- |
| Frontend | React 19 + Vite 8 SPA in `src/` | Netlify | automatic on push to `main` |
| Backend | Cloud Functions in `functions/`, Firestore rules and indexes | Firebase project `snagemguild` | manual `firebase deploy` |

The Firestore database, Auth, and Storage all live in the Firebase project.
There is no separate server.

## Accounts you need

You must be signed in to all three, with the owner account:

1. **GitHub**: `Isabelnava100/SnagemV3` (push access to `main`).
2. **Netlify**: the site that builds this repo. It watches `main` and needs no
   local CLI. Nothing about it is configured in this repo except
   `netlify.toml`.
3. **Firebase / Google Cloud**: project `snagemguild` (project number
   999266606642, region us-central). **Must stay on the Blaze plan**, since
   Cloud Functions do not run on Spark.

## Prerequisites

- **Node 22 or newer.** Netlify builds on Node 22 (`netlify.toml`), and the
  functions runtime is Node 20 on the server side.
- **bun** as the package manager (`bun.lock`). Never introduce a
  `package-lock.json`.
- **Firebase CLI**: `npm i -g firebase-tools`.
- **gcloud CLI**: only needed for the seed and audit scripts under
  `functions/scripts/`, which authenticate with Application Default
  Credentials.

## First run on a new machine

```bash
git clone https://github.com/Isabelnava100/SnagemV3.git
cd SnagemV3
bun install
```

Then create `.env` in the repo root. It is gitignored, so it never arrives
with the clone, and the app will not boot without it. Copy `.env.example` and
fill it from the Firebase console under Project settings > General > Your apps
> Web app > SDK setup and configuration:

```bash
cp .env.example .env
```

```
VITE_BACKEND_FIREBASE_API_KEY=""
VITE_BACKEND_FIREBASE_AUTH_DOMAIN=""
VITE_BACKEND_FIREBASE_PROJECT_ID="snagemguild"
VITE_BACKEND_FIREBASE_STORAGE_BUCKET=""
VITE_BACKEND_FIREBASE_MESSAGING_SENDER_ID=
VITE_BACKEND_FIREBASE_APP_ID=""
VITE_BACKEND_FIREBASE_MEASUREMENT_ID=""
VITE_DISCORD_CLIENT_ID=""
```

Every `VITE_*` value is public and ends up in the browser bundle, so the
Firebase web config is safe to put there. Anything genuinely privileged does
NOT belong in `.env` (see Secrets below). Keep `.env.example` updated whenever
you add a variable.

Point the Firebase CLI at the project. There is **no `.firebaserc` in the
repo**, so a fresh clone has no project selected and every `firebase` command
will fail until you run:

```bash
firebase login
firebase use snagemguild
```

## Daily commands

```bash
bun run dev
```

| Command | What it does |
| --- | --- |
| `bun run dev` | Vite dev server |
| `bun run build` | `tsc` + sitemap generation + `vite build`. Must pass before any commit. |
| `npx tsc --noEmit` | Typecheck only. Keep at zero errors. |
| `bun run test` | Vitest |
| `bun run lint` | ESLint over `src` |
| `bun run format` | Prettier over `src` |

## Deploying

### Frontend

Push to `main`. Netlify builds and publishes automatically. There is nothing
to run locally.

```bash
git push origin main
```

`bun run build` regenerates `public/sitemap*.xml`, so those files often show up
as modified after a build. Commit them only when the routes actually changed.

### Backend

Never automatic. Deploy rules and functions **together**, since the tightened
rules assume the callables exist:

```bash
firebase deploy --only firestore:rules,firestore:indexes,functions
```

Narrower forms when you know the blast radius:

```bash
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
```

Check what is currently live at any time:

```bash
firebase functions:list
```

As of the last check, all 81 functions exported from `functions/src/index.ts`
are deployed and in sync, so the backend is current. If you add a callable,
that command is how you confirm it landed.

## Secrets, and where they actually live

Nothing privileged is stored in this repo or in `.env`. Runtime secrets live in
Firestore and are edited through the admin UI on the live site:

| Secret | Where | Set via |
| --- | --- | --- |
| SendGrid API key, verified sender | `adminSecrets/email` | Admin > Site Settings > Email notices |
| Discord webhook URL | `adminSecrets/discord` | Admin > Site Settings |
| Discord OAuth client id and client secret | `adminSecrets/discord` | Admin > Site Settings |

Consequence: a fresh clone with a correct `.env` is fully functional, because
the secrets are already in the database. You do not re-enter them per machine.

Firestore security rules are the real authorization boundary. Client side
permission checks are UI only. Any new collection or write path needs a
matching rule in `firestore.rules`, deployed.

## Seed and maintenance scripts

Run from inside `functions/` so they pick up Application Default Credentials
(`gcloud auth application-default login` once per machine):

```bash
cd functions
node scripts/seed-region-lists.mjs --check
```

Most seed scripts accept `--check` to validate offline before writing. The set
lives in `functions/scripts/` (region lists, mission encounters, safari
contest, fishing rods, ambrosial shop, blog, lore, Gaia export upload, plus
audit and backfill utilities).

Data generators that rewrite files in `src/data/` live in the root `scripts/`
folder (`gen-stars.mjs`, `gen-types.mjs`, `gen-egggroups.mjs`,
`gen-evolutions.mjs`, `gen-sitemap.mjs` and friends). Several of these write
the same JSON into both `functions/src/` and `src/data/pokemon/`, and those
copies must stay in sync.

## Gotchas that will bite you

- **This repo lives in an iCloud synced folder.** If builds hang on file reads,
  `node_modules` was evicted. Run `brctl download node_modules` and wait.
- **Cloud Functions CPU quota.** us-central1 caps at 20 vCPU. There are 81
  functions at `cpu 0.2` each, which is 16.2 vCPU. Keep
  `functions x cpu_milli` at or under 20000 or raise the quota, otherwise
  deploys fail partway.
- **Quota-hit deploys can drop the `allUsers` invoker binding** on Cloud Run
  services, which makes callables return 403. Redeploying does not restore it.
  Fix with `gcloud run services add-iam-policy-binding`.
- **Node version drift.** `functions/package.json` declares `engines.node: 22`
  while `firebase.json` pins the deployed runtime to `nodejs20`. Deploys work
  today, but do not "fix" one without checking the other.
- **Never introduce `package-lock.json`.** bun only.
- **No em dashes anywhere**, including code comments and commit messages. See
  `CLAUDE.md`.

## Where to read next

- `CLAUDE.md`: coding rules, UI and SEO and accessibility standards, and the
  running log of shipped features and deferred work.
- `docs/DATABASE.md`: Firestore collection map.
- `docs/PERMISSIONS.md`: the role and capability model.
- `docs/BACKLOG.md`: what is deliberately deferred.
- `docs/AUTH.md`, `docs/FORUM.md`, `docs/SEO.md`: subsystem deep dives.
