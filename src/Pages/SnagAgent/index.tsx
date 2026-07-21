import {
  Anchor,
  Avatar,
  Box,
  Button,
  Container,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import React from "react";
import { Link } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { useAuth } from "../../context/AuthContext";
import { SnagIcon } from "../../icons/SnagIcon";
import { isAdmin } from "../../lib/permissions";
import {
  SNAG_TASKS,
  SnagTask,
  currentWeekId,
  getSnagList,
  resetCountdown,
} from "../../queries/activities";
import { getChallengeProgress, getGymRegions } from "../../queries/challenges";

/**
 * S.N.A.G., the guild's help device. A self-contained FAQ/SOP chat: it
 * answers "where do I find X / how does Y work" from a built-in knowledge
 * base, checks the member's own progress for personal questions (weekly Snag
 * List, badge runs), and takes suggestions / bug reports / open questions as
 * tickets for the staff Dev Board. It is intentionally NOT connected to any
 * external AI: what it cannot answer it offers to send to the staff.
 */

type Msg = { from: "user" | "snag"; node: React.ReactNode };
type Intake = "suggestion" | "bug" | "question" | null;

const TASK_LABEL: Record<SnagTask, string> = {
  battle: "win a Colosseum battle",
  casino: "play a Casino game",
  post: "publish a forum post",
  catch: "catch a pokemon",
  activity: "join a mission or event",
  mall: "buy or recycle at the Mall",
};

function L(props: { to: string; children: React.ReactNode }) {
  return (
    <Anchor component={Link} to={props.to} c="blue.3" fz="inherit">
      {props.children}
    </Anchor>
  );
}

/** One knowledge entry: patterns + an answer builder (may fetch data). */
interface KbEntry {
  match: RegExp;
  answer: (ctx: {
    uid: string | null;
    admin: boolean;
    text: string;
  }) => Promise<React.ReactNode> | React.ReactNode;
}

const KB: KbEntry[] = [
  {
    // Admin SOP: where tools live. Checked before generic "where is" rules.
    match: /safari\s*contest|launch.*safari|safari.*launch/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Safari Contests are configured and launched from{" "}
          <L to="/Admin">Admin &gt; Manage &gt; Game Content &gt; Safari Contest</L>: set the
          star pools and rates, then Save &amp; Launch to open the thread composer in
          Safari mode.
        </>
      ) : (
        <>
          Safari Contests are staff-launched events. When one is live you will find its
          thread in the <L to="/Forum/Events">Events forum</L>: roll an encounter there,
          then fight, feed, or throw a ball each post.
        </>
      ),
  },
  {
    // New-member setup: the three-step gate before posting (July 2026).
    match: /starter|first pokemon|getting started|new (member|user|trainer)|before.*post|set.*up.*account|can.?t.*post/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          New members set themselves up: the dashboard welcome checklist walks them
          through creating a character, claiming a one-time starter (any 1★ species or a
          classic starter, only while they own zero pokemon), and building a team. The
          forum refuses posts until all three are done (server-enforced). Admins can
          still grant extra pokemon via <L to="/Admin">Admin</L> tools; approving an
          applicant no longer grants anything by itself.
        </>
      ) : (
        <>
          Before your first post you need three things, and your{" "}
          <L to="/Dashboard">Console dashboard</L> checklist walks you through them:
          create a character, claim your free starter (any 1★ species or a classic
          starter), and build a team with at least one pokemon. After that, every post
          brings a character and their team, and the team earns experience as you
          roleplay.
        </>
      ),
  },
  {
    // Returning Gaia members: the import/onboarding flow.
    match: /gaia|import|returning|restore.*collection|old (account|profile)/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Returning Gaia members self-serve on the <L to="/Onboarding">Onboarding page</L>:
          the guild&apos;s old Member Profiles board was exported, so they can prefill
          their draft (characters, pokemon, items, coins, emblems) from their Gaia
          account, then submit. Review submissions from <L to="/Admin">Admin</L>: items
          without a catalog match and un-applied roster updates arrive in the reviewer
          note. Approvals grant server-side.
        </>
      ) : (
        <>
          Returning from the Gaia guild? The <L to="/Onboarding">Onboarding page</L> can
          prefill your import from your old Gaia profile: pick your Gaia account and it
          fills in your characters (with their history), pokemon, items, coins and
          emblems. Review everything, adjust, then submit; a staff member approves it
          and it all lands in your account.
        </>
      ),
  },
  {
    // Encounter lists / Field Registers, including the 4-star rarity rule.
    match: /encounter list|field register|region list|rare.*encounter|4.?\s*star.*(rate|rare)|adjust list/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Encounter lists are managed in <L to="/Dashboard">Dashboard</L> &gt; Admin &gt;
          Adjust Lists: the Public checkbox decides whether every member can pick a list
          when creating a thread (admins see private lists too). Default public lists
          exist per region and habitat (Grasslands, Mountains, Rivers, Cities; 1-4★
          only). Rolled encounters are star-weighted: 4★+ species on a list appear on 5%
          of rolls. Members browse public lists in{" "}
          <L to="/Library?tab=lists">Library &gt; Field Registers</L>.
        </>
      ) : (
        <>
          Encounter lists decide which wild pokemon a thread can roll. Browse the public
          ones (each region has Grasslands, Mountains, Rivers and Cities lists) in{" "}
          <L to="/Library?tab=lists">Library &gt; Field Registers</L>; pick one when you
          create a thread. Rare pulls are real: 4★ species only appear on about 5% of
          rolls.
        </>
      ),
  },
  {
    // Registration and manual verification.
    match: /verif|application|register|sign.?up|join.*guild|new.*account|approv.*(member|registration|application|account)/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Applications queue in <L to="/Admin">Admin &gt; Inbox</L>: every registration
          is verified manually (pick a role, approve or reject). Applicants see a
          &quot;checked manually by an admin&quot; notice if they try to log in early.
          Approving creates their member account; they then run the new-member
          checklist themselves (character, starter, team).
        </>
      ) : (
        <>
          Every registration is checked manually by an admin, so there is a short wait
          between applying and your first login. You will get a notification when you
          are approved. Waiting on a friend&apos;s application? Tell them to watch
          their email for the verification link first.
        </>
      ),
  },
  {
    // Currencies.
    match: /\bcoins?\b|currency|emblem|gengar token/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Currencies: Snag Coins (missions, events, reward reviews), Gengar Tokens
          (Casino play), Snag Emblems and emblem pieces (mission bonuses; three pieces
          make an emblem). Grant any of them from <L to="/Admin">Admin</L> &gt; Give
          Items. Gaia imports carry Snag Coins, emblems and pieces straight over.
        </>
      ) : (
        <>
          Your balances show on the <L to="/Dashboard">Console dashboard</L>: Snag Coins
          (earned in missions, events and reward reviews; spent at the{" "}
          <L to="/Shop">Snag Mall</L>), Gengar Tokens (<L to="/Casino">Casino</L>), and
          Snag Emblems with emblem pieces (mission bonuses; three pieces become an
          emblem).
        </>
      ),
  },
  {
    match: /master\s*mission|hybrid|channeler|clearance/i,
    answer: () => (
      <>
        Master Missions are the endgame progression for Hybrids and Channelers. The
        path: (1) request master clearance for a character from the{" "}
        <L to="/Research">Research page</L> (an admin approves it and your character
        joins a Division); (2) run Master Missions from the{" "}
        <L to="/Forum/Master-Mission">Master Missions forum</L>, each grant teaches an
        ability, up to 10 per type; (3) completing the 10th makes you a Grand Master and
        unlocks Mega Evolution and Z-Move access on the Research tracker. Master-tier
        missions in the <L to="/Missions">Mission Vault</L> also need a cleared
        character. E.V.O. services at the <L to="/Shop">Snag Mall</L> (slots, moves,
        adaptations) are for cleared Masters too. Background:{" "}
        <L to="/Library?tab=forums">Library &gt; The Charter</L>.
      </>
    ),
  },
  {
    match: /notif|mute|silence|turn (off|on).*(ping|alert)|disable.*(ping|alert|discord)|enable.*(ping|alert|discord)|settings.*(alert|ping)|stop.*(ping|nagging)/i,
    answer: () => (
      <>
        Every notification switch lives in{" "}
        <L to="/Dashboard/Settings">Console &gt; Settings &gt; Notifications</L>:
        on-site notifications (the master switch), Discord pings (channel pings, never a
        DM; needs your Discord linked on the same page), new posts on bookmarked
        threads, direct @-pings, and the Monday weekly reset reminder. Everything
        defaults ON except Discord. Flip any of them off and that kind stops
        immediately.
      </>
    ),
  },
  {
    match: /next for me|what should i do|now what|what.*do (today|this week)|bored\b|my goals?|roadmap|progression path|how.*progress/i,
    answer: () => (
      <>
        A good ladder: (1) finish the starter checklist on your{" "}
        <L to="/Dashboard">Console</L> (character, pokemon, team); (2) pick up an easy
        mission from the <L to="/Missions">Mission Vault</L> and roleplay it out; (3)
        keep the weekly loop going on the <L to="/Activities">Activities page</L> (Snag
        List, Berry Farm, Fishing Pond); (4) chase badges and trials on{" "}
        <L to="/Challenges">Challenges</L>; (5) trade and breed to fill your{" "}
        <L to="/Library?tab=pokedex">Pokedex collection</L>; (6) endgame: master
        clearance and Grand Master on the <L to="/Research">Research page</L>. Your
        dashboard&apos;s &quot;Needs your attention&quot; panel always shows what is
        waiting right now.
      </>
    ),
  },
  {
    match: /craft|alchemy|recipe|cauldron|brew/i,
    answer: () => (
      <>
        Ambrosial Alchemy in the <L to="/Shop">Snag Mall</L> is the crafting cauldron:
        every recipe lists its ingredients (with how many you have), any coin cost, and
        a success rate. Failed brews still spend the ingredients, so read the rate
        before you commit. Your bag on the <L to="/Dashboard">Console</L> shows where
        to get more of an ingredient under each item.
      </>
    ),
  },
  {
    match: /casino|roulette|dice|lotto|gamb|jackpot/i,
    answer: () => (
      <>
        The <L to="/Casino">Casino</L> runs on Gengar Tokens. Hex Roulette: pick 1-36,
        win pays 5.5x your bet. Dream Dice: predict the 2d6 total, pays 2x (3x on
        doubles), bets 1-5. Shadow Lotto: 1 token a ticket, pick 1-50, the pot splits
        among matching tickets when staff run the weekly draw. Playing any game checks
        off your Snag List casino task.
      </>
    ),
  },
  {
    match: /red dot|badge.*menu|needs.*attention|what.*waiting|attention panel/i,
    answer: () => (
      <>
        The red dot on the Menu button means something is waiting on you: a hatchable
        Daycare egg, an unused weekly cast, an unclaimed Mystery Box, open offers on
        your trade listings, or an open mission thread. The full list with links sits at
        the top of your <L to="/Dashboard">Console</L> as &quot;Needs your
        attention&quot;.
      </>
    ),
  },
  {
    match: /caught|collection|complet.*dex|silhouette|how many pokemon/i,
    answer: () => (
      <>
        The <L to="/Library?tab=pokedex">Library Pokedex</L> doubles as your collection
        tracker when signed in: a caught counter, silhouettes for species you do not
        own yet, and a &quot;Caught only&quot; filter. Fill it through encounters,
        fishing, tours, trades, breeding and mission rewards.
      </>
    ),
  },
  {
    match: /search|find.*(thread|post|lore)|where.*thread.*about/i,
    answer: () => (
      <>
        Forum search sits on the <L to="/Forum">Forums page</L> hero: it matches thread
        titles, creators and tags, and a &quot;Search all categories&quot; toggle sweeps
        every board you can read at once. The{" "}
        <L to="/Library?tab=lore">Lore Library</L> has its own search across book and
        entry text. Threads also have a Copy Link button for sharing.
      </>
    ),
  },
  {
    match: /weekly|snag\s*list|snag\s*box|missing.*reward|reward.*missing/i,
    answer: async ({ uid }) => {
      if (!uid) {
        return (
          <>
            Sign in and I can check your week. The weekly Snag List lives on the{" "}
            <L to="/Activities">Activities page</L>: six tasks, reset every Monday.
          </>
        );
      }
      const list = await getSnagList(uid);
      const fresh = list.weekId === currentWeekId() ? list : {};
      const missing = SNAG_TASKS.filter((t) => !fresh.tasks?.[t]);
      if (!missing.length) {
        return (
          <>
            Your Snag List is complete this week{fresh.boxClaimed ? " and the box is claimed" : ""}!{" "}
            {fresh.boxClaimed ? (
              "New tasks arrive Monday."
            ) : (
              <>
                Claim your weekly box on the <L to="/Activities">Activities page</L>.
              </>
            )}
          </>
        );
      }
      return (
        <>
          You still need to: {missing.map((t) => TASK_LABEL[t]).join(", ")}. The week
          resets in {resetCountdown()}. Track it on the{" "}
          <L to="/Activities">Activities page</L>. Want a Monday reset ping? Turn on the
          weekly reminder in <L to="/Dashboard/Settings">Settings &gt; Notifications</L>.
        </>
      );
    },
  },
  {
    match: /next\s*badge|badge.*(kanto|johto|hoenn|sinnoh|unova|kalos|galar|paldea|alola)|(kanto|johto|hoenn|sinnoh|unova|kalos|galar|paldea|alola).*badge/i,
    answer: async ({ uid, text }) => {
      if (!uid) {
        return (
          <>
            Sign in and I can check your badge case. Badge runs live on the{" "}
            <L to="/Challenges">Challenges page</L>.
          </>
        );
      }
      const [regions, progress] = await Promise.all([
        getGymRegions(),
        getChallengeProgress(uid),
      ]);
      const wanted = regions.find((r) =>
        text.toLowerCase().includes(String(r.name ?? r.id).toLowerCase())
      );
      const region = wanted ?? regions[0];
      if (!region) {
        return (
          <>
            No gym regions are configured yet; check the{" "}
            <L to="/Challenges">Challenges page</L>.
          </>
        );
      }
      const earned = new Set(progress.badges?.[region.id] ?? []);
      const next = [...(region.gyms ?? [])]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .find((g) => !earned.has(g.leaderName));
      return next ? (
        <>
          In {region.name}: you hold {earned.size}/{(region.gyms ?? []).length} badges. Your
          next battle is {next.leaderName}
          {next.type ? ` (${next.type} gym)` : ""}. Request it from the{" "}
          <L to="/Challenges">Challenges page</L>.
        </>
      ) : (
        <>
          You have every {region.name} badge ({earned.size}/{(region.gyms ?? []).length}).
          Pick another region on the <L to="/Challenges">Challenges page</L>.
        </>
      );
    },
  },
  {
    match: /trade|trading|swap|listing|offer.*pokemon|pokemon.*offer/i,
    answer: () => (
      <>
        The <L to="/Trading">Trading Post</L> is the only way a pokemon changes trainers:
        put one on the board with what you would accept in return, or make an offer on
        someone else&apos;s listing (you get a notification when offers land, and when a
        listing you offered on is taken down). Your &quot;wants&quot; can name species,
        types, a minimum level and star, a nature, a gender, or shiny-only; they are
        advisory: the picker warns when an offer misses them, but the owner decides. Use the
        &quot;Wants what I have&quot; filter to see listings your box can satisfy. A
        pokemon battling on a locked team, or paired at the Daycare with an egg on the
        way, stays untradable until that ends. You can also move pokemon freely between
        your OWN characters there.
      </>
    ),
  },
  {
    match: /breed|daycare|egg group|hatch|egg\b/i,
    answer: () => (
      <>
        The <L to="/Daycare">Daycare</L> takes one pair at a time: one male and one
        female sharing an egg group, or ANYTHING paired with a Ditto (species with no
        egg group breed only with Ditto). Only 7-star legendaries and mythicals can
        never breed. The egg hatches into the base form of the mother&apos;s line after
        the configured days or posts, whichever comes first, and both parents are
        untradable until you collect it. When the egg is ready, your dashboard&apos;s
        &quot;Needs your attention&quot; panel tells you. Egg groups show on each
        pokemon&apos;s info box in your <L to="/Dashboard">Console</L>.
      </>
    ),
  },
  {
    match: /fish|rod|pond|angler/i,
    answer: () => (
      <>
        The Fishing Pond is a weekly activity, and a rod is required to cast. Earn your
        first Old Rod from the <L to="/Missions/rod-thief">Rod Thief mission</L> or buy
        one at the <L to="/Shop">Snag Mall</L>, then head to the pond from the{" "}
        <L to="/Activities">Activities page</L>. One cast per week with the character of
        your choice; a better rod means better bites (the Super Rod even lands a 5% 4★
        bite), and releasing your catch pays 1 Snag Coin. The pond thread is
        fishing-only. Odds table:{" "}
        <L to="/Library?tab=battle">Library &gt; The War Room</L>.
      </>
    ),
  },
  {
    match: /berry|farm|plant|harvest/i,
    answer: () => (
      <>
        The Berry Farm lives on the <L to="/Activities">Activities page</L>: plant a bag
        berry in an open plot and harvest a bigger yield after it grows (about a week by
        default). Harvesting counts as your weekly activity task.
      </>
    ),
  },
  {
    match: /held item|hold item|leftovers|muscle band|assault vest|focus sash|lucky egg|quick claw|shell bell/i,
    answer: () => (
      <>
        Held items equip from your <L to="/Dashboard">Console&apos;s</L> pokemon box
        (Held item, in each pokemon&apos;s details). The battle set: Muscle Band,
        Assault Vest, Leftovers, Shell Bell, Focus Sash, Quick Claw and Lucky Egg; exact
        numbers are in <L to="/Library?tab=battle">Library &gt; The War Room</L>.
      </>
    ),
  },
  {
    match: /pokemon center|nurse|heal.*team|center.*visit/i,
    answer: () => (
      <>
        Mid-thread you can spend a POST visiting the Pokemon Center (no coins). It opens
        after one battle-free post with no live encounter or boss, and heals ONLY the
        team the visiting character brings on that post (wounds from that thread only).
        That one character sits out of battles for the visit post and their next one;
        your other characters are unaffected. Details:{" "}
        <L to="/Library?tab=battle">Library &gt; The War Room</L>.
      </>
    ),
  },
  {
    match: /\bnatures?\b/i,
    answer: () => (
      <>
        Every pokemon has one of 25 natures, shown on its info box in your{" "}
        <L to="/Dashboard">Console</L>. Attack natures hit harder, defense natures take
        hits better, speed natures escape easier, neutral ones do nothing. The full list
        and numbers live in <L to="/Library?tab=battle">Library &gt; The War Room</L>.
      </>
    ),
  },
  {
    match: /weather|\brain\b|sandstorm|sunlight|\bsnow\b/i,
    answer: () => (
      <>
        Thread weather (sun, rain, sandstorm, snow) boosts favored attacker types and
        weakens the rest. Hosts set it at creation and can retune it any time from the
        Host Menu. Numbers: <L to="/Library?tab=battle">Library &gt; The War Room</L>.
      </>
    ),
  },
  {
    match: /rematch|elite four ladder|fight.*leader.*again/i,
    answer: () => (
      <>
        Beaten a gym leader? The Rematch Ladder on the{" "}
        <L to="/Challenges">Challenges page</L> lets you challenge them again, tier
        after tier, each round about a star tougher. Staff host the thread like a normal
        gym run.
      </>
    ),
  },
  {
    match: /requirement|what.*missing|close.*thread|mission target|finish.*mission/i,
    answer: () => (
      <>
        Every mission thread pins a Mission Targets checklist at the top showing which
        set foes are beaten and which remain; the thread cannot close for grading until
        all are down. You can repeat a mission after finishing it, but only one open
        run of the same mission at a time (different missions can run side by side).
        Closing the thread files it for grading automatically; coins match the brief
        and any promised special item (like the Rod Thief&apos;s Old Rod) is granted on
        approval. Open your thread and check the banner, or see{" "}
        <L to="/Library?tab=battle">Library &gt; The War Room</L> for how beating foes
        works.
      </>
    ),
  },
  {
    // Picking up and running a normal mission (Master Missions handled above).
    match: /mission|\bquest\b|mission vault|take on a job|job board|pick up.*(job|mission)/i,
    answer: () => (
      <>
        You take on missions at the <L to="/Missions">Mission Vault</L>: pick up a job and
        it opens your own roleplay thread in the Quests forum. Play it out post by post,
        beating any required encounters along the way; base pay is Snag Coins and the
        grader tips extra for good writing. Closing the thread grades it automatically, so
        there is no separate submission to send. Hybrid and Channeler jobs are their own
        track: those are Master Missions.
      </>
    ),
  },
  {
    // Casino + Shadow Lotto. Kept ahead of the shadow-pokemon rule so
    // "shadow lotto" resolves here.
    match: /casino|gambl|\blotto\b|lottery|roulette|\bdice\b|payback|jackpot|wager|ghastly/i,
    answer: () => (
      <>
        The <L to="/Casino">Casino</L> (Darts&apos; Ghastly Gambling) runs on Gengar
        Tokens: trade Snag Coins for tokens at the counter, then wager them on Hex
        Roulette, Dream Dice, Payback Pyramid, or buy into the Shadow Lotto draw. Every
        roll is server-side and final. Snag Coins come from missions, events and reward
        reviews; Gengar Tokens only spend here.
      </>
    ),
  },
  {
    // What Shadow pokemon are and how purification works.
    match: /shadow|purif|hyper mode|vaccine|cipher/i,
    answer: () => (
      <>
        Shadow pokemon are pokemon whose hearts have been forced shut, turning them into
        cold fighting tools. On a normal thread each of your team pokemon has a small
        chance to turn Shadow as you post; once one is Shadow&apos;ed it earns Purification
        instead of experience, and filling that bar to 100 lifts the shadow for good. Want
        it gone sooner? A Shadow Vaccine item clears it on the spot. The full stat scale
        and shadow or purification odds are in{" "}
        <L to="/Library?tab=shadow">Library &gt; the shadow guide</L>.
      </>
    ),
  },
  {
    // Manual evolution: level / friendship / item, plus evolve-on-publish.
    // Kept ahead of the experience rule so "evolve" beats "level".
    match: /\bevol|final (form|stage)|\bevo\b|(fire|water|thunder|leaf|moon|sun|ice|dusk|dawn|shiny|oval) ?stone/i,
    answer: () => (
      <>
        You evolve pokemon yourself from your{" "}
        <L to="/Dashboard/Pokemon">Console pokemon box</L>: open a pokemon and hit Evolve
        (the button also appears in the post composer and drafts), and each branch lists
        what it still needs. Three routes: reach the required level (levels come from
        experience), max friendship to 100, or spend the matching evolution item (a Fire
        Stone and the like, sold at the <L to="/Shop">Snag Mall</L>). You can also evolve
        one team pokemon the moment you publish a forum post. Per-species methods show in
        the <L to="/Library">Library</L> Pokedex.
      </>
    ),
  },
  {
    // Snagging/catching a beaten wild. Kept ahead of the broad battle rule.
    match: /\bcatch(ing)?\b|capture|poke ?ball|great ball|ultra ball|master ball|which ball|throw.*ball|snag.*(pokemon|wild|mon)\b/i,
    answer: () => (
      <>
        Snagging a wild pokemon happens in battle: once an encounter&apos;s health bar is
        fully drained it counts as beaten, and on that post you can throw a ball to catch
        it. Your odds are the ball&apos;s tier plus a worn-down bonus for beating it first
        (capped at 95%, and a Master Ball never fails); a miss spends the ball but the
        pokemon stays beaten, so you can try again next post. Most catching happens on
        missions and events that allow capture, and at the weekly Fishing Pond. Ball tiers
        and the full odds table:{" "}
        <L to="/Library?tab=battle">Library &gt; The War Room</L>.
      </>
    ),
  },
  {
    // How members earn experience (level-based progression, awarded per post).
    // Kept ahead of the broad battle rule so "level up" resolves here.
    match: /experience|\bexp\b|\bxp\b|level ?up|levell?ing|grind|\btrain(ing)?\b/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Members earn experience automatically: every qualifying forum post grants each
          locked-team pokemon its per-post experience (alongside friendship and shadow or
          purification rolls), applied the moment the post publishes. Tune the per-post
          amounts and the level curve in{" "}
          <L to="/Admin">Admin &gt; Manage &gt; Game Balance &gt; XP &amp; Leveling</L>.
          Threads flagged no-experience award none, Shadow pokemon gain purification
          instead, and reviewers can add bonus team XP at thread close.
        </>
      ) : (
        <>
          You earn experience just by roleplaying: every qualifying post on a normal
          thread (missions, events, or open roleplay) automatically gives each pokemon on
          your locked team experience, so they level up as you play. For focused grinding,
          the <L to="/Colosseum">Super Training Room</L> in the Colosseum logs training
          posts against one target pokemon. Two exceptions: a host can flag a thread
          &quot;no experience,&quot; and a Shadow pokemon gains purification instead until
          it is cured. Full breakdown:{" "}
          <L to="/Library?tab=battle">Library &gt; The War Room</L>.
        </>
      ),
  },
  {
    // Battle staff: hosting, boss battles, enabling battle mode. Kept ahead of
    // the generic battle rule so host/boss phrasing resolves here.
    match: /battle staff|manage ?battles|boss battle|host (a |the )?(thread|battle|fight)|host menu|battle mode|run (a )?(gym|boss)/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Battle staff (admins and holders of the ManageBattles capability) can switch a
          thread into battle mode and get Host Menu access on ANY thread: boss battles,
          thread weather, and Safari judging. Grant the capability in{" "}
          <L to="/Admin">
            Admin &gt; Manage &gt; Members &amp; Access &gt; Roles &amp; Permissions
          </L>
          , then open a thread&apos;s Host Menu from its tools. The rules matrix is in{" "}
          <L to="/Library?tab=forums">Library &gt; The Charter</L>.
        </>
      ) : (
        <>
          Boss battles and battle mode are run by battle staff (admins or members granted
          the ManageBattles role): they host the fight, set the weather, and judge Safari.
          On a thread you host you will see the Host Menu in its tools. How the fights
          resolve is in <L to="/Library?tab=battle">Library &gt; The War Room</L>.
        </>
      ),
  },
  {
    match: /battle|damage|effectiv|type chart|health|hp|faint|\bstars?\b|flee|run away|potion|revive/i,
    answer: () => (
      <>
        The whole battle system (stars, posts to beat, damage, HP, healing items,
        run-away odds, and the type chart) is written up in{" "}
        <L to="/Library?tab=battle">Library &gt; The War Room</L>. Quick version: your
        pokemon strikes first, enemies deal flat star-based damage to your chosen
        fighter, and type matchups scale both directions between x0.5 and x2.
      </>
    ),
  },
  {
    // Competitive rankings ladder + Hall of Fame (Colosseum).
    match: /ranking|leaderboard|\bstanding|hall of fame|champion|competitive/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          The competitive ladder is the Rankings tab of the <L to="/Colosseum">Colosseum</L>,
          fed by battle results (defeat a pokemon +1, your pokemon survives +1, win +3, beat
          the champion +5, upset +0.4 per rank gap, tournament win +10). You can also award
          ranking points by hand in{" "}
          <L to="/Admin">Admin &gt; Manage &gt; Members &amp; Access &gt; Battle &amp; Challenge</L>.
          Tournament champions are enshrined on the Hall of Fame tab.
        </>
      ) : (
        <>
          The <L to="/Colosseum">Colosseum</L> Rankings tab is the competitive ladder:
          battling scores points (defeating a foe, surviving, winning and beating a champion
          all count, upsets score extra, and a tournament win is worth the most), and the
          arrows show who is climbing. Tournament winners are enshrined on the Hall of Fame
          tab.
        </>
      ),
  },
  {
    match: /tournament|bracket|sign ?up.*(event|tournament)|register.*(event|tournament)/i,
    answer: () => (
      <>
        Tournaments are staff-run bracket events on the Tournaments tab of the{" "}
        <L to="/Colosseum">Colosseum</L>. When one is scheduled you get a countdown to the
        start and a filled-slots count; register before it fills (you set a friend code and
        pick a team). Winning is the biggest ranking jump and a Hall of Fame spot. Nothing
        listed means none is scheduled right now.
      </>
    ),
  },
  {
    // In-app notifications + Discord linking/mirroring.
    match: /notification|@?mention|\bping(s|ed|ing)?\b|\bdiscord\b|\balerts?\b/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Members manage alerts in{" "}
          <L to="/Dashboard/Settings/Notifications">Settings &gt; Notifications</L>: an
          in-app inbox (replies on bookmarked threads, @mentions, boss and system pings) plus
          toggles for site notifications and direct pings, and a button to link their Discord.
          To mirror notifications into your Discord server, save the webhook in{" "}
          <L to="/Dashboard/Site-Settings">Site Settings</L>; each recipient still needs a
          linked Discord and the Discord toggle on.
        </>
      ) : (
        <>
          Your alerts live in{" "}
          <L to="/Dashboard/Settings/Notifications">Settings &gt; Notifications</L>: an in-app
          inbox for replies on threads you bookmarked, @mentions, and boss or system pings,
          with switches to turn site notifications and direct pings on or off. Link your
          Discord on that page and flip the Discord switch to also get pinged in the guild
          server.
        </>
      ),
  },
  {
    match: /signature|\bsig\b|sign.*(post|off)/i,
    answer: () => (
      <>
        Set a forum signature in{" "}
        <L to="/Dashboard/Settings/Signature">Settings &gt; Post Signature</L>: a rich-text
        block saved to your profile and added to a post whenever you tick &quot;Attach
        Signature&quot; in the composer. It is sanitized on save, so styling is fine but
        scripts are stripped.
      </>
    ),
  },
  {
    match: /accessibilit|text size|font size|(bigger|larger|smaller|resize|increase|shrink).*text|text.*(bigger|larger|smaller|size)|\bzoom\b|reading size|hard to read/i,
    answer: () => (
      <>
        Open <L to="/Dashboard/Settings/Accessibility">Settings &gt; Accessibility</L> to
        raise the reading text size and to allow pinch-to-zoom (off by default for an app
        feel). Both are per-device and apply right away.
      </>
    ),
  },
  {
    // Creating/managing characters (not the first-time onboarding flow).
    match: /character|\boc\b|persona|another (character|trainer)|how many (character|trainer)|make.*trainer/i,
    answer: () => (
      <>
        Your characters live in <L to="/Dashboard/Characters">Console &gt; Characters</L>:
        use Create a new Character to add one (species, type, height, age, birthday and a
        history blurb), and you can keep several. Every forum post is made as one of your
        characters, and each character has its own teams.
      </>
    ),
  },
  {
    match: /\bteam\b|\bparty\b|build.*team|team.*(build|make|slot|size|change)|how many pokemon/i,
    answer: () => (
      <>
        Build teams in <L to="/Dashboard/Pokemon">Console &gt; Pokemon</L>: name a team and
        fill it from your box, then bring it into a thread. On a normal thread the team you
        post with locks for the rest of that thread and is the pool your fighters come from,
        unless the host allowed team changes when they created it.
      </>
    ),
  },
  {
    // Making a post / starting a thread. Sits after the experience rule so
    // "training post" still routes to training.
    match: /how.*(make|write|do).*(post|reply)|start (a |your )?(thread|roleplay|rp)|create (a )?thread|new thread|how.*roleplay/i,
    answer: () => (
      <>
        Open a forum board and use New Thread to start a roleplay, or Reply to continue one
        (missions are picked up from the <L to="/Missions">Mission Vault</L> instead of
        created directly). Every post is made as one of your characters and brings their
        team, so you need a character with at least one pokemon first. Who can post where is
        in <L to="/Library?tab=forums">Library &gt; The Charter</L>.
      </>
    ),
  },
  {
    match: /\bblog\b|\bnews\b|dev update|patch note|changelog|what.?s new/i,
    answer: () => (
      <>
        Guild writing lives in two places: the <L to="/Blog">Guild Blog</L> (stories, dev
        updates and guides) and the <L to="/Announcements">Announcements page</L> (shorter
        development updates that also surface on your dashboard banner).
      </>
    ),
  },
  {
    match: /\bbag\b|inventory|my items|use.*item|recycl|convert.*candy|\bscent\b/i,
    answer: () => (
      <>
        Your bag is <L to="/Dashboard/Items">Console &gt; Items</L>: medicine, held items,
        evolution stones, balls and more. Items are used where they apply (medicine and balls
        mid-battle, held items from a pokemon&apos;s details, stones from the Evolve button).
        Unwanted items recycle for Snag Coins at the <L to="/Shop">Snag Mall</L> (medicine
        cannot be recycled).
      </>
    ),
  },
  {
    match: /\bdraft(s)?\b|bookmark|saved thread|follow.*thread|save.*(post|thread)/i,
    answer: () => (
      <>
        Unfinished posts and threads save to <L to="/Dashboard/Drafts">Console &gt; Drafts</L>
        (pick one up to keep writing, or clear it). Threads you bookmark collect in{" "}
        <L to="/Dashboard/Bookmarks">Console &gt; Bookmarks</L>, and new replies on them show
        up in your notifications.
      </>
    ),
  },
  {
    match: /public profile|profile page|view.*profile|see.*(someone|member).*profile|friend code|member list/i,
    answer: () => (
      <>
        Every member has a public profile: browse the roster at <L to="/Users">Members</L> and
        open anyone to see their identity, featured picks, badges and teams. Edit your own
        basics in <L to="/Dashboard/Profile">Console &gt; Profile</L>. (Your friend code is
        used when you register for a tournament.)
      </>
    ),
  },
  {
    // Profile/post badges (distinct from gym badges, handled by "next badge").
    match: /show.*badge|display.*badge|profile badge|post badge|\bcollection|which badge|enable.*badge|manage badge|create.*badge|assign.*badge/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Create, style and assign the gradient badges that appear on forum posts in{" "}
          <L to="/Admin">Admin &gt; Manage &gt; Game Content &gt; Badges</L> (set defaults and
          hand them out). Members choose which of their earned badges to display in{" "}
          <L to="/Dashboard/Settings/Collections">Settings &gt; Collections</L>.
        </>
      ) : (
        <>
          Pick which of your badges show on your forum posts in{" "}
          <L to="/Dashboard/Settings/Collections">Settings &gt; Collections</L>. (Gym badges
          are separate: those come from beating gym leaders on the{" "}
          <L to="/Challenges">Challenges page</L>.)
        </>
      ),
  },
  {
    match: /grant|give.*(item|coin|pokemon|currency|emblem)|award.*(item|coin|pokemon)|hand out|gift.*(member|item)/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Send items, currency or pokemon straight to a member from{" "}
          <L to="/Admin">Admin &gt; Manage &gt; Members &amp; Access &gt; Grant to Users</L>.
          Import approvals and reward reviews also grant server-side, and everything you hand
          out is logged.
        </>
      ) : (
        <>
          Only staff can grant items, coins or pokemon directly. You earn Snag Coins from
          missions, events and reward reviews, and you can swap pokemon with other members at
          the <L to="/Trading">Trading Post</L>.
        </>
      ),
  },
  {
    match: /audit|staff log|action log|paper trail|who (granted|changed|edited|did)/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Sensitive staff actions (grants, star and stat edits, launches) are recorded in the
          audit trail under <L to="/Admin">Admin &gt; Manage &gt; Reference</L>. It is
          read-only history for accountability.
        </>
      ) : (
        <>
          The staff keep an internal audit log of moderation actions, which is staff-only.
          Your own activity is in <L to="/Dashboard/History">Console &gt; History</L>.
        </>
      ),
  },
  {
    match: /sendgrid|approval email|rejection email|email notice|applicant email|welcome email/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Approval and rejection emails go out through SendGrid, configured in{" "}
          <L to="/Dashboard/Site-Settings">Site Settings &gt; Email notices</L>: paste an API
          key with Mail Send permission and a verified from address. Until a key is saved no
          emails send and approvals still work in-app.
        </>
      ) : (
        <>
          When staff approve or reject your registration you get an email (you cannot see
          in-app notifications before your first login), so keep an eye on your inbox.
        </>
      ),
  },
  {
    match: /activit.*(next|coming|launch)|next.*(event|activit)|coming up|upcoming/i,
    answer: () => (
      <>
        Upcoming activities are announced on the{" "}
        <L to="/Announcements">Announcements page</L> and on your{" "}
        <L to="/Dashboard">dashboard banner</L>. Live events appear in the{" "}
        <L to="/Forum/Events">Events forum</L>. If it is not announced yet, the staff
        have not scheduled it; want me to pass a question to them?
      </>
    ),
  },
  {
    match: /permission|who can (create|post)|why can.?t i (create|post|make)/i,
    answer: () => (
      <>
        Each forum has its own creation rules; for example, mission threads are never
        created directly, you pick one up from the <L to="/Missions">Mission hub</L>.
        The full matrix is in <L to="/Library?tab=forums">Library &gt; The Charter</L>.
      </>
    ),
  },
  {
    match: /where.*(shop|mall|buy)|shop.*where/i,
    answer: () => (
      <>
        The <L to="/Shop">Snag Mall</L>: storefronts for items, recycling, tours and evo
        services. Coins come from missions, events and the reward reviews.
      </>
    ),
  },
  {
    match: /where.*(team|pokemon|character|profile|dashboard)|my (team|pokemon|character)/i,
    answer: () => (
      <>
        Your <L to="/Dashboard">Console dashboard</L> holds your characters, teams,
        pokemon boxes, items, drafts and settings. Teams are managed under Pokemon,
        characters under Characters.
      </>
    ),
  },
  {
    match: /library|pokedex|item catalog|lore|archive/i,
    answer: () => (
      <>
        The <L to="/Library">Library</L> is the public reference: Pokedex (with star
        ratings and your caught-collection tracker), item catalog, battle guide, forum
        guide, shadow guide, encounter lists, searchable lore archives, and the help
        desk FAQ.
      </>
    ),
  },
  {
    // Where filed tickets end up.
    match: /dev board|ticket|where.*(suggestion|bug report|question).*(go|end)/i,
    answer: ({ admin }) =>
      admin ? (
        <>
          Member suggestions, bug reports and questions filed through me land in the
          tickets queue; triage them from <L to="/Admin">Admin &gt; Manage &gt; Dev
          Board</L> (discard or promote to dev tickets, plus admin-only planning notes).
        </>
      ) : (
        <>
          Anything you send me (suggestions, bug reports, questions) goes straight to
          the staff&apos;s inbox; they review every ticket and questions get a reply.
        </>
      ),
  },
  {
    match: /rule|conduct|policy|privacy|terms/i,
    answer: () => (
      <>
        House rules live under <L to="/Policies">Policies</L>: community rules, privacy,
        cookies, and terms.
      </>
    ),
  },
];

