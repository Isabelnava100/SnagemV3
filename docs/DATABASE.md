# SnagemV3: Firestore Database Map & Forum Build Plan

Reference for building the next modules. Firebase 12; compat init in
`src/context/firebase.ts`, modular API everywhere else. Reads are supposed to go
through react-query (`src/lib/react-query.ts`, staleTime 2 min / gcTime 10 min).
The dashboard obeys this, the **forum module does not yet**.

> Firestore bills per document read. "Reads" below = billed document reads.
> All authorization in the app is client-side UI only; the real gate is
> console-managed security rules (see `docs/PERMISSIONS.md`).

---

## Collections at a glance

| Path | Doc id | Shape | Status |
|---|---|---|---|
| `users/{uid}` | Auth uid | `application, email, gaiaName, username, permissions, capabilities?, badges[], discordUID?, settings{}, myBookmarks[]` | Works; role/permissions is client-writable (needs rules) |
| `NewUsers/{uid}` | Auth uid | same initial shape, `permissions:"New"` | Works; the approval queue. No in-app approve UI |
| `users/{uid}/bag/currency` | fixed | `{pokecoin, gengarcoin}` (strings) | Works; amounts-as-strings will bite future math |
| `users/{uid}/bag/items` | fixed | `Record<itemId,{name,category,filePath,quantity}>` | Works; Donate write loop is N×M, should batch |
| `users/{uid}/bag/characters` | fixed | `Record<uuid, Character>` | Works (map-in-one-doc, 1 read for all) |
| `users/{uid}/bag/owned_pokemons` | fixed | `Record<uuid, OwnedPokemon>` | Works but read 2–3× per dashboard visit (cascade) |
| `users/{uid}/bag/teams` | fixed | `Record<uuid, {pokemon_ids[],team_name,...}>` | Cascades an extra owned_pokemons read; `getTeam` has no null guard |
| `users/{uid}/bag/profile` | fixed | `{avatars[], coverBG, description(HTML), tags[]}` | Works; description now DOMPurify-sanitized on write |
| `users/{uid}/bag/badges` | fixed | `Record<key,[label,bg,enabled]>` (positional tuple) | Works, read-only; fragile tuple schema |
| `users/{uid}/bookmarks/Main-Forum` | per-section | `Record<uuid, Bookmark>` | **Split-brain** — dashboard reads it, nothing writes it |
| `users/{uid}/drafts/{autoId}` | auto | `Draft{category,long_text(HTML),thread_id,...}` | Orphan — read-only, no writer, legacy V2 data |
| `admin/pokemon_lists` | singleton | `Record<uuid, AdminPokemonList>` | Delete is a non-transactional read-modify-replace (races) |
| `tickets/discord` | singleton | `Record<uuid,{approved,discord_name,user_id,username}>` | One shared global doc, unbounded, `approved` client-writable |
| `forum/{slug}/threads/{numId}` | count+1 | `{closed,createdBy,notifyviaDiscord[],private,privateTo?[],timePosted,title}` | See forum section — ID race, no counts |
| `forum/{slug}/threads/{id}/posts/{autoId}` | auto | `{badges[]?,character,owner(displayName),text(HTML),timePosted}` | **No uid on posts** — blocks edit/delete authz |

`notifications` **does not exist** as a collection. The Settings "notifications"
toggles are write-only placeholders that change nothing yet.

