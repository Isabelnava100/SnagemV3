import { Anchor, Box, Container, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useSearchParams } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "../../lib/contact";

/** The contact address, as an inline link. Policy copy repeats it a few times. */
function SupportLink() {
  return <Anchor href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</Anchor>;
}

/**
 * Public policies hub. Anyone (signed in or not) can read these. A sticky tab
 * rail on the left switches between documents in a single flat content panel,
 * so we can add more "boring but necessary" documents over time without new
 * routes. Snagem Guild is a non-commercial Pokemon fan community; copy is
 * written in that spirit and should be reviewed before launch.
 */

const LAST_UPDATED = "July 2026";
const DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const LINK = "#ddd6fe";

/** Big section heading at the top of each document (white with a gold accent). */
function SectionTitle(props: { children: React.ReactNode }) {
  return (
    <Title
      order={2}
      c="white"
      fz={{ base: 22, sm: 26 }}
      fw={700}
      style={{ fontFamily: DISPLAY, letterSpacing: "0.04em", margin: "0 0 8px" }}
    >
      {props.children}
    </Title>
  );
}

/**
 * A titled block of policy copy. `order` picks the visual tier:
 * 3 (default) is a red Quantico sub-header (privacy/cookies/terms/credits);
 * 4 is a gold rule title used for the numbered rules under a group header.
 */
function PolicySection(props: {
  title: string;
  order?: 3 | 4;
  children: React.ReactNode;
}) {
  const order = props.order ?? 3;
  const isRule = order === 4;
  return (
    <Stack gap={8}>
      <Title
        order={order}
        c={isRule ? "#FFD074" : "#E54156"}
        fz={isRule ? 15 : 16}
        fw={700}
        tt={isRule ? undefined : "uppercase"}
        style={{
          fontFamily: DISPLAY,
          letterSpacing: isRule ? "0.04em" : "0.14em",
          margin: 0,
        }}
      >
        {props.title}
      </Title>
      <Box c="#b6b1bc" fz={16} style={{ lineHeight: 1.8 }}>
        {props.children}
      </Box>
    </Stack>
  );
}

/** Red uppercase group divider inside the Community Rules document. */
function RuleGroup(props: { title: string }) {
  return (
    <Title
      order={3}
      c="#E54156"
      fz={16}
      fw={700}
      tt="uppercase"
      style={{ fontFamily: DISPLAY, letterSpacing: "0.14em", margin: "18px 0 0" }}
    >
      {props.title}
    </Title>
  );
}

export function Privacy() {
  return (
    <Stack gap={20}>
      <SectionTitle>
        PRIVACY <span style={{ color: "#FFD074" }}>POLICY</span>
      </SectionTitle>
      <PolicySection title="Our promise">
        <Text inherit>
          We will never sell your personal information or anything you post, and
          we will never hand it to advertisers or data brokers. Snagem Guild is a
          community project, not a business built on your data. We only collect
          what the site needs to work and to keep the community safe.
        </Text>
      </PolicySection>
      <PolicySection title="What we collect">
        <Text inherit component="div">
          The information tied to your account, all of which you provide or
          create:
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.9 }}>
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
        <Text inherit>
          Your information runs the site: signing you in, showing your profile,
          characters, and posts, tracking your in-game progress, delivering
          notifications you have turned on, and letting staff keep the community
          safe. We use your email only for account matters such as password
          resets and, if you enable them, activity notifications. We do not use
          your information for advertising.
        </Text>
      </PolicySection>
      <PolicySection title="Where it is stored">
        <Text inherit>
          The site runs on Google Firebase (accounts, database, and image
          storage) and is hosted on Netlify. Your data lives in these services on
          our behalf, each under its own security and privacy terms. Connecting
          Discord shares only the identifiers needed for the link and the
          notifications you request. We do not add any third-party advertising or
          cross-site tracking.
        </Text>
      </PolicySection>
      <PolicySection title="Who can see your content">
        <Text inherit>
          Anything you post publicly (forum posts, your public profile, showcased
          characters or teams) is visible to other visitors by design. Private
          items such as drafts and your settings are visible only to you and to
          staff who need them to run the site and enforce the rules.
        </Text>
      </PolicySection>
      <PolicySection title="Keeping and deleting data">
        <Text inherit>
          We keep your information for as long as your account is active. You can
          edit or remove most of your profile content at any time from your
          dashboard, and change notification settings under Settings. To delete
          your account, or to ask what we hold about you, write to <SupportLink />
          {" "}and we will take care of it. Some posts may remain in shared threads for
          context, with your name removed on request where practical.
        </Text>
      </PolicySection>
      <PolicySection title="Children">
        <Text inherit>
          Snagem Guild is meant for teenagers and adults. If you believe a child
          has given us personal information without a guardian&apos;s consent, write to{" "}
          <SupportLink /> and we will remove it.
        </Text>
      </PolicySection>
      <PolicySection title="How to reach us">
        <Text inherit>
          Privacy questions, data requests, and account deletions all go to{" "}
          <SupportLink />. It reaches the guild staff directly, and we answer as soon as we can.
        </Text>
      </PolicySection>
    </Stack>
  );
}

