# SnagemV3

Pokemon roleplay community site for the Snagem Guild — forums, member dashboard, character and Pokemon team management. Live at [snagemguild.com](https://snagemguild.com).

## Stack

- React 19 + TypeScript 6, built with Vite 8
- Mantine 9 (UI) + Tailwind 4 (utility classes) + `@mantine/emotion` (`sx` support)
- Firebase 12 — Auth, Firestore, Storage (config via `VITE_BACKEND_FIREBASE_*` env vars)
- @tanstack/react-query 5 for all data fetching
- Tiptap 3 rich-text editor (forum posts, profiles)
- Package manager: **bun**

See [CLAUDE.md](./CLAUDE.md) for project conventions and rules.

## Getting started

```bash
bun install
cp .env.example .env   # fill in Firebase web config values
bun run dev            # vite dev server
```

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start Vite dev server |
| `bun run build` | Typecheck (`tsc`) + production build to `dist/` |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | ESLint over `src/` |
| `bun run test` | Vitest unit tests |

## Deploying

Hosted on Netlify (`netlify.toml`: builds `dist/`, SPA redirect to `index.html`).

```bash
npx netlify-cli deploy        # draft/staging URL
npx netlify-cli deploy --prod # production
```

## Notes

- `.env` is gitignored. Add new vars to `.env.example` too. All `VITE_*` vars are public in the bundle — never put secrets there.
- Firestore security rules live in the Firebase console (project `snagemguild`) — keep them in sync when adding collections.
