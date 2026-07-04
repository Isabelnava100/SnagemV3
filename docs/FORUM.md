# Forum system — build notes

Full play-by-post forum with the game layer from the July 2026 design board
(flow diagram + Figma "Snagem" file). This documents the data model, the
permission matrix, and the decisions taken on the board's open questions.

Module layout: `src/Pages/forum/`
- `config.ts` — categories + permission matrix, design tokens, page sizes
- `types.ts` — thread/post/blocks data model
- `queries.ts` / `mutations.ts` — all Firestore access (react-query everywhere)
- `pages/` — ForumIndex, ThreadView, NewThreadComposer, PostComposer (new+edit), HostMenu
- `components/` — PostCard (character strips, game blocks, profile popover),
  PollBlock, ScrollAids, composer panels (characters, items, encounters, post actions)

## Categories

Five design categories map onto the existing `/forum/{link}/threads`
collections (no data migration). `The-Colosseum` (value `"7"`) is new.

| Category (label)  | Firestore link  | Create threads                  |
|-------------------|-----------------|---------------------------------|
| Main Adventures   | `Main-Forum`    | Admins only                     |
| Side Stories      | `Side-Roleplay` | Any member                      |
| Missions          | `Quests`        | Any member (quests page entry)  |
| Events            | `Events`        | Admin or `HostEvents` capability|
| The Colosseum     | `The-Colosseum` | Admins only                     |

`Master-Mission` stays as a master-visibility tab (unchanged). `Private` is
legacy — reachable by URL, not shown in tabs.

## Data model

`forum/{forum}/threads/{threadId}` — new fields are all optional at read time
so legacy threads keep rendering:

```
title, createdBy, hostUid, closed (=archived), pinned, tags[], instructions,
restricted, allowedPosters[usernames],
createdAt, timePosted (last activity), replyCount,
lastPost{by, avatar, at}, participants{uid: {name, avatar}},
poll{question, options[{id,text}], votes{uid: optionId}},
encounterConfig{enabled, disabled, listId, listName, mode: roll|choose,
                perUserLimit, nonCatchable{listId, listName}},
encounterClaims{uid: count},
bossBattle{active, slug, name, description, excluded[usernames], startedAt},
notifyviaDiscord[] (legacy bookmark/discord ping list)
```

`.../posts/{postId}`:

```
owner, ownerUid, avatar, badges, character (legacy joined names),
characters[{id, name, imageURL, teamId?, teamName?, pokemon[{slug,name}]}],
text (sanitized at render with DOMPurify), timePosted, editedAt,
type: user | boss_start | boss_end,
blocks{ encounters[{slug,name,mode,catchable,caught}],
        itemsUsed[{itemId,name,filePath,qty,note?,caughtPokemon?}],
        dice[{sides,count,results[]}], randoms[{min,max,result}],
        boss{slug,name} }
```

Other storage:
- **Encounter lists** — reuses the admin list library `admin/pokemon_lists`
  (managed in Dashboard → Admin → Adjust Lists). Hosts pick any public list or
  their own; `rule: except` lists resolve against the full species catalog.
- **Bookmarks** — `users/{uid}/bookmarks/{forumLink}` threadId-keyed map (the
  model the dashboard already read). The old `users.myBookmarks` array write
  path was removed with the legacy BookmarkButton.
- **Drafts** — `users/{uid}/drafts/*` in the existing dashboard Draft shape;
  composers link back via `?draft=<id>` (`thread_id: "new-thread"` for the
  thread composer).
- **XP submissions** — `tickets` docs `{type: "xp_submission", ...}` (admin-read).

## Game rules implemented

- **Lock rule (board 20/21):** dice, random numbers and encounters lock the
  moment they are rolled/chosen in the composer and publish with the post;
  the edit view shows published blocks read-only and only allows adding new
  ones plus editing text. Post text is editable by its author only (board 8).
- **Encounters:** host picks list + mode (`roll` = random from list, `choose` =
  search within list — board 16), per-player allowance shown and enforced via
  `encounterClaims`, host kill-switch (`disabled`, board 17). Non-catchable
  list entries and boss-battle encounters are flagged `catchable: false`.
