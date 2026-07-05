import { Box, Container, Stack, Tabs, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useSearchParams } from "react-router-dom";

/**
 * Public policies hub. Anyone (signed in or not) can read these. Tabbed so we
 * can add more "boring but necessary" documents over time without new routes.
 * Snagem Guild is a non-commercial Pokemon fan community; copy is written in
 * that spirit and should be reviewed before launch.
 */

const LAST_UPDATED = "July 2026";

function PolicySection(props: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={6}>
      <Title order={3} c="white" size={18} fw={600}>
        {props.title}
      </Title>
      <Box c="rgba(255,255,255,0.75)" fz={14} style={{ lineHeight: 1.7 }}>
        {props.children}
      </Box>
    </Stack>
  );
}

function Privacy() {
  return (
    <Stack gap={20}>
      <PolicySection title="Our promise">
        <Text>
          We will never sell your personal information or anything you post, and
          we will never hand it to advertisers or data brokers. Snagem Guild is a
          community project, not a business built on your data. We only collect
          what the site needs to work and to keep the community safe.
        </Text>
      </PolicySection>
      <PolicySection title="What we collect">
        <Text component="div">
          The information tied to your account, all of which you provide or
          create:
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>Account basics: your email address and username.</li>
            <li>
              Profile content: your bio, avatar and cover images, characters,
              teams, and Pokemon.
            </li>
            <li>
              Community activity: forum threads and posts, drafts, bookmarks, and
              items or currency you earn on the site.
            </li>
            <li>
              Settings: your notification preferences and display preferences
              such as reading text size.
            </li>
            <li>
              Discord link (optional): if you connect Discord, the account
              identifier needed to link it and send the notifications you ask
              for.
            </li>
          </ul>
        </Text>
      </PolicySection>
      <PolicySection title="How we use it">
        <Text>
          Your information runs the site: signing you in, showing your profile,
          characters, and posts, tracking your in-game progress, delivering
          notifications you have turned on, and letting staff keep the community
          safe. We use your email only for account matters such as password
          resets and, if you enable them, activity notifications. We do not use
          your information for advertising.
        </Text>
      </PolicySection>
      <PolicySection title="Where it is stored">
        <Text>
          The site runs on Google Firebase (accounts, database, and image
          storage) and is hosted on Netlify. Your data lives in these services on
          our behalf, each under its own security and privacy terms. Connecting
          Discord shares only the identifiers needed for the link and the
          notifications you request. We do not add any third-party advertising or
          cross-site tracking.
        </Text>
      </PolicySection>
      <PolicySection title="Who can see your content">
        <Text>
          Anything you post publicly (forum posts, your public profile, showcased
          characters or teams) is visible to other visitors by design. Private
          items such as drafts and your settings are visible only to you and to
          staff who need them to run the site and enforce the rules.
        </Text>
      </PolicySection>
      <PolicySection title="Keeping and deleting data">
        <Text>
          We keep your information for as long as your account is active. You can
          edit or remove most of your profile content at any time from your
          dashboard, and change notification settings under Settings. To delete
          your account, or to ask what we hold about you, contact the staff team
          and we will take care of it. Some posts may remain in shared threads for
          context, with your name removed on request where practical.
        </Text>
      </PolicySection>
      <PolicySection title="Children">
        <Text>
          Snagem Guild is meant for teenagers and adults. If you believe a child
          has given us personal information without a guardian's consent, contact
          the staff team and we will remove it.
        </Text>
      </PolicySection>
    </Stack>
  );
}

function Cookies() {
  return (
    <Stack gap={20}>
      <PolicySection title="Cookies and local storage">
        <Text>
          We use a small number of cookies and browser local storage to keep you
          signed in and to remember preferences such as your reading text size.
          These are essential to how the site works. We do not use advertising or
          cross-site tracking cookies.
        </Text>
      </PolicySection>
      <PolicySection title="Caching">
        <Text>
          To keep the site fast we cache data in your browser and through our
          hosting provider. Pages and images may be served from a cached copy for
          a short time, so a recent change can take a moment to appear. You can
          force a fresh copy by reloading the page.
        </Text>
      </PolicySection>
      <PolicySection title="Clearing your data">
        <Text>
          Clearing your browser's cookies and site data will sign you out and
          reset local preferences. The site will recreate the essential ones the
          next time you sign in.
        </Text>
      </PolicySection>
    </Stack>
  );
}