export function Cookies() {
  return (
    <Stack gap={20}>
      <SectionTitle>
        COOKIES <span style={{ color: "#FFD074" }}>&amp; CACHE</span>
      </SectionTitle>
      <PolicySection title="Cookies and local storage">
        <Text inherit>
          We use a small number of cookies and browser local storage to keep you
          signed in and to remember preferences such as your reading text size.
          These are essential to how the site works. We do not use advertising or
          cross-site tracking cookies.
        </Text>
      </PolicySection>
      <PolicySection title="Caching">
        <Text inherit>
          To keep the site fast we cache data in your browser and through our
          hosting provider. Pages and images may be served from a cached copy for
          a short time, so a recent change can take a moment to appear. You can
          force a fresh copy by reloading the page.
        </Text>
      </PolicySection>
      <PolicySection title="Clearing your data">
        <Text inherit>
          Clearing your browser's cookies and site data will sign you out and
          reset local preferences. The site will recreate the essential ones the
          next time you sign in.
        </Text>
      </PolicySection>
    </Stack>
  );
}

export function Terms() {
  return (
    <Stack gap={20}>
      <SectionTitle>
        TERMS <span style={{ color: "#FFD074" }}>OF USE</span>
      </SectionTitle>
      <PolicySection title="Using the site">
        <Text inherit>
          Snagem Guild is a free community for members who agree to follow these
          terms and our community rules. Keep your login secure, and do not
          attempt to break, overload, or gain unauthorized access to the site or
          other members' accounts.
        </Text>
      </PolicySection>
      <PolicySection title="Your content">
        <Text inherit>
          You keep ownership of what you write and create here. By posting, you
          give us permission to display and store your content so the site can
          run. You are responsible for what you post and confirm you have the
          right to share it.
        </Text>
      </PolicySection>
      <PolicySection title="Accounts and access">
        <Text inherit>
          Staff may edit, hide, or remove content, and may suspend or close
          accounts that break the rules. We may update these terms as the site
          grows; continued use after a change means you accept the updated terms.
        </Text>
      </PolicySection>
    </Stack>
  );
}

