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

function Conduct() {
  return (
    <Stack gap={20}>
      <PolicySection title="Be respectful">
        <Text>
          Treat everyone with courtesy. Harassment, hate speech, threats, and
          personal attacks are not allowed. Disagreements happen; keep them civil.
        </Text>
      </PolicySection>
      <PolicySection title="Keep it appropriate">
        <Text>
          Post content that fits a community that welcomes a wide range of ages.
          No explicit, graphic, or illegal material, and no spam or advertising
          without staff approval.
        </Text>
      </PolicySection>
      <PolicySection title="Roleplay fairly">
        <Text>
          Play in good faith: no metagaming, no controlling other members'
          characters without permission, and follow the rules of each forum and
          event. Staff decisions on in-game matters are final.
        </Text>
      </PolicySection>
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
  { value: "privacy", label: "Privacy Policy", content: <Privacy /> },
  { value: "cookies", label: "Cookies & Cache", content: <Cookies /> },
  { value: "terms", label: "Terms of Use", content: <Terms /> },
  { value: "conduct", label: "Community Rules", content: <Conduct /> },
];

export default function Policies() {
  const isMobile = useMediaQuery("(max-width: 800px)");
  const [searchParams, setSearchParams] = useSearchParams();
  // Allow deep links like /Policies?tab=conduct (the forum links here for rules).
  const requested = searchParams.get("tab");
  const active = TABS.some((t) => t.value === requested) ? requested : "privacy";

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