function Terms() {
  return (
    <Stack gap={20}>
      <PolicySection title="Using the site">
        <Text>
          Snagem Guild is a free community for members who agree to follow these
          terms and our community rules. Keep your login secure, and do not
          attempt to break, overload, or gain unauthorized access to the site or
          other members' accounts.
        </Text>
      </PolicySection>
      <PolicySection title="Your content">
        <Text>
          You keep ownership of what you write and create here. By posting, you
          give us permission to display and store your content so the site can
          run. You are responsible for what you post and confirm you have the
          right to share it.
        </Text>
      </PolicySection>
      <PolicySection title="Accounts and access">
        <Text>
          Staff may edit, hide, or remove content, and may suspend or close
          accounts that break the rules. We may update these terms as the site
          grows; continued use after a change means you accept the updated terms.
        </Text>
      </PolicySection>
    </Stack>
  );
}

function RuleGroup(props: { title: string }) {
  return (
    <Title order={2} c="white" size={20} fw={700} mt={10}>
      {props.title}
    </Title>
  );
}

function Conduct() {
  return (
    <Stack gap={18}>
      <Box c="rgba(255,255,255,0.75)" fz={14} style={{ lineHeight: 1.7 }}>
        <Text>
          Here you will find our rules on conduct and the limits that keep the
          guild fair and welcoming. Our Terms of Use apply alongside these rules.
          They can change at any time, so please check back now and then. Most of
          the time we will let you know when something changes.
        </Text>
      </Box>

      <RuleGroup title="Standard Rules" />

      <PolicySection title="1. No flaming or spamming">
        <Text>
          Emotions can run high, but starting a flame war is never the way to
          settle things. At the end of the day we are all people behind the
          screen, so please stay civil. Spamming means posting nonsensical or off
          topic content; we have places for that, like the OOC thread and our
          Discord. Posting more than twice in a row is treated the same way, and
          it is enforced in the main adventures and mission threads.
        </Text>
      </PolicySection>
      <PolicySection title="2. Play fair">
        <Text>
          Roleplay is a two way street, and often a many way one. God-modding is
          not allowed, and neither is controlling another person's character or
          Pokemon without their consent, or making yourself or your Pokemon overly
          powerful or lucky. Deciding that your attack automatically hits someone
          else's character, or using several moves before anyone can react, are
          examples of unfair play. Please do not use an excessive number of
          attacks or Pokemon in a single post. If you think someone is playing
          unfairly, contact the staff.
        </Text>
      </PolicySection>
      <PolicySection title="3. Keep things to a PG-13 level">
        <Text>
          Keep everything appropriate for a PG-13 audience. Excessive profanity,
          sexual content and extreme violence are our strictest limit. Because
          this protects the whole community, you get one warning. After that we
          may remove your access without further warning.
        </Text>
      </PolicySection>
      <PolicySection title="4. Be active, but within your limits">
        <Text>
          We are relaxed about activity. Real life comes first, so never force
          yourself to be here at the cost of work, school or rest. Since
          characters can be tied up in a mission or team story, we only ask that
          you let staff know if you will be away for a while.
        </Text>
      </PolicySection>
      <PolicySection title="5. Obtaining items">
        <Text>
          Items must be bought or crafted in the Marketplace, or earned as rewards
          from adventures, missions, events or mystery boxes. Items obtained any
          other way are not allowed and will be removed, and coins or emblems may
          be revoked as well.
        </Text>
      </PolicySection>

      <RuleGroup title="Member-Specific Rules" />

      <PolicySection title="6. New members and characters">
        <Text>
          A new member or character starts with a Pokemon at its earliest stage
          that can then evolve normally. Mega Evolution does not count as a
          starting form. A character may begin as a non-legendary hybrid or as a
          channeler, but will not have abilities until they have completed the
          right Master Missions.
        </Text>
      </PolicySection>
      <PolicySection title="7. Personal character stories">
        <Text>
          By default, personal stories cannot involve key characters from the
          games. We are usually happy to work with you on ideas like this, so
          reach out to staff first.
        </Text>
      </PolicySection>
      <PolicySection title="8. Profiles">
        <Text>
          Your dashboard keeps your characters, teams, Pokemon and currency for
          you, so there is no separate listing to maintain by hand. Just keep your
          character details and each Pokemon's species accurate and up to date so
          everything can be referenced.
        </Text>
      </PolicySection>
      <PolicySection title="9. Mission creation">
        <Text>
          Missions and team missions are usually created by staff. If you have an
          idea for one, tell us; it might get used.
        </Text>
      </PolicySection>

      <RuleGroup title="Pokemon Limitations and Rules" />

      <PolicySection title="10. Obtaining and trading Pokemon">
        <Text>
          Unless staff say otherwise, a Pokemon is obtained during an adventure,
          mission, event or encounter, and catching one uses the right kind of
          ball. Eggs are provided and hatched by staff. Staff may rule an
          acquisition illegitimate and revoke the Pokemon. Trading happens only
          through the official swap, and a Pokemon can be traded only for another
          Pokemon, never given or sold between members.
        </Text>
      </PolicySection>
      <PolicySection title="11. Pokemon nicknames">
        <Text>
          If you nickname a Pokemon, we still need to know its exact species.
          Record the species in your profile and mention it in your posts. If we
          cannot tell the species, that Pokemon is not eligible for any evolution
          method and, in extreme cases, may be treated as illegitimately obtained.
        </Text>
      </PolicySection>
      <PolicySection title="12. Evolving and purifying Pokemon">
        <Text>
          Pokemon evolve by earning experience from your roleplay posts and
          reaching the level their species evolves at, or by using the correct
          evolution item, such as an evolution stone, from your bag. Shadow
          Pokemon are purified in a similar way, by building Purification Points,
          and also need the right item to finish purifying. Each Pokemon in your
          dashboard shows what it needs to evolve.
        </Text>
      </PolicySection>
      <PolicySection title="13. Abilities and moves">
        <Text>
          A Pokemon is caught with a single ability chosen from the ones it can
          have, and that choice is locked once you set it in your profile. An
          Ability Capsule lets a Pokemon carry a second ability, but only one of
          the two can be active in a given mission. Hybrids follow the same
          ability rules but cannot use the Ability Capsule.
        </Text>
      </PolicySection>
      <PolicySection title="Metronome">
        <Text>
          Metronome is random and should be played that way. It should not chain
          into a perfect combo like Hurricane into Thunder into Explosion. It
          cannot trigger Sketch, moves that belong only to legendary Pokemon such
          as Sacred Fire or Shadow Force, or any move Metronome cannot normally
          call.
        </Text>
      </PolicySection>
      <PolicySection title="Sketch">
        <Text>
          Sketch can copy up to ten moves total, and Smeargle must actually see a
          move before copying it. Sketched moves cannot be removed or replaced,
          cannot copy Transform or moves exclusive to legendary Pokemon, and
          should be listed in your profile.
        </Text>
      </PolicySection>
      <PolicySection title="Teleport">
        <Text>
          We allow Teleport, but we are not fond of it because it is easy to
          abuse. Outside of GRAY's Claydol, please avoid it without a good reason.
          Many important places use Ebonite, made from crushed Dark Gems, to block
          teleportation, and Kalos uses a teleport scrambler that makes the move a
          very bad idea.
        </Text>
      </PolicySection>

      <RuleGroup title="About these rules" />
      <PolicySection title="Fan project notice">
        <Text>
          Snagem Guild is a non-commercial, fan-made community. Pokemon and
          related names are trademarks of their respective owners. We are not
          affiliated with or endorsed by them.
        </Text>
      </PolicySection>
    </Stack>
  );
}

