# Snagem: User Profile Data Reference (for AI prompting)

Machine-readable inventory of every user-specific field available for the
public profile and elsewhere. Paste any section into another AI tool as
context. Field paths are Firestore paths relative to a user's `uid`.

Legend. `visibility`: public = safe to show anyone · private = never show ·
opt-in = user/toggle controlled. `effort`: stored = read directly ·
computed = needs a query/aggregation · new = needs a field added.

```yaml
user_profile_schema:
  identity:
    - key: username
      path: users/{uid}.username
      type: string
      visibility: public
      effort: stored
    - key: avatar
      path: users/{uid}.avatar
      type: image_url
      note: reused across the whole app (posts, nav, cards)
      visibility: public
      effort: stored
    - key: role
      path: users/{uid}.permissions
      type: enum(Admin|Director|Master|Verified|New|Applicant|Disabled)
      visibility: public
      effort: stored
    - key: joined_at
      path: users/{uid}.joinedAt
      type: timestamp{seconds,nanoseconds}
      note: set at registration; older accounts may lack it (show only if present)
      visibility: public
      effort: stored
    - key: signature
      path: users/{uid}.signature
      type: html
      note: Gaia-style; sanitize before render
      visibility: public
      effort: stored
    - key: discord_name
      path: users/{uid}.discordName
      type: string
      visibility: opt-in
      gated_by: users/{uid}.discordPublic == true
      effort: stored

  profile_block:  # bag/profile doc: public-profile-only per design scope
    - key: cover_background
      path: users/{uid}/bag/profile.coverBG
      type: image_url
      visibility: public
      effort: stored
    - key: cover_background_options
      path: users/{uid}/bag/profile.cover_backgrounds
      type: image_url[]
      visibility: public
      effort: stored
    - key: description
      path: users/{uid}/bag/profile.description
      type: html
      note: sanitize before render
      visibility: public
      effort: stored
    - key: tags
      path: users/{uid}/bag/profile.tags
      type: string[]
      note: max 6; good for a chip row
      visibility: public
      effort: stored

  featured_picks:  # bag/profile doc: curated showcase, ids into the user's bag
    - key: featured_character_id
      path: users/{uid}/bag/profile.featuredCharacterId
      resolves_to: bag/characters[id]
      visibility: public
      effort: stored
    - key: featured_team_id
      path: users/{uid}/bag/profile.featuredTeamId
      resolves_to: bag/teams[id]
      visibility: public
      effort: stored
    - key: featured_pokemon_id
      path: users/{uid}/bag/profile.featuredPokemonId
      resolves_to: bag/owned_pokemons[id]
      visibility: public
      effort: stored

  badges_and_emotes:
    - key: inserted_badges
      path: users/{uid}.badges
      type: string[]  # labels, max 5, same as shown on posts
      visibility: public
      effort: stored
    - key: owned_emotes
      path: users/{uid}.emojis
      type: string[]  # emote ids; resolve against emote catalog for name/image
      visibility: public
      effort: stored

  characters:  # bag/characters = Record<uuid, Character>, richest visual material
    path: users/{uid}/bag/characters
    visibility: public
    effort: stored
    item_fields:
      - name: string
      - imageURL: image_url            # character avatar
      - species: string
      - type: enum(None|Hybrid|Channeler)
      - pronouns: string
      - age: string
      - birthday: string
      - height: string
      - moveset: string
      - short_description: string
      - createdAt: {nt,seconds}

  pokemon:  # bag/owned_pokemons = Record<uuid, OwnedPokemon>
    path: users/{uid}/bag/owned_pokemons
    visibility: public
    effort: stored
    item_fields:
      - name: string
      - species: string
      - image_slug: string             # sprite via getPokemonImageURL(slug)
      - gender: enum(M|F)
      - generation: string
      - pokedex: string
      - regiondex: string
      - type1: string
      - type2: string?
      - date_caught: {nt,seconds}
      - caughtIn: {forum,threadId,postId,threadTitle}?  # links to the thread
      - experience: number?            # earned via forum posting
      - friendship: number?            # admin-assigned
      - purification: number?          # admin-assigned
      - shadow: number?                # admin-assigned

  teams:  # bag/teams = Record<uuid, Team>
    path: users/{uid}/bag/teams
    visibility: public
    effort: stored
    item_fields:
      - team_name: string
      - pokemon_ids: string[]          # up to 6, resolve against owned_pokemons
      - times_battled: string
      - created_at: {nt,seconds}

  forum_activity:
    - key: post_count
      source: count posts where ownerUid == uid
      visibility: public
      effort: computed  # cheap aggregation; denormalize to users.postCount if hot
    - key: threads_hosted
      source: threads where hostUid == uid
      visibility: public
      effort: computed
    - key: recent_activity
      source: latest posts/threads by the user
      visibility: public
      effort: computed

  private_do_not_show:
    - users/{uid}.email
    - users/{uid}/bag/currency        # pokecoin, gengarcoin, snagemblem (strings)
    - users/{uid}/bag/items           # inventory quantities
    - users/{uid}/bookmarks/*
    - users/{uid}/drafts/*
    - users/{uid}/notifications/*
    - users/{uid}.capabilities        # director powers list
    - users/{uid}.discordUID          # raw id (use discordName instead)

  helpers:
    pokemon_sprite: getPokemonImageURL(image_slug)   # jsDelivr https CDN
    item_sprite: getItemImageURL(filePath)
    emote_image: getEmoteImageURL(filename)          # firebase storage
    badge_gradient: getColor1(label) / getColor2(label)
    sanitize_html: DOMPurify.sanitize(html)          # required before render
```

## Notes for a design/AI prompt

- The **avatar** is shared app-wide; **cover, description, tags, featured
  picks** are public-profile-only.
- **Characters** are the strongest visual centerpiece (each has its own
  avatar + descriptive fields). **Featured team** and **featured pokemon**
  give ready-made hero moments.
- Anything marked `computed` (post counts) is fine to fetch but denormalize to
  the user doc if the profile gets heavy traffic.
- Everything marked `private` should never surface on a public page.
