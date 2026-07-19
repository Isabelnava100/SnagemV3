# Scrape the Team Snagem guild's Member Profiles board (public pages) into
# raw JSON, one file per thread: scripts/gaia-export/raw/<topicId>.json with
# {id, title, author, posts: [{author, posted, text}]}.
#
# Guild threads are publicly readable, so this needs no login. Run:
#   python3 scripts/gaia-export/scrape.py
# Re-running refetches everything (data changes rarely; the guild is archived).
import html as htmllib
import json
import pathlib
import re
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).parent
RAW = HERE / "raw"
RAW.mkdir(exist_ok=True)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) SnagemGuildArchiver/1.0"
POSTS_PER_PAGE = 15

# id | title | author  (harvested from the board index, Feb 2012 - Feb 2026)
THREADS = """
20806521|Snagem Member and Pokemon Listing (Updated: 9/12/2022)|SubonicXP
24096569|Profile Template|SubonicXP
25681500|Ancient one Zane|Zane Belazarus
25675314|Hanabi's Dreams|Ulla_Hanabi
24958763|Goken Chain of Souls|TerashiLeonGoken
25435818|Dragon's Characters|DragonFang099
25603284|Jean Beaumont|HauntMyCroissant
25260147|~`Surrender to the Song`~ V2|Requiem of Whyspers
22710473|The Vantas Hall of Misfits|Reno Vantas
25559028|Monique Ka'ana'ana|MoniqueBrie
25579368|Clara Devict ~ Nerdy Bean|KomradeKarina
25566648|Lancaster|nahobinokami
22847583|Nami's Doghouse|Not a Noise
25517247|Katie|Jay Angel Of Darkness
25490181|DeoLux|DeoLux
21152789|Veronica Nova|DignityPower
25377144|Kanna's Lovelies|kanna2012
25368444|Chiara Marzo|Socordiasomnia
19999847|Profile of the Dark One|SubonicXP
25248667|Ulla's Treehouse|Cecile Silverstone
16128761|Cold One's Profile|Blizzard120
25261725|Geoffrey Meuller|-l- JoltiBun -l-
23266169|The Sun and the Desert Rose|Espeon_Commander
25259181|Royal Ass of Alola|-l- JoltiBun -l-
25203675|Tainted's Character|Tainted Blonde
25161243|Mirepoix|Ms Edyn
24542843|Fox and the Hound|Arkelos
25036643|Jakob Hollway|Hauntedflames
25032087|Rein's Mischief|-l- JoltiBun -l-
25018675|Pixel's Charas|Pixelsylveon
24991325|MisfortuneGB's Profiles|Local Imp
21500271|Youko Kenshi's Profiles|DragonYolk
24910209|Chiasa Addams|avem xxvii
24902101|Arwan|emensmansera
24878751|Amity Keller|manglewren
24866537|Morgan Dulac|A Scarecrow
24851951|Ryssa's Character: Sheeta Melian|Ryssa Blackblood
24822287|Jezebel Pyrewood (WIP)|Arkelos
24574095|Tsuki's losers <3|Tsuki the Fated Wind
24762339|Rein Kisaragi|Mournings of a Incubus
24503905|Sihlo|Ms Edyn
24667025|Maximillian Fritz|forkcity
24653345|Raelynd Gunner|Rae Guns
24647793|Samuel Hamilton|Deviled Dregs
24520357|S i l i c a|KiIala
24543525|Morgan Arthur|prinxe shadow
24554803|Carter Ai|sintaurs
24554121|Madeye's Misfit|swarm0fbees
24543691|Seth, Redeemed|Michael Bladebreaker
24165387|Darts' Profile|Atlantis_Darts
24509527|Hacker of Lavender|CrystalizedMagic
24508823|A Brilliant Loser's Loser|Feather Weather
24484513|Sarge's Characters|NotAnUndercoverCop
24468329|The names Gio|Koukaze
6229897|Sunday's (Newish) Profile o:|Thursdays Noon
24248915|Royce Siegman|TheRangaTan
24117759|Isaac Hawking's Profile|Isaac Hawking
24113311|Darksol88's Profile|Darksol88
13829035|Night|Ms Edyn
11687677|Rexy's Profile|Not a Noise
19477457|Eve|Ms Edyn
""".strip()