- **Catch resolution:** using a ball-category item in the same post as a
  catchable encounter catches it (deterministic) and adds the pokemon to
  `bag/owned_pokemons` (type fields best-effort — species catalog has no
  type data). Balls are blocked while a boss battle is active for
  non-excluded players ("cannot be used in a team battle").
- **Boss battles:** host starts/ends from the Host Menu, both behind
  confirmation modals (board 14 + "end needs confirmation" annotation); each
  action posts a system announcement card into the thread and non-excluded
  players' posts automatically carry the boss block.
- **Polls:** one vote per user, stored on the thread doc; re-voting overwrites
  (votes are changeable — open question 6 decision).

## Decisions on the board's open questions

1. **SubmitXP** — files an XP-review ticket (`tickets` collection) with an
   optional note; admins process manually. Accrual mechanics still open.
2. **Catch resolution** — ball item + catchable encounter in one post =
   caught (see above). Hosts arbitrate narratively beyond that.
3. **Encounter allowance** — per-user per-thread, set by the host
   (`perUserLimit`, default 3).
4. **Boss lifecycle** — start → announcement + balls blocked; explicit End
   action (confirmation modal) → end announcement. No HP/turn system yet.
5. **Dice UX** — selection model: pick one die type + count (min 1), single
   Roll, locked after.
6. **Polls** — votes changeable, one poll per thread, no closing flow yet.
7. **Archived threads** — read-only; host (or admin) can unarchive from the
   Host Menu.
8. **Post list** — pagination (6/page, server-side page fetch), matching the
   design's pagination component.
9. **Posting restrictions** — the host sets Allow Anyone / Limit Who Can Post
   (username multi-select) at creation and can change it in the Host Menu.
   Everyone can still read.
10. **Drafts** — manual save (Save Your Draft / Save Post Draft), multiple
    drafts allowed, resumable from Dashboard → Drafts.

## Server-side integrity layer (Cloud Functions)

All game-relevant writes go through callable Cloud Functions in
`functions/src/index.ts` (Admin SDK, transactional):

| Callable             | Does                                                            |
|----------------------|-----------------------------------------------------------------|
| `rollDice`           | Server-rolls, stores in the thread's `pending/{uid}` doc         |
| `rollRandom`         | Same for random numbers                                          |
| `rollEncounter`      | Validates list/mode/allowance, increments `encounterClaims`      |
| `publishForumPost`   | Validates restrictions/archived/edit-ownership, checks & decrements inventory, resolves catches into `bag/owned_pokemons`, attaches + consumes pending rolls, writes post + thread activity in one transaction |
| `publishForumThread` | Enforces the category matrix + admin-only pinning, creates thread + first post |
| `voteForumPoll`      | Validates the option, one vote per uid                           |
| `setBossBattle`      | Host/admin only; start/end + system announcement post            |

**Re-roll protection:** rolls are bound to the player's next post via
`forum/{f}/threads/{t}/pending/{uid}` (read-own, function-written). Abandoning
a draft does not discard a bad roll — the composer restores it on reload and
`publishForumPost` consumes it.

**Rules posture:** post create/update/delete and thread create are admin-only
for clients (functions bypass rules). Clients keep two field-scoped thread
write paths (bookmark `notifyviaDiscord`; host detail edits via
`hostUid` + `diff().affectedKeys()`). Legacy threads without `hostUid` can
only be host-managed by an admin.

### Deploying

Requires the Firebase CLI, the **Blaze plan** (Cloud Functions), and an
account with access to the project:

```
npm i -g firebase-tools
firebase login
firebase use <your-project-id>      # the VITE_BACKEND_FIREBASE_PROJECT_ID value
firebase deploy --only firestore:rules,functions
```

`firebase.json` wires both targets; functions build automatically on deploy.
Deploy the rules and the functions together — the tightened rules assume the
functions exist (clients can no longer write posts directly).

### Still deferred

- Post text length/content is validated server-side only loosely (size caps);
  HTML is still sanitized at render time with DOMPurify, not at write time.
- The dashboard's own `bag/*` writes (teams, characters, profile) remain
  owner-writable by rules — the forum no longer depends on trusting them, but
  a cheater could still hand-edit their inventory quantities; moving the whole
  economy behind functions is a future pass.
- Sequential thread ids come from a collection count outside the transaction
  (same as the legacy app) — a simultaneous create could collide; harmless at
  current scale but worth a counter doc later.
