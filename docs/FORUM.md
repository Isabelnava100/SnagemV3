# Forum system: build notes

Full play-by-post forum with the game layer from the July 2026 design board
(flow diagram + Figma "Snagem" file). This documents the data model, the
permission matrix, and the decisions taken on the board's open questions.

Module layout: `src/Pages/forum/`
- `config.ts`: categories + permission matrix, design tokens, page sizes
- `types.ts`: thread/post/blocks data model
- `queries.ts` / `mutations.ts`: all Firestore access (react-query everywhere)
- `pages/`: ForumIndex, ThreadView, NewThreadComposer, PostComposer (new+edit), HostMenu
- `components/`: PostCard (character strips, game blocks, profile popover),
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
legacy: reachable by URL, not shown in tabs.

## Data model

`forum/{forum}/threads/{threadId}`. New fields are all optional at read time
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
- **Encounter lists**: reuses the admin list library `admin/pokemon_lists`
  (managed in Dashboard → Admin → Adjust Lists). Hosts pick any public list or
  their own; `rule: except` lists resolve against the full species catalog.
- **Bookmarks**: `users/{uid}/bookmarks/{forumLink}` threadId-keyed map (the
  model the dashboard already read). The old `users.myBookmarks` array write
  path was removed with the legacy BookmarkButton.
- **Drafts**: `users/{uid}/drafts/*` in the existing dashboard Draft shape;
  composers link back via `?draft=<id>` (`thread_id: "new-thread"` for the
  thread composer).
- **XP submissions**: `tickets` docs `{type: "xp_submission", ...}` (admin-read).

## Game rules implemented

- **Lock rule (board 20/21):** dice, random numbers and encounters lock the
  moment they are rolled/chosen in the composer and publish with the post;
  the edit view shows published blocks read-only and only allows adding new
  ones plus editing text. Post text is editable by its author only (board 8).
- **Encounters:** host picks list + mode (`roll` = random from list, `choose` =
  search within list, board 16), per-player allowance shown and enforced via
  `encounterClaims`, host kill-switch (`disabled`, board 17). Non-catchable
  list entries and boss-battle encounters are flagged `catchable: false`.
- **Catch resolution:** using a ball-category item in the same post as a
  catchable encounter catches it (deterministic) and adds the pokemon to
  `bag/owned_pokemons` (type fields best-effort: species catalog has no
  type data). Balls are blocked while a boss battle is active for
  non-excluded players ("cannot be used in a team battle").
- **Boss battles:** host starts/ends from the Host Menu, both behind
  confirmation modals (board 14 + "end needs confirmation" annotation); each
  action posts a system announcement card into the thread and non-excluded
  players' posts automatically carry the boss block.
- **Polls:** one vote per user, stored on the thread doc; re-voting overwrites
  (votes are changeable: open question 6 decision).

## Decisions on the board's open questions

1. **SubmitXP**: files an XP-review ticket (`tickets` collection) with an
   optional note; admins process manually. Accrual mechanics still open.
2. **Catch resolution**: ball item + catchable encounter in one post =
   caught (see above). Hosts arbitrate narratively beyond that.
3. **Encounter allowance**: per-user per-thread, set by the host
   (`perUserLimit`, default 3).
4. **Boss lifecycle**: start → announcement + balls blocked; explicit End
   action (confirmation modal) → end announcement. No HP/turn system yet.
5. **Dice UX**. Selection model: pick one die type + count (min 1), single
   Roll, locked after.
6. **Polls**: votes changeable, one poll per thread, no closing flow yet.
7. **Archived threads**: read-only; host (or admin) can unarchive from the
   Host Menu.
8. **Post list**: pagination (6/page, server-side page fetch), matching the
   design's pagination component.
9. **Posting restrictions**: the host sets Allow Anyone / Limit Who Can Post
   (username multi-select) at creation and can change it in the Host Menu.
   Everyone can still read.
10. **Drafts**: manual save (Save Your Draft / Save Post Draft), multiple
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
a draft does not discard a bad roll. The composer restores it on reload and
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
Deploy the rules and the functions together: the tightened rules assume the
functions exist (clients can no longer write posts directly).

### Still deferred

- Post text length/content is validated server-side only loosely (size caps);
  HTML is still sanitized at render time with DOMPurify, not at write time.
- The dashboard's own `bag/*` writes (teams, characters, profile) remain
  owner-writable by rules. The forum no longer depends on trusting them, but
  a cheater could still hand-edit their inventory quantities; moving the whole
  economy behind functions is a future pass.
- Sequential thread ids come from a collection count outside the transaction
  (same as the legacy app). A simultaneous create could collide; harmless at
  current scale but worth a counter doc later.

## Boss battles & encounter capture (in progress)

Battle stage of any species is derived in `src/lib/battleStage.ts`
(stage1/stage2/stage3/legendary) from the baked evolution chains plus a
legendary/mythical/UB/Paradox dex list. Post counts per stage live in
`admin/battle_config` (editable in Admin > Permissions > Battle Costs), defaults
boss 5/10/15/20 and encounter 4/7/10/13.