def fetch(url: str) -> str:
    # curl instead of urllib: the local python install lacks CA certificates.
    res = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-H", f"User-Agent: {UA}", url],
        capture_output=True,
        check=True,
    )
    return res.stdout.decode("utf-8", errors="replace")


def strip_html(fragment: str) -> str:
    """postcontent HTML -> readable text, keeping line structure."""
    text = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    text = re.sub(r"</(p|div|tr|li|h\d)>", "\n", text, flags=re.I)
    text = re.sub(r"<img[^>]*alt=\"([^\"]*)\"[^>]*>", r"[img:\1]", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = htmllib.unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def balanced_div(hay: str, open_idx: int) -> str:
    """Return inner HTML of the div whose '<div' starts at open_idx."""
    depth = 0
    i = open_idx
    start = hay.index(">", open_idx) + 1
    for m in re.finditer(r"<div\b|</div>", hay[open_idx:]):
        if m.group(0) == "</div>":
            depth -= 1
            if depth == 0:
                return hay[start : open_idx + m.start()]
        else:
            depth += 1
    return hay[start:]


def parse_posts(page_html: str):
    posts = []
    # Ordered scan: author markers (styled name div, or the avatar img alt as
    # the fallback since not every post variant renders the name div), posted
    # stamps, content divs.
    tokens = []
    for m in re.finditer(r"class='user_name'\s+style=\"padding[^\"]*\"><BR>(.*?)</div>", page_html):
        tokens.append((m.start(), "author", htmllib.unescape(m.group(1)).strip()))
    for m in re.finditer(r"alt=\"([^\"]+)'s avatar\"", page_html):
        tokens.append((m.start(), "author", htmllib.unescape(m.group(1)).strip()))
    for m in re.finditer(r'class="postdetails">Posted: ([^<]+)<', page_html):
        tokens.append((m.start(), "posted", m.group(1).strip()))
    # Two content skins exist: the speech-bubble one ("content postcontent")
    # and the plain one ("postcontent", which nests a second postcontent div;
    # keep only the outermost of overlapping matches).
    covered_to = -1
    for m in re.finditer(r'<div class="(?:content )?postcontent">', page_html):
        if m.start() < covered_to:
            continue
        inner = balanced_div(page_html, m.start())
        covered_to = m.start() + len(inner)
        tokens.append((m.start(), "content", inner))
    tokens.sort(key=lambda t: t[0])
    current: dict = {}
    for _, kind, value in tokens:
        if kind == "author":
            if "text" not in current:
                current["author"] = value
        elif kind == "posted":
            current["posted"] = value
        elif kind == "content":
            current["text"] = strip_html(value)
            posts.append(
                {
                    "author": current.get("author", "?"),
                    "posted": current.get("posted", ""),
                    "text": current["text"],
                }
            )
            current = {}
    return posts


def max_page(page_html: str) -> int:
    # Pager hrefs are HTML-encoded (&amp;page=N) so match loosely; clamp to a
    # sane ceiling in case an unrelated link carries a page param.
    nums = [int(m.group(1)) for m in re.finditer(r"page=(\d+)", page_html)]
    nums = [n for n in nums if n <= 500]
    return max(nums) if nums else 1


def scrape_thread(tid: str, title: str, author: str) -> dict:
    # Guild threads paginate with page=N. The pager count comes from the stored
    # reply count, which includes long-deleted posts, so pages can be sparse or
    # even empty in the middle; walk every page to the pager max.
    posts = []
    first = fetch(f"https://www.gaiaonline.com/guilds/viewtopic.php?t={tid}&page=1")
    posts.extend(parse_posts(first))
    pages = max_page(first)
    for page_no in range(2, pages + 1):
        page = fetch(f"https://www.gaiaonline.com/guilds/viewtopic.php?t={tid}&page={page_no}")
        posts.extend(parse_posts(page))
        time.sleep(0.4)
    return {"id": tid, "title": title, "author": author, "posts": posts, "pages": pages}


def main():
    rows = [line.split("|") for line in THREADS.splitlines()]
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for n, (tid, title, author) in enumerate(rows, 1):
        if only and tid != only:
            continue
        out = RAW / f"{tid}.json"
        data = scrape_thread(tid, title, author)
        out.write_text(json.dumps(data, ensure_ascii=False, indent=1))
        print(f"[{n}/{len(rows)}] {tid} {title!r}: {len(data['posts'])} posts")
        time.sleep(0.4)


main()
