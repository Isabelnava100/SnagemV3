import { Accordion, Box, List, Stack, Text, Title } from "@mantine/core";

/**
 * Guild FAQ, ported from the GaiaOnline guild thread. Answers sit in an
 * accordion (the old "spoiler" behavior) so the list stays scannable. Content
 * is lightly adapted to this site (the dashboard replaces the old member
 * listing, the Marketplace replaces the Snag Mall subforum) but keeps the
 * guild's own worldbuilding. Several answers describe mechanics we have not
 * built yet; see docs/FORUM.md "FAQ-implied features" for the build notes.
 */

function P(props: { children: React.ReactNode }) {
  return (
    <Text fz={16} c="rgba(255,255,255,0.8)" style={{ lineHeight: 1.7 }}>
      {props.children}
    </Text>
  );
}

function SubTitle(props: { children: React.ReactNode }) {
  return (
    <Text fz={14} fw={700} c="white" mt={8}>
      {props.children}
    </Text>
  );
}

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

const FAQ: FaqItem[] = [
  {
    q: "What is a Snag Machine?",
    a: (
      <P>
        In Team Snagem, we use Snag Machines, devices that alter Poke Balls and
        make them capable of capturing trainer-owned Pokemon. Our current model is
        a gauntlet-like device worn over the hand that, on activation, alters the
        Poke Ball held in that hand. A Pokemon caught by a Snag Machine's altered
        ball has its Original Trainer ID overwritten with the wielder's, removing
        all traces of previous ownership.
      </P>
    ),
  },
  {
    q: "What is a SNAG?",
    a: (
      <P>
        SNAG stands for Snagem Network Access Gear, a communications device used by
        every member of Team Snagem. The SNAG includes a phone, internet,
        messaging, GPS (World Map), the National Pokedex, access to Team Snagem's
        database, and a built-in camera and microphone. It is an essential tool for
        any Snagem.
      </P>
    ),
  },
  {
    q: "What is this GRAY I keep hearing about?",
    a: (
      <P>
        GRAY stands for Guidance Resource and Assistance Yielder, an artificial
        intelligence installed on the SNAG network. He assists members with any
        questions they have and can speak through any SNAG, so he is always
        available. GRAY can also send the team's Claydol to your side to Teleport
        you where you need to go, and he reads off Pokedex entries. Be warned that
        GRAY is unique with his words: he can be rude, poke fun at you and generally
        be a smart aleck, but he will still help.
      </P>
    ),
  },
  {
    q: "Is any posting style required in the guild?",
    a: (
      <P>
        No, there is no required posting style. We do ask that you use decent
        grammar and avoid spamming images in your posts.
      </P>
    ),
  },
  {
    q: "What are Snag Emblems?",
    a: (
      <P>
        Snag Emblems are a currency that acts as a catalyst for many craftable
        items and are often required to make them. You can obtain them as a full
        Emblem or as a Snag Emblem Piece, with three pieces making one Emblem.
      </P>
    ),
  },
  {
    q: "How do I catch more Pokemon?",
    a: (
      <P>
        You can capture Pokemon in any mission or adventure that allows capture, or
        through extra means such as earning Pokemon Eggs from contests or as
        rewards.
      </P>
    ),
  },
  {
    q: "How do Poke Balls work?",
    a: (
      <Stack gap={4}>
        <P>
          Poke Balls are used to catch or snag Pokemon and come in many varieties.
          Each has its own limitations.
        </P>
        <SubTitle>Standard Balls</SubTitle>
        <List size="sm" c="rgba(255,255,255,0.8)" spacing={4}>
          <List.Item>
            <b>Poke Ball, Premier Ball:</b> the most basic balls; catch first-stage
            and non-evolving Pokemon, but not baby Pokemon.
          </List.Item>
          <List.Item>
            <b>Great Ball:</b> a higher-rate ball; catches first and second-stage
            Pokemon, but not baby Pokemon.
          </List.Item>
          <List.Item>
            <b>Ultra Ball:</b> the highest commercial grade; catches any stage
            except baby Pokemon and legendaries. Third-stage Pokemon can only be
            caught when allowed, such as in Safari Contests.
          </List.Item>
          <List.Item>
            <b>Heal Ball:</b> heals a Pokemon on capture so it is usable right away.
            Same limits as a Great Ball.
          </List.Item>
          <List.Item>
            <b>Lure Ball, Dive Ball:</b> more effective on aquatic Pokemon; catch
            any stage of Water-type.
          </List.Item>
          <List.Item>
            <b>Net Ball:</b> catches any stage of Water or Bug-type Pokemon.
          </List.Item>
          <List.Item>
            <b>Dusk Ball:</b> catches any stage of cave Pokemon plus Dark and
            Ghost-types.
          </List.Item>
          <List.Item>
            <b>Nest Ball:</b> can catch baby Pokemon; otherwise like a Poke Ball.
          </List.Item>
          <List.Item>
            <b>Luxury Ball:</b> doubles credit toward Happiness evolutions. Same
            limits as a Great Ball, and can catch baby Pokemon.
          </List.Item>
          <List.Item>
            <b>Friend Ball (Green Apricorn):</b> grants a surge equal to three
            missions toward Happiness evolutions. Same limits as the Luxury Ball.
          </List.Item>
          <List.Item>
            <b>Level Ball (Red Apricorn):</b> grants Evo Points on capture equal to
            one fifth of what is needed to evolve. Same limits as a Great Ball.
          </List.Item>
          <List.Item>
            <b>Master Ball:</b> our alchemized version catches legendary Pokemon
            with relative ease, but little else. Crafted at Ambrosial Alchemy, and
            occasionally a daily rarity in the Golden Sarcophagus.
          </List.Item>
          <List.Item>
            <b>Cherish Ball:</b> like the Master Ball, but can also catch shiny
            legendaries. Crafted at Ambrosial Alchemy or found as a Golden
            Sarcophagus daily rarity.
          </List.Item>
        </List>
        <SubTitle>Safari Contest Balls</SubTitle>
        <P>
          In Safari Contests, standard balls can be used freely with different catch
          rates, while some balls are only useful within contests.
        </P>
        <List size="sm" c="rgba(255,255,255,0.8)" spacing={4}>
          <List.Item>
            <b>Safari Ball:</b> handed out in packs of three and taken back at the
            end. No better than a Poke Ball, but catches any Pokemon in an active
            contest.
          </List.Item>
          <List.Item>
            <b>Quick Ball:</b> higher rate on the first Pokemon encountered in a
            contest; otherwise a Poke Ball.
          </List.Item>
          <List.Item>
            <b>Timer Ball:</b> higher rate if it is the last ball used in a contest;
            weaker if used too soon.
          </List.Item>
          <List.Item>
            <b>Repeat Ball:</b> higher rate on a Pokemon you already own or an
            earlier stage of it, and gives an extra chance during Safari Contests.
          </List.Item>
          <List.Item>
            <b>Fast Ball (White Apricorn):</b> higher rate on fast or flight-prone
            Pokemon.
          </List.Item>
          <List.Item>
            <b>Heavy Ball (Black Apricorn):</b> higher rate on heavy Pokemon such as
            Snorlax.
          </List.Item>
          <List.Item>
            <b>Love Ball (Pink Apricorn):</b> higher rate on single-gender Pokemon
            such as Tauros or Miltank.
          </List.Item>
          <List.Item>
            <b>Moon Ball (Yellow Apricorn):</b> higher rate on Pokemon that evolve
            with a Moon Stone.
          </List.Item>
          <List.Item>
            <b>Dream Ball:</b> higher rate if a sleep-inducing move is used on the
            Pokemon first.
          </List.Item>
        </List>
      </Stack>
    ),
  },
  {
    q: "How do evolutions work?",
    a: (
      <Stack gap={4}>
        <P>
          Evolutions vary per Pokemon, just as in the games, tweaked to fit our
          setting. The methods and how we handle them are below. (And no, you do not
          need to flip your device upside down to evolve Inkay.)
        </P>
        <SubTitle>Level Evolution</SubTitle>
        <P>
          Take part in the guild with your Pokemon: missions, The Colosseum, and
          even posting in HQ earn points. HQ posts are passive, and those point
          gains are posted every Monday. Points needed:
        </P>
        <List size="sm" c="rgba(255,255,255,0.8)" spacing={2}>
          <List.Item>First to second stage: Fast 15, Medium 25, Slow 35.</List.Item>
          <List.Item>Second to third stage: Fast 30, Medium 40, Slow 50.</List.Item>
        </List>
        <P>
          If you are unsure of a growth pattern, check the species and match it to
          our growths. Exp. Candies also grant Evo Points: XS 1, S 2, M 3, L 4, XL 5.
        </P>
        <SubTitle>Other methods</SubTitle>
        <List size="sm" c="rgba(255,255,255,0.8)" spacing={4}>
          <List.Item>
            <b>Trade Evolution:</b> trade the Pokemon with a member at The Poke Swap,
            holding the required item if needed.
          </List.Item>
          <List.Item>
            <b>Item Evolution:</b> get the required item and use it on the Pokemon.
          </List.Item>
          <List.Item>
            <b>Held Item + Level:</b> complete a mission with the relevant item held.
            A day in the Super Training Room (five-post minimum) or a week of HQ
            posting also counts.
          </List.Item>
          <List.Item>
            <b>Environment Evolution:</b> complete a mission in the right location,
            battle a member three times on the Battlefield, or train five days in the
            Super Training Room.
          </List.Item>
          <List.Item>
            <b>Happiness Evolution:</b> five missions/days for first to second, seven
            for second to third. Battlefield battles count as half credit; HQ posts
            grant varying credit. Also covers Eevee to Sylveon.
          </List.Item>
          <List.Item>
            <b>Move + Level:</b> use the required move across four missions or four
            days of training. HQ posts using the move count for varying credit.
          </List.Item>
          <List.Item>
            <b>Regional Variants:</b> beyond the normal requirement, use the Pokemon
            in a mission set in the relevant region (Alola, Galar, Hisui) or emulate
            it a day in the Super Training Room.
          </List.Item>
        </List>
        <P>
          A Rare Candy bypasses any requirement except Regional Forms, but is given
          out very rarely. Shadow Pokemon cannot evolve until purified and make no
          progress toward evolution until then. Evolution items can also be found in
          the Snag Mall at The Golden Sarcophagus.
        </P>
      </Stack>
    ),
  },
  {
    q: "How do Abilities work?",
    a: (
      <P>
        Each Pokemon and Hybrid has an innate Ability, like in the games. You pick
        one Ability (normal or hidden) when the Pokemon is caught or when
        hybridization occurs, and under most circumstances that choice is permanent.
        For Pokemon, an Ability Capsule lets them access and swap between two
        Abilities outside of missions. Capsules are made at Ambrosial Alchemy and
        have no effect on Hybrids or on Pokemon with only one Ability.
      </P>
    ),
  },
  {
    q: "How can I use Mega Evolution or Z-Moves?",
    a: (
      <Stack gap={4}>
        <P>
          There are a few ways to gain access to each.
        </P>
        <SubTitle>Mission</SubTitle>
        <P>
          A Kalos mission at the Tower of Mastery grants Mega Evolution. An Alola
          mission involving a trial from the Tapu grants Z-Moves, and Island Trials
          can be completed to acquire Z-Crystals.
        </P>
        <SubTitle>Alchemy</SubTitle>
        <P>
          A Mega Diploma or Z-Writ can be earned as a reward or found as the Golden
          Sarcophagus daily rarity, then crafted at Ambrosial Alchemy into the
          relevant item.
        </P>
        <P>
          Either way, access is treated as an upgrade to the Snag Machine that lets
          Mega Stones or Z-Crystals be inserted. Each can be used once per mission
          and only one at a time.
        </P>
      </Stack>
    ),
  },
  {
    q: "How long should a mission be?",
    a: (
      <P>
        There is no required length. A short mission tends to lack story and detail
        and is more likely to fail. Length is not important, but story and content
        are.
      </P>
    ),
  },
  {
    q: "How do rewards work?",
    a: (
      <P>
        Rewards are given per member, not per character. If you bring three
        characters into a mission and earn three Snag Coins, you get three total,
        not three per character. The same applies to Safari Contests: if several of
        your characters take part, only the most recent capture counts.
      </P>
    ),
  },
  {
    q: "How do items, permissions and limits work for multiple characters?",
    a: (
      <Stack gap={4}>
        <P>
          Items and Legendary Pokemon limits are shared across your characters, just
          like rewards. If you have five Poke Balls, you have five in total.
        </P>
        <List size="sm" c="rgba(255,255,255,0.8)" spacing={4}>
          <List.Item>
            <b>Legendary Pokemon:</b> only with staff approval and a Master or
            Cherish Ball. A member may acquire at most two, and extra characters do
            not raise the limit.
          </List.Item>
          <List.Item>
            <b>Missions and team missions:</b> any member may pitch one, subject to
            approval. Usually granted unless it touches the guild's story arcs.
          </List.Item>
          <List.Item>
            <b>Obtaining Pokemon:</b> new members and characters start with a Pokemon
            at its earliest stage that can evolve without a Mega Stone. After that
            you may catch up to a second-stage Pokemon with the right ball. Storage
            is unlimited, but no more than six Pokemon travel with you at a time.
          </List.Item>
          <List.Item>
            <b>Evolving Pokemon:</b> handled through Evo Points for most Pokemon.
            Shadow-infected Pokemon gain Purification Points instead until purified.
          </List.Item>
          <List.Item>
            <b>Master Missions:</b> can start any time but are graded harshly. Fail a
            Master Mission twice and that character cannot take further ones. They
            must be done in order through the tenth and the Grand Master Mission.
          </List.Item>
        </List>
      </Stack>
    ),
  },
  {
    q: "How do I get more Poke Balls?",
    a: (
      <P>
        Poke Balls can be bought in the Snag Mall, specifically at the Golden
        Sarcophagus.
      </P>
    ),
  },
  {
    q: "What are Hybrids and Channelers?",
    a: (
      <P>
        Hybrids and Channelers are covered in depth in their own guide, which also
        answers questions about Mega Stones. Ask the staff if you need a pointer to
        it.
      </P>
    ),
  },
  {
    q: "What are the restrictions on legendary Pokemon?",
    a: (
      <P>
        Legendary Pokemon may only be captured with staff approval, up to two per
        member. Some are not allowed for capture; the banned list lives in the rules.
        To catch an allowed one you will need a Master Ball, or a Cherish Ball for a
        shiny legendary. Legendaries may also appear purely for story reasons in
        missions and side stories, whether or not they can be caught.
      </P>
    ),
  },
  {
    q: "Can my character start with a certain set of Pokemon?",
    a: <P>You will need to talk to the staff about that.</P>,
  },
  {
    q: "Is my character allowed to use a weapon?",
    a: <P>Talk to the staff about that as well.</P>,
  },
  {
    q: "Can I catch shiny Pokemon?",
    a: (
      <P>
        Normally no, though shiny legendaries can be caught with a Cherish Ball.
        Otherwise, shiny Pokemon come from special events, special missions, or a
        Shiny Pokeblock. Any Pokemon that eats a Shiny Pokeblock permanently becomes
        its shiny form. Shiny Pokeblocks are made at Ambrosial Alchemy.
      </P>
    ),
  },
  {
    q: "Can my Pokemon speak human?",
    a: (
      <P>
        Normally no. However, a Pokemon that eats a Rainbow Pokeblock can
        permanently speak human. These are also made at Ambrosial Alchemy.
      </P>
    ),
  },
  {
    q: "If I am inactive for a while, will I be kicked out and lose my Pokemon?",
    a: (
      <P>
        You will not be kicked out, but a heads up is appreciated if you know you
        will be away a while. After two months of inactivity you are removed from the
        member listing to reduce clutter; everything else stays intact. On return,
        just give your info again and we will add you back. If you are having trouble
        jumping back in, the staff are happy to help.
      </P>
    ),
  },
  {
    q: "How do Missions work?",
    a: (
      <P>
        Pick a mission that appeals to you from the Missions page, then start a
        thread to roleplay it out. You can run one solo or with others in Side
        Stories; if you play it with others, include the mission's name in the
        thread title. When the thread is closed, staff review it and grant the
        reward. Missions usually pay out Snag Coins, and a great one can also earn
        items, eggs, or even Snag Emblems.
      </P>
    ),
  },
  {
    q: "How do Team Missions work?",
    a: (
      <P>
        Team Missions are group missions announced ahead of time and hosted on the
        main forum. They usually tie into the guild's central story, though random
        ones happen outside of it, so keep an eye out. Open ones are marked active;
        finished ones are marked complete and are soon archived. If you want to host
        a Team Mission of your own, contact the staff to set it up.
      </P>
    ),
  },
  {
    q: "What is a Shadow Pokemon and why is it dangerous?",
    a: (
      <P>
        Shadow Pokemon are Pokemon exposed to the Shadow Virus rampaging through
        Hoenn. The virus shuts a Pokemon's heart to the outside world and drives it
        toward reckless destruction and an appetite for battle. Infected Pokemon
        ignore the limits they would normally obey against harming others, which,
        combined with their strength, makes for volatile situations, especially once
        they enter Hyper Mode. Note that a Shadow Pokemon cannot gain experience or
        evolve until it is purified.
      </P>
    ),
  },
  {
    q: "What is Hyper Mode?",
    a: (
      <P>
        Hyper Mode is when a Shadow Pokemon's emotions overwhelm it and it goes into
        a berserk rage. It will want to use Shadow Moves more often and will
        frequently disobey, attacking anyone at will. It cannot be recalled until it
        is knocked out or exhausts itself, and items cannot be used on it. Using
        Shadow Moves pushes a Pokemon toward Hyper Mode. When you leave a mission,
        the meter settles back to zero on its own.
      </P>
    ),
  },
  {
    q: "How do the Shadow Meter and Shadow Moves work?",
    a: (
      <Stack gap={4}>
        <P>
          Every Shadow Pokemon starts a mission with an empty Shadow Meter (0/10).
          Each Shadow Move adds to the meter, and you should note the value in your
          post, for example "Shadow Meter: Pidgey (3/10)". Fill the meter and the
          Pokemon enters Hyper Mode and stops listening until it is knocked out. You
          may use a move even without enough points left, but doing so instantly
          fills the meter and forces Hyper Mode. All Shadow Moves are super effective
          against regular Pokemon and not very effective against other Shadows.
        </P>
        <P>
          Which moves a Pokemon can use depends on its stage: Class A for any stage,
          Class B once it has evolved at least once, and Class C only when fully
          evolved. The full list of Shadow Moves and their effects is in the Library
          under Moves.
        </P>
      </Stack>
    ),
  },
  {
    q: "How do I purify a Shadow Pokemon?",
    a: (
      <Stack gap={4}>
        <P>
          Purification has two parts: building Purification Points, then vaccinating.
          While infected, a Pokemon gains Purification Points instead of experience
          (even if already fully evolved). You can build points by:
        </P>
        <List size="sm" c="rgba(255,255,255,0.8)" spacing={4}>
          <List.Item>
            <b>Battle:</b> repeated battles slowly stabilize the Pokemon. The Super
            Training Room makes this easier.
          </List.Item>
          <List.Item>
            <b>Spending time:</b> simply doing things with the Pokemon helps undo the
            locks on its heart.
          </List.Item>
          <List.Item>
            <b>Aromas:</b> the Joy, Excite and Vivid Scents add 1, 2 and 3
            Purification Points respectively.
          </List.Item>
        </List>
        <P>
          These methods reach a stalemate ("stasis") on their own; the Shadow Vaccine
          finishes the job. Vaccinating does not purify instantly: the Pokemon must
          still reach its full Purification Points before its heart opens, and only
          then, once cured, does it gain immunity. Keep track of vaccination and cure
          status in your profile. Point requirements by stage:
        </P>
        <List size="sm" c="rgba(255,255,255,0.8)" spacing={2}>
          <List.Item>Stage 1: 20 points, 1 Shadow Move, Class A.</List.Item>
          <List.Item>Stage 2: 25 points, 2 Shadow Moves, Class B.</List.Item>
          <List.Item>Stage 3: 30 points, 3 Shadow Moves, Class C.</List.Item>
        </List>
        <P>
          Rare exceptions cannot be infected at all: Pokemon with the Clear Body
          ability, and Mew, whose DNA was a catalyst in the vaccine.
        </P>
      </Stack>
    ),
  },
];

export default function FaqTab() {
  return (
    <Stack gap={12}>
      <Text fz={14} c="dimmed">
        Some of the most commonly asked questions and their answers. Tap a question
        to expand it. If your question is not here, contact the staff and we may add
        it for future reference.
      </Text>
      <Accordion variant="separated" multiple radius="md">
        {FAQ.map((item, i) => (
          <Accordion.Item key={i} value={`faq-${i}`} bg="#2b2a2b">
            <Accordion.Control>
              <Text fz={16} c="white" fw={600}>
                {item.q}
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Box>{item.a}</Box>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}
