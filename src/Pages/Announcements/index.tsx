import { Badge, Box, Card, Container, Group, List, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import {
  IconBell,
  IconBuildingStore,
  IconMessages,
  IconSparkles,
  IconSword,
  IconUsers,
} from "@tabler/icons-react";
import { PageHero } from "../../components/common/PageHero";

/**
 * Public "what's new / what's here" page. Anyone (signed in or not) can read
 * it, and the homepage "See Anticipated Updates" button links here.
 *
 * Two parts:
 *   1. Development updates: a running log of changes, newest first.
 *   2. A quick summary of everything the site can do.
 *
 * To post a new development update, add an object to the TOP of the
 * ANNOUNCEMENTS array below. Keep bodies short and plain-spoken.
 */

type Announcement = {
  /** Human date, e.g. "July 17, 2026". */
  date: string;
  title: string;
  /** Optional small label such as "New", "Update", or "Fix". */
  tag?: string;
  body: React.ReactNode;
};

const ANNOUNCEMENTS: Announcement[] = [
  {
    date: "July 17, 2026",
    tag: "New",
    title: "Announcements page is live",
    body:
      "This is where we will share what we are building and fixing as it happens. Check back for development updates, and scroll down for a quick tour of everything the guild can do today.",
  },
];

type FeatureGroup = {
  icon: React.ReactNode;
  title: string;
  items: string[];
};

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    icon: <IconMessages size={22} />,
    title: "Roleplay & forums",
    items: [
      "Forums custom built for Pokemon roleplay",
      "Earn experience and friendship just by posting",
      "Training logs, missions, and team stories",
    ],
  },
  {
    icon: <IconUsers size={22} />,
    title: "Your dashboard",
    items: [
      "Characters, teams, and Pokemon in one place",
      "Bag, items, and currency",
      "Bookmarks, drafts, and post history",
    ],
  },
  {
    icon: <IconSword size={22} />,
    title: "Gameplay",
    items: [
      "Missions and Master clearances",
      "Colosseum training and Challenges",
      "Casino, lottery, and the weekly Snag List",
      "Safari Contest events",
    ],
  },
  {
    icon: <IconSparkles size={22} />,
    title: "Grow your Pokemon",
    items: [
      "Evolve through roleplay and evolution items",
      "Shadow Pokemon and purification",
      "Research and progression tracking",
    ],
  },
  {
    icon: <IconBuildingStore size={22} />,
    title: "Shop & economy",
    items: [
      "Marketplace to buy and craft items",
      "Earn coins and rewards from adventures",
      "Guides in the Library",
    ],
  },
  {
    icon: <IconBell size={22} />,
    title: "Community",
    items: [
      "Public profiles and a member directory",
      "On-site and optional Discord notifications",
      "Accessibility and reading-size settings",
    ],
  },
];

export default function Announcements() {
  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <PageHero
        eyebrow="What's New"
        title="Announcements"
        subtitle="Development updates and a quick tour of everything the Snagem Guild can do."
        mb={24}
      />

      <Stack gap={32}>
        <Box component="section" aria-labelledby="dev-updates-heading">
          <Title id="dev-updates-heading" order={2} c="white" size={26} fw={700} mb={16}>
            Development updates
          </Title>
          <Stack gap={16}>
            {ANNOUNCEMENTS.map((a) => (
              <Card
                key={`${a.date}-${a.title}`}
                withBorder
                radius="md"
                padding="lg"
                style={{ background: "rgba(0,0,0,0.25)" }}
              >
                <Group gap={10} mb={6} wrap="wrap">
                  {a.tag && (
                    <Badge color="grape" variant="light" radius="sm">
                      {a.tag}
                    </Badge>
                  )}
                  <Text fz={14} c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: 0.5 }}>
                    {a.date}
                  </Text>
                </Group>
                <Title order={3} c="white" size={22} fw={600} mb={6}>
                  {a.title}
                </Title>
                <Text c="rgba(255,255,255,0.75)" fz={16} style={{ lineHeight: 1.7 }}>
                  {a.body}
                </Text>
              </Card>
            ))}
          </Stack>
        </Box>

        <Box component="section" aria-labelledby="features-heading">
          <Title id="features-heading" order={2} c="white" size={26} fw={700} mb={4}>
            Everything you can do
          </Title>
          <Text c="dimmed" fz={16} mb={16}>
            A quick summary of the guild's features. There is more waiting inside.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16}>
            {FEATURE_GROUPS.map((group) => (
              <Card
                key={group.title}
                withBorder
                radius="md"
                padding="lg"
                style={{ background: "rgba(0,0,0,0.25)" }}
              >
                <Group gap={10} mb={10} wrap="nowrap">
                  <Box c="grape.3" style={{ display: "flex" }}>
                    {group.icon}
                  </Box>
                  <Title order={3} c="white" size={20} fw={600}>
                    {group.title}
                  </Title>
                </Group>
                <List
                  spacing={6}
                  size="sm"
                  c="rgba(255,255,255,0.75)"
                  style={{ lineHeight: 1.6, listStyleType: "disc" }}
                >
                  {group.items.map((item) => (
                    <List.Item key={item}>{item}</List.Item>
                  ))}
                </List>
              </Card>
            ))}
          </SimpleGrid>
        </Box>
      </Stack>
    </Container>
  );
}