### Boss battles (SHIPPED, needs functions deploy + QA)
- Host menu boss picker is limited to the thread's encounter list(s).
- `setBossBattle` stores stage + requiredPosts (from config) + attackPosts.
- A post opts into attacking via a checkbox; `publishForumPost` increments the
  shared `bossBattle.attackPosts`; reaching requiredPosts ends the battle and
  posts a boss-end message. Bosses are NEVER caught.
- Thread view pins a health-bar banner until the boss is down.
- Hardening TODO: stage is client-derived and passed to setBossBattle (count is
  server-authoritative from config). Move stage derivation server-side by baking
  the evolution + legendary data into functions if abuse appears.

### Encounter capture (SHIPPED — Phase 4, needs functions deploy + QA)
Implemented: every species carries a star rating 1..7 (`functions/src/starByDex.json`
+ `src/data/pokemon/starByDex.json`, generated by `scripts/gen-stars.mjs` from base
stat totals; 6 star = pseudo-legendary class, 7 star = legendary/mythical incl.
UB/Paradox). The star sets the posts to beat: 1..5 star = 3/4/5/6/7 posts, 6 star
= 8, 7 star = 12 (`STAR_POSTS_TO_BEAT`, mirrored in `src/lib/encounterStars.ts`).
A rolled catchable encounter persists in `pending/{uid}` with pre-rolled
gender/shiny (shown in the banner, kept on catch) and each qualifying post
increments `progress`; a Poke Ball catches only once `progress >= required`
(shown as a health bar draining). A fully worn-down encounter counts as BEATEN:
on mission threads its slug joins `thread.defeatedEncounters`, and the player may
roll their next target without catching it. The roller can assign the encounter
to one+ of their characters at roll time (`forCharacterIds`); the caught Pokemon
lands in that character's box. Non-catchable encounters are consumed on the next
post as before. Bosses stay defeat-only on the older stage-based costs
(`admin/battle_config` boss table; its encounter table is superseded by stars).

### Mission close requirements (needs functions deploy)
`pickUpMission` copies the mission's `requiredEncounters` (the briefing's set
foes) onto the thread plus an empty `defeatedEncounters`. The thread pins a
"Mission targets" checklist, and `CloseThreadModal` blocks closing while any
target is unbeaten, listing exactly what is left (staff with reward powers can
Close Anyway). Enforcement is client-side; closing itself is still the host's
field-scoped write.

Original spec (for reference):
Rule (from the owner): rolling an encounter starts capture progress that fills
over N posts by the encounter's stage. To catch, a participant must USE A
POKEBALL (the ball is the catch action; posts weaken it). Progress is PERSONAL
by default, but at roll time the roller can assign the encounter to one or more
of their own characters (shared among just those characters).
Build outline:
- Extend the pending-encounter record (forum/{f}/threads/{t}/pending/{uid}) with
  a per-encounter `progress`/`required` and an `assignedCharacterIds` list set at
  roll time in `rollEncounter`.
- Each qualifying post by an assigned character increments progress; a ball used
  once progress is full performs the catch in `publishForumPost` (reuse the
  existing catch write). Balls thrown early do not catch.
- Ball type gates by stage/type per the FAQ table (see below) when we build it.

### Per-character Pokemon boxes (SHIPPED — Phase 5)
Chose option (a), backward compatible so no migration was needed: `Team` and
`OwnedPokemon` gained an optional `characterId` (unset = shared/unassigned).
- Dashboard team editor assigns a team to a character; team cards show it.
- Pokemon detail assigns each Pokemon to a character; the box has a Character
  filter (Any / Unassigned / each character).
- Composer team picker lists only the selected character's teams (+ shared).
Refinement TODO: the team's Pokemon picker does not yet restrict to the team's
character's box; enforce that once teams are consistently assigned.

## FAQ-implied features to consider building
Ported the guild FAQ + Shadow Pokemon FAQ into the Library (FAQ + Moves tabs).
Mechanics the copy implies that are NOT built yet:
- Ball-type catch rules (stage/type gating, Safari balls, Apricorn balls). Ties
  directly into encounter capture (Phase 4).
- Evolution methods beyond level/item: trade, held-item, environment, happiness,
  move-based, regional-form. Today only level + item are modeled.
- Evo Points vs Purification Points: Shadow state blocks XP and swaps to
  purification; needs a `shadow`/`purification` flow + a Shadow Meter in combat.
- Ability selection + Ability Capsule (one locked ability, optional second).
- Mega Evolution / Z-Moves as Snag Machine upgrades.
- Currencies: Snag Coins, Snag Emblems (+ pieces), Gengar Tokens as first-class
  currencies with earn/spend flows (map onto the existing currency fields).
- Trading (Poke Swap): trade-only, Pokemon-for-Pokemon, no gifting/selling.
- Shiny / speak-human via Pokeblocks; eggs hatched by staff.
- Rewards are per-member not per-character (already how thread rewards work).
- Legendary caps (max 2/member, approval, Master/Cherish Ball) + banned list.
