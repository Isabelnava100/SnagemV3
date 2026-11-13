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

As of the last check, all 84 functions exported from `functions/src/index.ts`
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

- **Cloud Functions CPU quota.** us-central1 caps at 20 vCPU. There are 84
  functions at `cpu 0.2` each, which is 16.8 vCPU. Keep
  `functions x cpu_milli` at or under 20000 or raise the quota, otherwise
  deploys fail partway.
- **Quota-hit deploys can drop the `allUsers` invoker binding** on Cloud Run
  services, which makes callables return 403. Redeploying does not restore it.
  Fix with `gcloud run services add-iam-policy-binding`.
- **Node version.** Netlify builds on 22 (`netlify.toml NODE_VERSION`),
  `firebase.json` pins the functions runtime to `nodejs22`, and
  `functions/package.json` declares `engines.node: 22`. All three agree today.
  A newer local Node (24.x) builds fine, but when something only breaks locally,
  check whether you are off 22 before chasing it further.
- **Never introduce `package-lock.json`.** bun only.
- **No em dashes anywhere**, including code comments and commit messages. See
  `CLAUDE.md`.

## Moving to a brand new computer

The repo is the easy part. What bites is the handful of things that are
deliberately NOT in git, so a clone alone leaves you with a site that will not
boot and a CLI that refuses every command.

### What does not travel with the clone

| Missing after clone | Why | How to restore |
| --- | --- | --- |
| `.env` | gitignored | `cp .env.example .env`, fill from the Firebase console (see First run above) |
| `node_modules` | gitignored | `bun install`, then `npm install` inside `functions/` |
| Firebase project selection | no `.firebaserc` in the repo | `firebase login` then `firebase use snagemguild` |
| Application Default Credentials | per machine | `gcloud auth application-default login` |
| Gaia export data | gitignored (member content) | already uploaded to Firestore; regenerate only if you need the raw files |
| Claude Code memory and settings | live in `~/.claude`, outside the repo | copy `~/.claude/projects/<project>/memory/` across if you want the history, otherwise start fresh |

Runtime secrets (SendGrid, Discord) do NOT need to be moved. They live in
Firestore under `adminSecrets/*` and are edited from Site Settings on the live
site, so a correct `.env` plus a logged-in CLI is a fully working setup.

### Order of operations

```bash
git clone https://github.com/Isabelnava100/SnagemV3.git
cd SnagemV3
bun install
(cd functions && npm install)
cp .env.example .env     # then fill it in
firebase login
firebase use snagemguild
gcloud auth application-default login
```

### Verify before trusting the machine

Run all four. Each one proves a different half of the setup.

```bash
npx tsc --noEmit         # zero errors
bun run test             # all green
bun run build            # tsc + sitemap + vite build
bun run dev              # app boots and you can sign in
```

If `bun run dev` loads but Firebase calls fail, `.env` is wrong or incomplete.
If `firebase` commands fail, you skipped `firebase use snagemguild`. If a seed
script under `functions/scripts/` fails on credentials, you skipped the gcloud
ADC login.

Confirm the backend matches the repo before changing anything:

```bash
firebase functions:list
```

### Do not re-deploy just to prove it works

The frontend deploys from a push to `main`, and the backend is already live and
in sync. Deploying functions has real risk attached (see the CPU quota and
invoker gotchas below), so deploy only when you actually changed rules or
functions.

### Handing this to Claude on the new machine

Point it at the two files that matter, in this order:

1. `CLAUDE.md` for the coding rules (writing style, UI, SEO, accessibility,
   Firestore, security).
2. This file for environment, deploys, secrets, and the gotchas.

Then have it run the four verification commands above and report what failed,
rather than assuming the machine is good.

## Where to read next

- `CLAUDE.md`: coding rules, UI and SEO and accessibility standards, and the
  running log of shipped features and deferred work.
- `docs/DATABASE.md`: Firestore collection map.
- `docs/PERMISSIONS.md`: the role and capability model.
- `docs/BACKLOG.md`: what is deliberately deferred.
- `docs/AUTH.md`, `docs/FORUM.md`, `docs/SEO.md`: subsystem deep dives.
