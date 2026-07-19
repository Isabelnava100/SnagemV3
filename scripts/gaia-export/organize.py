# Organize the raw Gaia scrape (scripts/gaia-export/raw/*.json) into
# per-member import packets + a gap report:
#
#   scripts/gaia-export/accounts.json  one entry per Gaia member:
#     { gaiaName, rank, snagCoins, snagEmblems, emblemPieces,
#       characters: [{name, age, gender, species, hometown, history, source}],
#       pokemon:    [{raw, species, matched, form, shadow, shiny, gender, character}],
#       items:      [{raw, qty}],
#       threads:    [profile thread ids],
#       gaps:       [human-readable gaps to resolve] }
#   scripts/gaia-export/gap-report.md  summary for admin review
#
# Sources: the "Snagem Member and Pokemon Listing" announcement (t=20806521,
# authoritative for member -> characters -> pokemon + coin counts) merged with
# each member's profile thread (character details, items, history).
#
# Run: python3 scripts/gaia-export/organize.py
import json
import pathlib
import re

HERE = pathlib.Path(__file__).parent
RAW = HERE / "raw"
REPO = HERE.parent.parent

ROSTER_ID = "20806521"
SKIP_IDS = {ROSTER_ID, "24096569", "1893814"}  # roster, template, welcome

# --- species catalog for validation -----------------------------------------
pokemon_json = json.loads((REPO / "src/data/pokemon/pokemon.json").read_text())
KNOWN = {}
for p in pokemon_json.values():
    name = p["name"]["eng"]
    KNOWN[name.lower()] = name

ALIASES = {
    "foretress": "Forretress",
    "pumpkabo": "Pumpkaboo",
    "grovile": "Grovyle",
    "meinshao": "Mienshao",
    "lycanrock": "Lycanroc",
    "drillbur": "Drilbur",
    "floatziel": "Floatzel",
    "klinkklang": "Klinklang",
    "trevanent": "Trevenant",
    "barbaracle": "Barbaracle",
    "mr mime": "Mr. Mime",
    "mime jr": "Mime Jr.",
    "farfetchd": "Farfetch'd",
    "farfetch'd": "Farfetch'd",
    "sirfetchd": "Sirfetch'd",
    "type null": "Type: Null",
    "type: null": "Type: Null",
    "flabebe": "Flabébé",
    "porygon z": "Porygon-Z",
    "ho oh": "Ho-Oh",
    "jangmo o": "Jangmo-o",
    "hakamo o": "Hakamo-o",
    "kommo o": "Kommo-o",
}

FORM_WORDS = {"alolan", "galarian", "hisuian", "paldean", "mega", "female", "male"}
FLAG_WORDS = {"shadow", "shiny", "shadowed"}


def match_species(raw: str):
    """Return (canonicalName|None, form, flags) for one pokemon entry."""
    txt = raw.strip()
    flags = set()
    form = ""
    # Pull out every parenthetical: (Shadow), (Alolan), (Female), (Shiny)...
    for m in re.finditer(r"\(([^)]+)\)", txt):
        for word in re.split(r"[,/&]| and ", m.group(1)):
            w = word.strip().lower()
            if not w:
                continue
            if w in FLAG_WORDS:
                flags.add("shadow" if w == "shadowed" else w)
            elif w in FORM_WORDS:
                if w in ("female", "male"):
                    flags.add(w)
                else:
                    form = w
            else:
                flags.add(f"note:{word.strip()}")
    base = re.sub(r"\([^)]*\)", "", txt).strip()
    # Leading form words outside parens: "Alolan Raticate", "Galarian Weezing"
    parts = base.split()
    if parts and parts[0].lower() in FORM_WORDS - {"female", "male"}:
        form = parts[0].lower()
        base = " ".join(parts[1:])
    key = base.lower().strip(" .")
    name = KNOWN.get(key) or ALIASES.get(key)
    if name is None:
        name = KNOWN.get(ALIASES.get(key, "").lower())
    return name, form, sorted(flags)


