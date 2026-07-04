# SnagemV3 — Project Rules

Pokemon roleplay community site (forums, dashboard, character/team management).
Live: snagemguild.com. Deploy: Netlify (`netlify.toml`, SPA redirect to index.html).

## Stack (upgraded July 2026 — keep these current)

- React 19, TypeScript 6 (`moduleResolution: bundler`), Vite 8 (rolldown bundler)
- Mantine 9 (+ `@mantine/emotion` for `sx` support), Tailwind 4 (CSS-first, no config file, preflight OFF)
- Firebase 12 (compat init in `src/context/firebase.ts`, modular API everywhere else)
- @tanstack/react-query 5, Tiptap 3, react-router-dom 6
- Package manager: **bun** (`bun.lock`). Never introduce package-lock.json.

## UI rules

- **Mantine first.** Reach for Mantine components/props before custom CSS or Tailwind. Tailwind utilities are OK for quick layout in existing Tailwind-styled areas (dashboard tables); do not mix both approaches in one new component.
- `sx` prop works via `@mantine/emotion` (see `src/emotion.d.ts` + provider in `src/routes.tsx`). For new code prefer style props (`fz`, `fw`, `c`, `gap`, `justify`) over `sx`.
- v9 prop names: `gap` not `spacing`, `justify` not `position`, `c` not `color` (Text/Title), `fw` not `weight`, `fz` for numeric font sizes, `leftSection`/`rightSection` not icons props, `wrap="nowrap"` not `noWrap`.
- Dark theme only (`defaultColorScheme="dark"`, theme in `src/lib/mantine.ts` — palettes must be 10 shades).
- Icons: `@tabler/icons-react` (NOT dead `@tabler/icons` v1) or existing `tabler-icons-react`.
- **Everything must be mobile responsive.** Any new or edited UI must work at 375px width with no horizontal scroll: use Mantine responsive props (`span={{ base: 12, xs: 6 }}`, responsive style props), relative widths (`maw` + `w="100%"`) over fixed px, and verify at the mobile viewport before committing. Theme breakpoints: xs=480, sm=800 (`src/lib/mantine.ts`).

## Data & Firestore rules

- All reads go through react-query. Default `staleTime` 2 min / `gcTime` 10 min set in `src/lib/react-query.ts` — don't refetch the same doc per component; share query keys.
- Mutation results: invalidate with `queryClient.invalidateQueries({ queryKey: [...] })` (object syntax).
- react-query 5 names: `isPending` (aliased `isPending: isLoading` in older files), no `onSuccess` on queries, `gcTime` not `cacheTime`.
- Firestore is billed per document read: prefer `query(where, limit, orderBy)` over full-collection `getDocs`; paginate server-side (startAfter) instead of fetching all posts and slicing client-side.
- Never trust client checks for authz — admin gating in `Admin/index.tsx` is UI-only; real enforcement lives in Firestore security rules (kept in Firebase console, not this repo). Any new collection/write path needs a matching rule.
- **Permissions: two orthogonal axes** — `role` (`permissions` field, forum-visibility tier) and `capabilities` (granted actions). Use helpers in `src/lib/permissions.ts` (`isAdmin`, `hasCapability`, `canAccessForum`), never raw string compares. Gate sensitive actions with `hasCapability` and log them via `src/lib/auditLog.ts`. Full model + roadmap: `docs/PERMISSIONS.md`. Database map + forum build plan: `docs/DATABASE.md`.

## Security rules

- User-generated HTML (Tiptap output stored in Firestore) MUST be sanitized with `DOMPurify.sanitize()` before any `dangerouslySetInnerHTML`. Precedent: `src/Pages/forum/mainThreadLayout/components/EachPost.tsx`.
- No secrets in client code. `VITE_*` env vars are PUBLIC (bundled). Firebase web config is fine; anything privileged (Discord bot endpoint) must validate/rate-limit server-side.
- `.env` is gitignored — keep it that way; update `.env.example` when adding vars.

## Build & dev

- `npm run dev` / `bun run dev` (vite), `npm run build` = `tsc && vite build`. Both must pass before commit.
- vite.config.ts `manualChunks` is a function (rolldown requires it).
- Typecheck: `npx tsc --noEmit` — keep at zero errors.
- This repo lives in iCloud-synced Documents: if builds hang on file reads, node_modules was evicted — run `brctl download node_modules` and wait.

## Known deferred work

- Remaining `bun audit` findings are transitive; re-audit after major bumps.
- Auth-gated pages (dashboard/editor/admin) migrated to Mantine 9 mechanically — visual QA pending a logged-in pass.
- Forum post pages still read from the top of the collection for middle pages (`src/Pages/forum/queries.ts` getPostsPage) — switch to `startAfter()` cursors before threads get long.
- Thread list filters `closed`/pinned client-side after a `limit(200)` fetch (`src/Pages/forum/queries.ts` getThreadList) — move to `where`/`orderBy` clauses; requires a composite Firestore index (create in console first, then change the query).
- Forum game layer (dice/randoms/encounters, inventory decrements, catch writes) generates results client-side — forgeable. Needs a callable Cloud Function at publish plus write-once block enforcement in rules; host-only thread edits are also client-gated only. See docs/FORUM.md "Deferred".
- `getTeams()`/`getTeam()` always cascade an extra `getOwnedPokemons()` read (`src/queries/dashboard.ts`) — split so pokemon data is fetched once via its own cached query.
- Discord notify endpoint (`VITE_BACKEND_DISCORD_BOT`, `src/Discord/NewPost.tsx`) is public in the bundle — anyone can spam it. Move behind an authenticated Cloud Function / rate-limited backend.