export function Conduct() {
  return (
    <Stack gap={16}>
      <SectionTitle>
        COMMUNITY <span style={{ color: "#FFD074" }}>RULES</span>
      </SectionTitle>
      <Box c="#b6b1bc" fz={16} style={{ lineHeight: 1.8 }}>
        <Text inherit>
          Here you will find our rules on conduct and the limits that keep the
          guild fair and welcoming. Our Terms of Use apply alongside these rules.
          They can change at any time, so please check back now and then. Most of
          the time we will let you know when something changes.
        </Text>
      </Box>

      <RuleGroup title="Standard Rules" />

      <PolicySection order={4} title="1. No flaming or spamming">
        <Text inherit>
          Emotions can run high, but starting a flame war is never the way to
          settle things. At the end of the day we are all people behind the
          screen, so please stay civil. Spamming means posting nonsensical or off
          topic content; we have places for that, like the OOC thread and our
          Discord. Posting more than twice in a row is treated the same way, and
          it is enforced in the main adventures and mission threads.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="2. Play fair">
        <Text inherit>
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
      <PolicySection order={4} title="3. Keep things to a PG-13 level">
        <Text inherit>
          Keep everything appropriate for a PG-13 audience. Excessive profanity,
          sexual content and extreme violence are our strictest limit. Because
          this protects the whole community, you get one warning. After that we
          may remove your access without further warning.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="4. Be active, but within your limits">
        <Text inherit>
          We are relaxed about activity. Real life comes first, so never force
          yourself to be here at the cost of work, school or rest. Since
          characters can be tied up in a mission or team story, we only ask that
          you let staff know if you will be away for a while.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="5. Obtaining items">
        <Text inherit>
          Items must be bought or crafted in the Marketplace, or earned as rewards
          from adventures, missions, events or mystery boxes. Items obtained any
          other way are not allowed and will be removed, and coins or emblems may
          be revoked as well.
        </Text>
      </PolicySection>

      <RuleGroup title="Member-Specific Rules" />

      <PolicySection order={4} title="6. New members and characters">
        <Text inherit>
          A new member or character starts with a Pokemon at its earliest stage
          that can then evolve normally. Mega Evolution does not count as a
          starting form. A character may begin as a non-legendary hybrid or as a
          channeler, but will not have abilities until they have completed the
          right Master Missions.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="7. Personal character stories">
        <Text inherit>
          By default, personal stories cannot involve key characters from the
          games. We are usually happy to work with you on ideas like this, so
          reach out to staff first.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="8. Profiles">
        <Text inherit>
          Your dashboard keeps your characters, teams, Pokemon and currency for
          you, so there is no separate listing to maintain by hand. Just keep your
          character details and each Pokemon's species accurate and up to date so
          everything can be referenced.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="9. Mission creation">
        <Text inherit>
          Missions and team missions are usually created by staff. If you have an
          idea for one, tell us; it might get used.
        </Text>
      </PolicySection>

      <RuleGroup title="Pokemon Limitations and Rules" />

      <PolicySection order={4} title="10. Obtaining and trading Pokemon">
        <Text inherit>
          Unless staff say otherwise, a Pokemon is obtained during an adventure,
          mission, event or encounter, and catching one uses the right kind of
          ball. Eggs are provided and hatched by staff. Staff may rule an
          acquisition illegitimate and revoke the Pokemon. Trading happens only
          through the official swap, and a Pokemon can be traded only for another
          Pokemon, never given or sold between members.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="11. Pokemon nicknames">
        <Text inherit>
          If you nickname a Pokemon, we still need to know its exact species.
          Record the species in your profile and mention it in your posts. If we
          cannot tell the species, that Pokemon is not eligible for any evolution
          method and, in extreme cases, may be treated as illegitimately obtained.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="12. Evolving and purifying Pokemon">
        <Text inherit>
          Pokemon evolve by earning experience from your roleplay posts and
          reaching the level their species evolves at, or by using the correct
          evolution item, such as an evolution stone, from your bag. Shadow
          Pokemon are purified in a similar way, by building Purification Points,
          and also need the right item to finish purifying. Each Pokemon in your
          dashboard shows what it needs to evolve.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="13. Abilities and moves">
        <Text inherit>
          A Pokemon is caught with a single ability chosen from the ones it can
          have, and that choice is locked once you set it in your profile. An
          Ability Capsule lets a Pokemon carry a second ability, but only one of
          the two can be active in a given mission. Hybrids follow the same
          ability rules but cannot use the Ability Capsule.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="Metronome">
        <Text inherit>
          Metronome is random and should be played that way. It should not chain
          into a perfect combo like Hurricane into Thunder into Explosion. It
          cannot trigger Sketch, moves that belong only to legendary Pokemon such
          as Sacred Fire or Shadow Force, or any move Metronome cannot normally
          call.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="Sketch">
        <Text inherit>
          Sketch can copy up to ten moves total, and Smeargle must actually see a
          move before copying it. Sketched moves cannot be removed or replaced,
          cannot copy Transform or moves exclusive to legendary Pokemon, and
          should be listed in your profile.
        </Text>
      </PolicySection>
      <PolicySection order={4} title="Teleport">
        <Text inherit>
          We allow Teleport, but we are not fond of it because it is easy to
          abuse. Outside of GRAY's Claydol, please avoid it without a good reason.
          Many important places use Ebonite, made from crushed Dark Gems, to block
          teleportation, and Kalos uses a teleport scrambler that makes the move a
          very bad idea.
        </Text>
      </PolicySection>

      <RuleGroup title="About these rules" />
      <PolicySection order={4} title="Fan project notice">
        <Text inherit>
          Snagem Guild is a non-commercial, fan-made community. Pokemon and
          related names are trademarks of their respective owners. We are not
          affiliated with or endorsed by them.
        </Text>
      </PolicySection>
    </Stack>
  );
}