const TABS = [
  { value: "conduct", label: "Community Rules", content: <Conduct /> },
  { value: "privacy", label: "Privacy Policy", content: <Privacy /> },
  { value: "cookies", label: "Cookies & Cache", content: <Cookies /> },
  { value: "terms", label: "Terms of Use", content: <Terms /> },
];

export default function Policies() {
  const isMobile = useMediaQuery("(max-width: 800px)");
  const [searchParams, setSearchParams] = useSearchParams();
  // Allow deep links like /Policies?tab=conduct (the forum links here for rules).
  const requested = searchParams.get("tab");
  const active = TABS.some((t) => t.value === requested) ? requested : TABS[0].value;

  return (
    <Container size="md" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Stack gap={6} mb={20}>
        <Title order={1} c="white" size={30} fw={600}>
          Policies
        </Title>
        <Text fz={13} c="dimmed">
          Last updated {LAST_UPDATED}. If anything here is unclear, reach out to
          the staff team.
        </Text>
      </Stack>

      <Tabs
        value={active}
        onChange={(value) => {
          if (value) setSearchParams({ tab: value }, { replace: true });
        }}
        orientation={isMobile ? "horizontal" : "vertical"}
        variant="pills"
        color="grape"
        keepMounted={false}
      >
        <Tabs.List mb={isMobile ? 16 : 0} style={{ flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <Tabs.Tab key={t.value} value={t.value}>
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {TABS.map((t) => (
          <Tabs.Panel key={t.value} value={t.value} pl={isMobile ? 0 : 24}>
            {t.content}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Container>
  );
}