### Cross-cutting issues
- **Currency stored as strings** — any future economy/transaction logic needs a number migration.
- **Map-in-one-doc pattern** (bag/*) is 1 read for a whole collection — good — but shares the 1 MB doc cap; fine at hobby scale.
- **`admin/pokemon_lists` and `tickets/discord`** are single global docs any authed user can merge into; enforce writer identity + shape in rules.
- **Bookmarks are split-brain**: `BookmarkButton` writes regex strings to `users/{uid}.myBookmarks`; the dashboard reads `users/{uid}/bookmarks/Main-Forum` which nothing writes. Unify (forum plan rec 9).

---

## Forum module — current data flow

**Collections:** `forum/{slug}` (parent only, never read — slugs hardcoded in
`NewForumInfo`, `typesUsed.ts`) → `threads/{numericId}` → `posts/{autoId}`.

**Thread lifecycle:**
- **Create topic** (`handleSubmitTopic.tsx`): `getCountFromServer(threads)` → `id = count+1` → one `writeBatch` sets the thread doc + first post. **ID race:** two concurrent creators get the same id and merge into one thread; deletion causes id reuse.
- **New post** (`handleNewPostSubmit.tsx`): 1 `getDoc` of the thread → client checks `private`/`privateTo` → `writeBatch` bumps `thread.timePosted` + writes the post. `closed` is logged but **not blocked** — anyone with the URL can post to an archived thread.
- **Edit / delete post:** does not exist. Blocked anyway until posts carry `ownerUid`.
- **Close/reopen:** no write path in the app (flipped by hand in console).

**Read cost (100-post thread, 6/page, no react-query — every mount refetches):**
- Forum list: `limit(200)` then client-filters `closed` → **up to 200 reads per visit**, re-billed on every tab click / archive toggle.
- Thread page 1 or last: ~8 reads (cheap — count aggregation + `limit(6)`).
- Middle page N: fetches cumulative `limit(N*6)` then slices → page 16 ≈ **96 reads**. (The old "loads ALL posts" is partly fixed; middle pages still read the whole prefix — no `startAfter` cursor.)

**What already works:** atomic `writeBatch` writes, DOMPurify on post render
(`EachPost.tsx`), clean `/Forum/:forum/thread/:id/:page?` routing with `last`
resolution, `orderBy(timePosted desc)` bump-sorting, a feature-rich Tiptap editor.

**What's broken (beyond cost):** posts store `displayName` only (no uid) — blocks
all future edit/delete authz; `closed` not enforced on write; Pagination updates
state without `navigate()` so deep links/back break; `getThreads` throws if any
thread lacks `timePosted`; the Discord notify endpoint is public (and its only
call site is commented out).

---

## Forum build plan (ordered)

Do these roughly in order — each builds on the last. Create composite indexes in
the console **before** shipping the query that needs them.

1. **Migrate forum reads onto react-query** (foundation). New `src/queries/forum.ts`: `getThreads(forum, archive, cursor)`, `getThreadInfo(forum, id)`, `getPostsCount`, `getPostsPage`. Keys `['forum-threads', forum, archive]`, `['thread', forum, id]`, `['thread-posts', forum, id]`. Replacing the raw `useEffect`s alone kills the 200-read rebill on every tab switch.
2. **Create composite index** (console, first): on the `threads` collection group — `(closed ASC, timePosted DESC)`.
3. **Server-side thread-list filter + pagination:** `query(threadsRef, where('closed','==',archive), orderBy('timePosted','desc'), limit(25), startAfter(cursor?))` via `useInfiniteQuery`. Drops list cost ≤200 → 25/page.
4. **True post pagination via `postNumber`:** add `postCount` to thread docs (`increment(1)` in the existing batch); stamp each post `postNumber`; fetch `where('postNumber','>',(page-1)*6), orderBy('postNumber'), limit(6)` → any page in 6 reads, stable permalinks (`#post-42`). One-off backfill for existing posts.
5. **Fix thread-ID race:** allocate via `runTransaction` on a `threadCounter` field on the forum doc instead of `getCountFromServer+1`. Delete the dead `db.collection()` compat lines + unused imports.
6. **Denormalize `lastPost` preview** onto the thread doc (`{owner, ownerUid, character, timePosted, excerpt}`) in the same batch → MainForum "last post" column shows author+snippet with zero extra reads; free dashboard "recent activity".
7. **Post identity + edit/delete foundation:** add `ownerUid` and `editedAt` to every new post. Then rules: allow update/delete only if `request.auth.uid == resource.data.ownerUid && !threadClosed`; UI edit route reusing the NewPost editor; soft-delete flag rendered as a tombstone. **Log every edit/delete** via `logAuditEvent` (`src/lib/auditLog.ts`) — see PERMISSIONS.md.
8. **Enforce closed + private on write NOW** (cheap): block posting when `thread.closed`; store `privateTo` as **uids not displayNames** (displayName ACLs break on rename). Mirror in console rules.
9. **Unify bookmarks** into `users/{uid}/bookmarks/{threadId}` docs `{forum, threadId, title, notify, addedAt}` — replaces both the regex-string `myBookmarks` array and the orphaned `bookmarks/Main-Forum` map. One shared `useQuery(['bookmarks', uid])`; one-off migration of old strings.
10. **Move Discord notify server-side:** Cloud Function on post-create reads `thread.notifyviaDiscord` and calls the bot with a server-held secret; then delete `VITE_BACKEND_DISCORD_BOT` from the bundle and `src/Discord/NewPost.tsx`. Same trigger is the hook for @mention fan-out into a real `notifications` collection.
11. **Reactions** (after 7): `posts/{postId}/reactions/{uid}` docs + a denormalized `reactionCounts` map maintained by the Cloud Function, so page render stays at 6 reads.
12. **Cleanup:** sync Pagination to the URL (fix deep links); fix `new Date(seconds*1000)` in `Bookmarks.tsx`/`Drafts.tsx`; guard `timePosted` access in `getThreads.tsx`; wire the dead "Check Your Bookmarks" button.

> **Already done** (this pass): `checkPermsForum` rewritten to default-deny (no
> more privilege inversion); profile HTML sanitized on write; all signups routed
> through the `NewUsers` approval queue with a login gate.