export function Credits() {
  return (
    <Stack gap={20}>
      <SectionTitle>
        CRE<span style={{ color: "#FFD074" }}>DITS</span>
      </SectionTitle>
      <Box c="#b6b1bc" fz={16} style={{ lineHeight: 1.8 }}>
        <Text inherit>
          All artwork used on this site is properly licensed, purchased,
          commissioned, or drawn by our team. Thank you to everyone who helped
          build Snagem Guild.
        </Text>
      </Box>

      <PolicySection title="Art">
        <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.9 }}>
          <li>
            <a
              href="https://www.instagram.com/seviyummy/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: LINK }}
            >
              Seviyummy
            </a>{" "}
            (Pokemon art)
          </li>
          <li>
            <a
              href="https://www.instagram.com/batskystarman/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: LINK }}
            >
              Batsky
            </a>{" "}
            (Team art)
          </li>
          <li>Dan (Menu icon designs)</li>
        </ul>
      </PolicySection>

      <PolicySection title="Site build">
        <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.9 }}>
          <li>
            <a
              href="https://www.linkedin.com/in/isabel-virginia-nava/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: LINK }}
            >
              inavaCL
            </a>{" "}
            (Website build and management)
          </li>
        </ul>
      </PolicySection>
    </Stack>
  );
}

const TABS = [
  { value: "conduct", label: "Community Rules", content: <Conduct /> },
  { value: "privacy", label: "Privacy Policy", content: <Privacy /> },
  { value: "cookies", label: "Cookies & Cache", content: <Cookies /> },
  { value: "terms", label: "Terms of Use", content: <Terms /> },
  { value: "credits", label: "Credits", content: <Credits /> },
];

export default function Policies() {
  const isMobile = useMediaQuery("(max-width: 800px)");
  const [searchParams, setSearchParams] = useSearchParams();
  // Allow deep links like /Policies?tab=conduct (the forum links here for rules).
  const requested = searchParams.get("tab");
  // TABS is a non-empty constant, so the first entry always exists.
  const fallbackTab = TABS[0]!;
  const active = TABS.some((t) => t.value === requested)
    ? (requested as string)
    : fallbackTab.value;
  const activeTab = TABS.find((t) => t.value === active) ?? fallbackTab;

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      {/* Tab deep links keep the base /Policies canonical; only the title varies. */}
      <Seo
        page="/Policies"
        title={requested ? `${activeTab.label} | Snagem Guild` : undefined}
      />
      <PageHero
        eyebrow="House Rules"
        title="Policies"
        subtitle={`Community rules, privacy, cookies, terms, and credits. Last updated ${LAST_UPDATED}.`}
        mb={isMobile ? 20 : 28}
      />

      <Box
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 20 : 40,
          alignItems: "flex-start",
        }}
      >
        <Box
          component="nav"
          aria-label="Policy sections"
          style={{
            flex: "none",
            width: isMobile ? "100%" : 260,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            position: isMobile ? "static" : "sticky",
            top: 96,
          }}
        >
          {TABS.map((t) => {
            const on = t.value === active;
            return (
              <UnstyledButton
                key={t.value}
                onClick={() =>
                  setSearchParams({ tab: t.value }, { replace: true })
                }
                aria-current={on ? "page" : undefined}
                style={{
                  textAlign: "left",
                  border: `1px solid ${on ? "#E54156" : "#2a2637"}`,
                  borderLeft: on ? "3px solid #E54156" : "1px solid #2a2637",
                  background: on
                    ? "linear-gradient(90deg, rgba(229,65,86,.18), #17151c)"
                    : "#17151c",
                  color: "#fff",
                  fontFamily: DISPLAY,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "16px 18px",
                }}
                sx={{ "&:hover": { background: on ? undefined : "#1c1a22" } }}
              >
                {t.label}
              </UnstyledButton>
            );
          })}
        </Box>

        <Box
          style={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            background: "#17151c",
            border: "1px solid #2a2637",
            padding: isMobile ? "24px 20px" : "40px 44px",
          }}
        >
          {activeTab.content}
        </Box>
      </Box>
    </Container>
  );
}
