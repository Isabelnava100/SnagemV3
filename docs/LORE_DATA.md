# Snagem: Lore Library Data Reference (for AI prompting)

Machine-readable inventory for the **Lore Library** (Gaia's read-only "The Library"
subforum). This is worldbuilding CONTENT, distinct from the app's existing `/Library`
page (Pokedex / Items / Moves / Encounter Lists reference data). Add it as a new
**Lore** tab on the existing Library page, or a sibling page. Paste any section into
another AI tool as context.

Legend. `visibility`: public (read-only) · admin (edit). `effort`: stored · new.
Classification: **100% CONTENT to migrate.** No game mechanics; nothing to reimplement.
Only the first-post lore body of each thread matters (reply mechanics are irrelevant).

## Content shapes (three, one flexible schema covers all)

1. **Structured catalog** — Compendium of Entities of Interest (bestiary/character
   roster; fields: Name, Species, Status, Appearance, Notes, Pokemon), and Unique
   Objects and Items (item lore; fields: Item + Alias, Description). Some entries are
   stubs flagged "[To be finished.]".
2. **Thematic narrative collections** — the "Book of [Type]" threads. NOT one entry per
   Pokemon; each is a set of titled prose sections (mythology, places, cultures).
3. **Continuous history** — The Story So Far: chronological prose in titled arcs
   ("Creation of Team Snagem", "The Rise of Cipher", "The Shadow Plague", ...).

## Two-level schema

```yaml
lore_books:
  path: loreBooks/{bookId}               # effort: new
  fields:
    - key: title                          # "Book of Ghost", "Compendium of Entities of Interest"
    - key: description
    - key: type: enum(type_book|compendium|objects|history|short_stories|other)
    - key: order

lore_entries:
  path: loreEntries/{entryId}            # effort: new
  fields:
    - key: bookId                         # parent
    - key: category                       # sub-grouping: "Minerals", "Kanto Natives", story-arc name; optional
    - key: title                          # section/entry name
    - key: body
      type: html
      note: rich text; sanitize with DOMPurify before dangerouslySetInnerHTML (project rule)
    - key: images
      type: image_url[]                   # Gaia posts embed art (rosters, item pics)
    - key: attributes
      type: map<string,string>            # flexible structured fields; empty for pure prose
      examples: { Species, Status, Appearance, Pokemon, Alias }   # Compendium/Objects use these
    - key: order
    - key: status: enum(complete|stub)    # carry "[To be finished.]" honestly
```

Prose books (Story So Far, Book of X) have entries whose `attributes` map is empty.
Structured books (Compendium, Unique Objects) populate `attributes` per entry.

## Known books to migrate (page 1 of index; more gated)

```yaml
retrievable_page_1:
  - Alternate Universe Snagems
  - The Story So Far                       # history
  - Compendium of Entities of Interest     # bestiary (structured)
  - Unique Objects and Items               # item lore (structured)
  - Short Stories                          # to be filed into books later
  - Book of Dark, Book of Normal, Book of Fairy, Book of Water, Book of Psychic,
    Book of Ghost, Book of Dragon, Book of Bug, Book of Poison   # 9 of 18 type books
gap:
  note: >
    Gaia gated index pages 2-3 (start=15 / start=30 returned empty to the fetcher).
    Only 9 of 18 type books are retrievable now. Missing likely: Fire, Grass, Electric,
    Ground, Rock, Flying, Fighting, Ice, Steel. Pull those titles + bodies while logged
    in before final migration.
```

## Page display (what to show)

- Lore landing: shelf of `loreBooks` (cover/title/description).
- Book view: its `loreEntries` in `order`; structured books render the `attributes`
  as a labeled field list, prose books render `body` only.
- Search across entry `title` + `body`. Read-only; editing behind an admin capability.