const GREETING: React.ReactNode = (
  <>
    S.N.A.G. online. Ask me where anything lives or how it works: battles, missions,
    badges, your weekly Snag List. I can also take a suggestion, a bug report, or pass a
    question to the staff.
  </>
);

const ADMIN_GREETING: React.ReactNode = (
  <>
    S.N.A.G. online, staff mode. I answer member questions AND the admin manual: where
    to approve applications and imports, manage encounter lists, launch Safari
    Contests, or triage the Dev Board. Ask away.
  </>
);

export default function SnagAgent() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const [messages, setMessages] = React.useState<Msg[]>([
    { from: "snag", node: admin ? ADMIN_GREETING : GREETING },
  ]);
  const [input, setInput] = React.useState("");
  const [intake, setIntake] = React.useState<Intake>(null);
  const [busy, setBusy] = React.useState(false);
  const viewport = React.useRef<HTMLDivElement>(null);

  const push = (msg: Msg) => setMessages((m) => [...m, msg]);
  React.useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submitTicket = async (kind: Exclude<Intake, null>, text: string) => {
    const { addDoc, collection } = await import("firebase/firestore");
    const { db } = await import("../../context/firebase");
    await addDoc(collection(db, "tickets"), {
      type: kind === "suggestion" ? "dev_suggestion" : kind === "bug" ? "dev_bug" : "member_question",
      text: text.slice(0, 4000),
      actorUid: user?.uid ?? "",
      actorName: user?.displayName ?? user?.username ?? "Unknown",
      status: "new",
      createdAt: new Date(),
    });
  };

  const startIntake = (kind: Exclude<Intake, null>) => {
    if (!user) {
      push({ from: "snag", node: "You need to be signed in so the staff know who sent it." });
      return;
    }
    setIntake(kind);
    push({
      from: "snag",
      node:
        kind === "suggestion"
          ? "Great, I'm listening. Type your suggestion and I'll file it for the staff."
          : kind === "bug"
          ? "Sorry about that! Describe what went wrong (what you did, what you expected) and I'll report it."
          : "Type the question and I'll pass it to the staff; they'll get back to you.",
    });
  };

  const respond = async (text: string) => {
    const lower = text.toLowerCase();
    // Intake intents first (explicit words beat the knowledge base).
    if (/suggest/i.test(lower) && !intake) return startIntake("suggestion");
    if (/(found|report|there.?s).*(error|bug|broken)|bug|error/i.test(lower) && !intake) {
      return startIntake("bug");
    }
    for (const entry of KB) {
      if (entry.match.test(text)) {
        setBusy(true);
        try {
          const node = await entry.answer({ uid: user?.uid ?? null, admin, text });
          push({ from: "snag", node });
        } catch {
          push({
            from: "snag",
            node: "I hit static trying to look that up. Try again in a moment.",
          });
        } finally {
          setBusy(false);
        }
        return;
      }
    }
    // No match: offer to send it to the staff (no external AI on this device).
    // The inline action reaches the question intake everywhere, including mobile
    // where the chip row collapses to just "Report a bug".
    push({
      from: "snag",
      node: (
        <>
          That one is outside my manual, but I can{" "}
          <Anchor
            component="button"
            type="button"
            fz="inherit"
            c="blue.3"
            onClick={() => startIntake("question")}
          >
            send it to the staff as a question
          </Anchor>
          . You can also browse the <L to="/Library">Library</L> and{" "}
          <L to="/Library?tab=faq">Help Desk</L>.
        </>
      ),
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    push({ from: "user", node: text });
    if (intake) {
      const kind = intake;
      setIntake(null);
      setBusy(true);
      try {
        await submitTicket(kind, text);
        push({
          from: "snag",
          node:
            kind === "suggestion"
              ? "Filed! Your suggestion is in the staff inbox. Thank you."
              : kind === "bug"
              ? "Reported! The staff will look into it. Thanks for flagging it."
              : "Sent! The staff will pick it up from their inbox.",
        });
      } catch {
        push({ from: "snag", node: "The transmission failed; try sending that again." });
      } finally {
        setBusy(false);
      }
      return;
    }
    await respond(text);
  };

  const chips: Array<{
    label: string;
    text?: string;
    action?: () => void;
    keepOnMobile?: boolean;
  }> = [
    { label: "My weekly Snag List", text: "What am I missing for my weekly reward?" },
    { label: "Next badge", text: "What's the next badge I can battle for in Kanto?" },
    { label: "How do battles work?", text: "How do battles and damage work?" },
    ...(admin
      ? [
          { label: "Approve applications", text: "Where do I approve new registrations?" },
          { label: "Encounter lists", text: "How do I manage encounter lists?" },
        ]
      : [{ label: "Getting started", text: "How do I get started as a new member?" }]),
    { label: "Make a suggestion", action: () => startIntake("suggestion") },
    { label: "Report a bug", action: () => startIntake("bug"), keepOnMobile: true },
    { label: "Ask the staff", action: () => startIntake("question") },
  ];

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo noindex title="S.N.A.G. | Snagem Guild" />
      <PageHero
        eyebrow="Support Network Assistance Gadget"
        title="S.N.A.G."
        subtitle="The guild's help device. Ask where things are, how systems work, or send the staff a suggestion, bug report, or question."
        mb={20}
      />

      <Box
        style={{
          borderRadius: 16,
          border: "1px solid #232028",
          background: "#141318",
          overflow: "hidden",
        }}
      >
        <ScrollArea h={420} viewportRef={viewport} p="md">
          <Stack gap={10} p={4}>
            {messages.map((m, i) => (
              <Group
                key={i}
                align="flex-start"
                gap={8}
                wrap="nowrap"
                justify={m.from === "user" ? "flex-end" : "flex-start"}
              >
                {m.from === "snag" && (
                  <Avatar radius="xl" size={30} bg="#241f2e">
                    <SnagIcon name="walkie" size={18} cut="#241f2e" title="S.N.A.G." />
                  </Avatar>
                )}
                <Box
                  px={12}
                  py={8}
                  maw="80%"
                  style={{
                    borderRadius: 12,
                    background: m.from === "user" ? "#772976" : "#211f26",
                    border: m.from === "user" ? "none" : "1px solid #2a2637",
                  }}
                >
                  <Text fz={16} c="white" style={{ lineHeight: 1.55, wordBreak: "break-word" }}>
                    {m.node}
                  </Text>
                </Box>
              </Group>
            ))}
            {busy && (
              <Text fz={14} c="dimmed" role="status" aria-live="polite">
                S.N.A.G. is checking...
              </Text>
            )}
          </Stack>
        </ScrollArea>

        <Box p="sm" style={{ borderTop: "1px solid #232028" }}>
          {/* On mobile the chip row collapses to just "Report a bug" to keep it
              uncluttered; the rest carry visibleFrom="sm" and return on wider
              screens. The suggestion and question intakes stay reachable by
              typing, and the "outside my manual" reply offers an inline path to
              the staff. */}
          <Group gap={6} mb={8} wrap="wrap">
            {chips.map((c) => (
              <Button
                key={c.label}
                size="compact-xs"
                radius="xl"
                variant="light"
                color="grape"
                visibleFrom={c.keepOnMobile ? undefined : "sm"}
                onClick={() => {
                  if (c.action) c.action();
                  else if (c.text) {
                    push({ from: "user", node: c.text });
                    respond(c.text);
                  }
                }}
              >
                {c.label}
              </Button>
            ))}
          </Group>
          <Group gap={8} wrap="nowrap">
            <TextInput
              placeholder={
                intake
                  ? intake === "suggestion"
                    ? "Type your suggestion..."
                    : intake === "bug"
                    ? "Describe the bug..."
                    : "Type your question for the staff..."
                  : "Ask S.N.A.G. anything about the guild..."
              }
              aria-label="Message S.N.A.G."
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              radius="xl"
              style={{ flex: 1 }}
              styles={{ input: { background: "#2E2D2E" } }}
            />
            <Button
              radius="xl"
              color="grape"
              onClick={handleSend}
              disabled={!input.trim() || busy}
              aria-label="Send message"
              leftSection={<IconSend size={16} />}
            >
              Send
            </Button>
          </Group>
          {intake && (
            <Text fz={14} c="gold.1" mt={6} role="status" aria-live="polite">
              {intake === "suggestion"
                ? "Recording a suggestion. Your next message goes to the staff."
                : intake === "bug"
                ? "Recording a bug report. Your next message goes to the staff."
                : "Recording a question. Your next message goes to the staff."}{" "}
              <Anchor
                component="button"
                type="button"
                fz={14}
                c="blue.3"
                onClick={() => {
                  setIntake(null);
                  push({ from: "snag", node: "Cancelled. What else can I help with?" });
                }}
              >
                Cancel
              </Anchor>
            </Text>
          )}
        </Box>
      </Box>

      <Text fz={14} c="dimmed" mt={10} ta="right">
        S.N.A.G. answers from the guild&apos;s own manuals and your progress; it is not
        connected to an external AI. Anything it cannot answer can be sent to the staff.
      </Text>
    </Container>
  );
}