# --- roster parsing ----------------------------------------------------------
def parse_roster():
    """The maintained listing: members grouped under rank headers. Later posts
    in the thread are prose delta updates (2023-2026); collected separately."""
    data = json.loads((RAW / f"{ROSTER_ID}.json").read_text())
    members = {}
    updates = []
    rank = ""
    for post in data["posts"]:
        text = post["text"]
        if "Character:" not in text:
            # Prose update posts (coins earned, evolutions, new catches) that
            # were never folded back into the listing.
            if re.search(r"Snag Coins?|Emblem", text, re.I) and len(text) > 300:
                updates.append({"author": post["author"], "posted": post["posted"], "text": text})
            continue
        current = None
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("[img"):
                continue
            m = re.match(r"^•\s*(.+)$", line)
            if m:
                rank = m.group(1).strip()
                continue
            m = re.match(
                r"^(.*?)\s*\[\s*Snag Coins?:\s*([\d,]+)\s*,\s*Snag Emblems?:\s*(\d+)"
                r"(?:\s*,\s*Emblem Pieces?:\s*([\d/]+))?\s*\]",
                line,
            )
            if m:
                gaia = m.group(1).strip()
                current = members.setdefault(
                    gaia,
                    {
                        "gaiaName": gaia,
                        "rank": rank,
                        "snagCoins": int(m.group(2).replace(",", "")),
                        "snagEmblems": int(m.group(3)),
                        "emblemPieces": m.group(4) or "",
                        "characters": [],
                        "pokemon": [],
                        "items": [],
                        "threads": [],
                        "gaps": [],
                    },
                )
                continue
            m = re.match(r"^Character:\s*(.+)$", line, re.I)
            if m and current:
                current["characters"].append(
                    {
                        "name": m.group(1).strip(),
                        "age": "",
                        "gender": "",
                        "species": "",
                        "hometown": "",
                        "history": "",
                        "source": "roster",
                    }
                )
                continue
            m = re.match(r"^Pok[eé]mon:\s*(.+)$", line, re.I)
            if m and current:
                char_name = current["characters"][-1]["name"] if current["characters"] else ""
                # Typo fix first: "(Shadow, )" -> "(Shadow)," so a stray comma
                # inside parens doesn't glue two entries together. Then split on
                # commas that are NOT inside parentheses, so entries like
                # "Electabuzz (Shadow, Shiny)" survive whole.
                cleaned = re.sub(r",\s*\)", "),", m.group(1))
                for raw_entry in re.split(r",(?![^(]*\))", cleaned):
                    raw_entry = re.sub(r"(?i)^\s*but has:\s*", "", raw_entry).strip()
                    if not raw_entry:
                        continue
                    if raw_entry.lower() in ("is one", "none", "n/a"):
                        current["gaps"].append(
                            f'pokemon entry for {char_name or "a character"} says "{raw_entry}" (gijinka?), review by hand'
                        )
                        continue
                    species, form, flags = match_species(raw_entry)
                    current["pokemon"].append(
                        {
                            "raw": raw_entry,
                            "species": species,
                            "matched": species is not None,
                            "form": form,
                            "flags": flags,
                            "character": char_name,
                        }
                    )
    return members, updates


# --- profile thread parsing ---------------------------------------------------
TEMPLATE_FIELDS = ["name", "age", "gender", "species", "hometown"]


def parse_profile_post(text: str):
    """Split one post into character blocks using the template's Name: marker."""
    blocks = []
    idxs = [m.start() for m in re.finditer(r"(?im)^\s*Name:\s*\S", text)]
    for i, start in enumerate(idxs):
        end = idxs[i + 1] if i + 1 < len(idxs) else len(text)
        seg = text[start:end]
        char = {f: "" for f in TEMPLATE_FIELDS}
        char["history"] = ""
        char["items"] = []
        char["coins"] = ""
        char["pokemon_text"] = ""
        for f in TEMPLATE_FIELDS:
            m = re.search(rf"(?im)^\s*{f}:\s*(.+)$", seg)
            if m:
                char[f] = m.group(1).strip()
        m = re.search(r"(?is)Background:\s*(.*?)(?=\n\s*(?:Pok[eé]mon|Items|Snag Coins):|\Z)", seg)
        if m:
            char["history"] = m.group(1).strip()
        m = re.search(r"(?is)^\s*Items:\s*(.*?)(?=\n\s*Snag Coins?:|\Z)", seg[seg.find("Items:") - 1 :] if "Items:" in seg else "", re.M)
        if "Items:" in seg:
            m = re.search(r"(?is)Items:\s*(.*?)(?=\n\s*Snag Coins?:|\n\s*Pok[eé]mon:|\Z)", seg)
            if m:
                items_txt = m.group(1).strip()
                for raw_it in re.split(r"[,\n]", items_txt):
                    raw_it = raw_it.strip(" -•*")
                    if raw_it and len(raw_it) < 80 and raw_it.lower() not in ("none", "n/a"):
                        qm = re.match(r"^(.*?)\s*[x×(]\s*(\d+)\)?$", raw_it)
                        if qm:
                            char["items"].append({"raw": qm.group(1).strip(), "qty": int(qm.group(2))})
                        else:
                            char["items"].append({"raw": raw_it, "qty": 1})
        m = re.search(r"(?im)^\s*Snag Coins?:\s*([\d,]+)", seg)
        if m:
            char["coins"] = m.group(1).replace(",", "")
        m = re.search(r"(?is)Pok[eé]mon:\s*(.*?)(?=\n\s*(?:Items|Snag Coins):|\Z)", seg)
        if m:
            char["pokemon_text"] = m.group(1).strip()[:2000]
        # Everything in the block is worth keeping as profile info.
        char["full_text"] = seg.strip()
        blocks.append(char)
    return blocks


def main():
    members, roster_updates = parse_roster()
    by_lower = {k.lower(): k for k in members}

    # Attach each prose delta update to the member whose characters it names,
    # so their packet carries the un-applied 2023-2026 changes for review.
    for upd in roster_updates:
        hits = set()
        for m in members.values():
            for c in m["characters"]:
                first = c["name"].split()[0] if c["name"] else ""
                if len(first) > 3 and re.search(rf"\b{re.escape(first)}\b", upd["text"]):
                    hits.add(m["gaiaName"])
        for name in hits or set():
            members[name].setdefault("rosterUpdates", []).append(upd)
        if hits:
            for name in hits:
                members[name]["gaps"].append(
                    f"has an un-applied roster update from {upd['posted']} (see rosterUpdates)"
                )

    for f in sorted(RAW.glob("*.json")):
        if f.stem in SKIP_IDS:
            continue
        data = json.loads(f.read_text())
        # Thread author owns the profile; posts by others are guest comments.
        own_posts = [p for p in data["posts"] if p["author"] in (data["author"], "?")]
        gaia_key = by_lower.get(data["author"].lower())
        member = members.get(gaia_key) if gaia_key else None
        if member is None:
            member = members.setdefault(
                data["author"],
                {
                    "gaiaName": data["author"],
                    "rank": "",
                    "snagCoins": None,
                    "snagEmblems": None,
                    "emblemPieces": "",
                    "characters": [],
                    "pokemon": [],
                    "items": [],
                    "threads": [],
                    "gaps": ["not on the member listing (roster)"],
                },
            )
        member["threads"].append(data["id"])
        for post in own_posts:
            for block in parse_profile_post(post["text"]):
                existing = next(
                    (
                        c
                        for c in member["characters"]
                        if c["name"].lower() == block["name"].lower() and block["name"]
                    ),
                    None,
                )
                target = existing
                if target is None and block["name"]:
                    target = {
                        "name": block["name"],
                        "age": "",
                        "gender": "",
                        "species": "",
                        "hometown": "",
                        "history": "",
                        "source": "profile",
                    }
                    member["characters"].append(target)
                if target is None:
                    continue
                for field in ("age", "gender", "species", "hometown"):
                    if block[field] and not target[field]:
                        target[field] = block[field]
                if block["history"] and len(block["history"]) > len(target["history"]):
                    target["history"] = block["history"]
                elif block["full_text"] and not target["history"]:
                    target["history"] = block["full_text"][:4000]
                for it in block["items"]:
                    member["items"].append({**it, "character": target["name"]})

    # --- gaps ---------------------------------------------------------------
    for m in members.values():
        unmatched = [p["raw"] for p in m["pokemon"] if not p["matched"]]
        if unmatched:
            m["gaps"].append(f"unmatched pokemon names: {', '.join(unmatched[:10])}")
        if m["snagCoins"] is None:
            m["gaps"].append("no coin counts (member missing from roster)")
        if not m["characters"]:
            m["gaps"].append("no characters found anywhere")
        if m["pokemon"] and not any(c["history"] for c in m["characters"]):
            m["gaps"].append("no profile thread found (no history/details for characters)")
        if not m["items"]:
            m["gaps"].append("no items found (profile thread missing or has no Items section)")
        no_level = len(m["pokemon"])
        if no_level:
            m["gaps"].append(f"levels not tracked on Gaia: all {no_level} pokemon need a level assigned")

    out = sorted(members.values(), key=lambda m: (m["rank"] == "", m["gaiaName"].lower()))
    (HERE / "accounts.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))

    # --- report -------------------------------------------------------------
    lines = ["# Gaia export gap report", ""]
    total_pk = sum(len(m["pokemon"]) for m in out)
    matched_pk = sum(1 for m in out for p in m["pokemon"] if p["matched"])
    lines.append(
        f"{len(out)} members, {sum(len(m['characters']) for m in out)} characters, "
        f"{total_pk} pokemon ({matched_pk} matched to the dex), "
        f"{sum(len(m['items']) for m in out)} item stacks."
    )
    lines.append("")
    for m in out:
        lines.append(f"## {m['gaiaName']}  ({m['rank'] or 'no rank'})")
        lines.append(
            f"- coins {m['snagCoins']}, emblems {m['snagEmblems']}, pieces {m['emblemPieces'] or '-'}"
        )
        lines.append(
            f"- {len(m['characters'])} characters, {len(m['pokemon'])} pokemon, {len(m['items'])} item stacks"
        )
        for c in m["characters"]:
            has = "history" if c["history"] else "NO history"
            lines.append(f"  - {c['name']} ({c['source']}, {has})")
        for g in m["gaps"]:
            lines.append(f"- GAP: {g}")
        lines.append("")
    (HERE / "gap-report.md").write_text("\n".join(lines))
    print(f"{len(out)} members -> accounts.json + gap-report.md")


main()
