import { Box, Button, Divider, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

const displayFont = "var(--font-display, 'Quantico', sans-serif)";
import React from "react";
import { ActivityLog } from "../../components/admin/ActivityLog";
import DesignSystem from "../../components/admin/DesignSystem";
import DevBoard from "../User/Dashboard/Admin/DevBoard";
import EmailTemplates from "../User/Dashboard/Admin/EmailTemplates";
import { Capability } from "../../components/types/typesUsed";
import { useAuth } from "../../context/AuthContext";
import { hasCapability, isAdmin } from "../../lib/permissions";
import AdjustLists from "../User/Dashboard/Admin/AdjustLists";
import SafariContest from "../User/Dashboard/Admin/SafariContest";
import Announcements from "../User/Dashboard/Admin/Announcements";
import Badges from "../User/Dashboard/Admin/Badges";
import Donate from "../User/Dashboard/Admin/Donate";
import MysteryBoxes from "../User/Dashboard/Admin/MysteryBoxes";
import {
  BattleCostsSection,
  CapabilityChecklist,
  LevelingCurveSection,
  XPDefaultsSection,
} from "../User/Dashboard/Admin/Permissions";
import { BattleRankingsForm, ChallengeStepForm } from "../User/Dashboard/Admin/Grading";

type ToolKey =
  | "roles"
  | "grant"
  | "battle"
  | "lists"
  | "safari"
  | "announcements"
  | "boxes"
  | "badges"
  | "xp"
  | "costs"
  | "design"
  | "devboard"
  | "emails"
  | "logs";

interface Tool {
  key: ToolKey;
  label: string;
  desc: string;
  /** Capability that unlocks it; null = admin-only. */
  cap: Capability | null;
  render: () => React.ReactNode;
}

interface ToolGroup {
  title: string;
  subtitle: string;
  dot: string;
  tools: Tool[];
}

const GROUPS: ToolGroup[] = [
  {
    title: "Members & Access",
    subtitle: "People management: roles, capabilities, and direct grants.",
    dot: "#c026d3",
    tools: [
      {
        key: "roles",
        label: "Roles & Permissions",
        desc: "Set trust tier and toggle director capabilities.",
        cap: null,
        render: () => <CapabilityChecklist />,
      },
      {
        key: "grant",
        label: "Grant to Users",
        desc: "Send items, currency, Pokemon to members.",
        cap: Capability.GiveItems,
        render: () => <Donate />,
      },
      {
        key: "battle",
        label: "Battle & Challenge",
        desc: "Award ranking points; record challenge steps.",
        cap: Capability.ReviewRewards,
        render: () => (
          <Stack gap={16}>
            <BattleRankingsForm />
            <ChallengeStepForm />
          </Stack>
        ),
      },
    ],
  },
  {
    title: "Game Content",
    subtitle: "Everything players see: encounter lists, boxes, badges and announcements.",
    dot: "#3b82f6",
    tools: [
      {
        key: "lists",
        label: "Encounter Lists",
        desc: "Groups with only-these / all-except rules.",
        cap: Capability.ManageLists,
        render: () => <AdjustLists />,
      },
      {
        key: "safari",
        label: "Safari Contest",
        desc: "Star-tiered wild hunt: set pools and rates, then launch.",
        cap: Capability.HostEvents,
        render: () => <SafariContest />,
      },
      {
        key: "announcements",
        label: "Announcements",
        desc: "Dashboard banner with read-state reset.",
        cap: Capability.ManageLists,
        render: () => <Announcements />,
      },
      {
        key: "boxes",
        label: "Mystery Boxes",
        desc: "Reward pools with weighted drops.",
        cap: Capability.ManageLists,
        render: () => <MysteryBoxes />,
      },
      {
        key: "badges",
        label: "Badges",
        desc: "Gradient badges, defaults, assignment.",
        cap: Capability.ManageBadges,
        render: () => <Badges />,
      },
    ],
  },
  {
    title: "Game Balance",
    subtitle: "The numbers behind the game: XP curve and battle costs.",
    dot: "#14b8a6",
    tools: [
      {
        key: "xp",
        label: "XP & Leveling",
        desc: "Per-post defaults and the level curve.",
        cap: Capability.AdjustXP,
        render: () => (
          <Stack gap={20}>
            <XPDefaultsSection />
            <LevelingCurveSection />
          </Stack>
        ),
      },
      {
        key: "costs",
        label: "Battle Costs",
        desc: "Posts to defeat bosses / capture encounters.",
        cap: Capability.AdjustXP,
        render: () => <BattleCostsSection />,
      },
    ],
  },
  {
    title: "Reference",
    subtitle: "Brand and design guidance, plus the staff audit trail.",
    dot: "#a78bfa",
    tools: [
      {
        key: "emails",
        label: "Email Templates",
        desc: "Build branded emails with a live preview; copy the HTML to send.",
        cap: null,
        render: () => <EmailTemplates />,
      },
      {
        key: "devboard",
        label: "Dev Board",
        desc: "Member suggestions and bug reports, dev tickets, and admin planning notes.",
        cap: null,
        render: () => <DevBoard />,
      },
      {
        key: "design",
        label: "Design System",
        desc: "Brand kit: colors, fonts, buttons and surfaces at a glance.",
        cap: null,
        render: () => <DesignSystem />,
      },
      {
        key: "logs",
        label: "Activity Log",
        desc: "Every staff action, most recent first.",
        cap: null,
        render: () => <ActivityLog title="Staff activity log" max={120} />,
      },
    ],
  },
];

const ALL_TOOLS: Tool[] = GROUPS.flatMap((g) => g.tools);

function ToolCard(props: { tool: Tool; onOpen: () => void }) {
  return (
    <Stack gap={10} p={20} h="100%" className="dc-card-tile">
      <Box style={{ minWidth: 0, flex: 1 }}>
        <Text fw={700} fz={16} c="white" mb={4}>
          {props.tool.label}
        </Text>
        <Text fz={13} c="#b6b1bc" style={{ lineHeight: 1.5 }}>
          {props.tool.desc}
        </Text>
      </Box>
      <button
        type="button"
        className="dc-open-btn"
        onClick={props.onOpen}
        aria-label={`Open ${props.tool.label}`}
      >
        Open →
      </button>
    </Stack>
  );
}

export default function Manage() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const [selected, setSelected] = React.useState<ToolKey | null>(null);

  const canSee = (tool: Tool) => admin || (tool.cap !== null && hasCapability(user, tool.cap));

  const active = selected ? ALL_TOOLS.find((t) => t.key === selected) : null;
  // Guard against a selected tool the user can't actually see.
  if (active && !canSee(active)) {
    setSelected(null);
    return null;
  }

  if (active) {
    return (
      <Stack gap="md">
        <Box>
          <Text fz={34} fw={800} c="white">
            {active.label}
          </Text>
          <Text fz={16} c="dimmed" mt={4}>
            {active.desc}
          </Text>
        </Box>
        <Button
          variant="light"
          color="grape"
          radius="xl"
          w="fit-content"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => setSelected(null)}
        >
          All tools
        </Button>
        <Divider color="#2a2637" />
        <Box>{active.render()}</Box>
      </Stack>
    );
  }

  const visibleGroups = GROUPS.map((g) => ({ ...g, tools: g.tools.filter(canSee) })).filter(
    (g) => g.tools.length
  );

  return (
    <Stack gap="xl">
      <Box>
        <Group gap={10} align="center" mb={4}>
          <Box w={28} h={3} style={{ background: "#E54156" }} />
          <Text
            fz={13}
            fw={700}
            c="#FFD074"
            tt="uppercase"
            style={{ fontFamily: displayFont, letterSpacing: "0.3em" }}
          >
            Manage
          </Text>
        </Group>
        <Text
          component="h2"
          fz={{ base: 24, sm: 30 }}
          fw={700}
          c="white"
          style={{ fontFamily: displayFont, letterSpacing: "0.02em", margin: 0 }}
        >
          Every Tool, Four Areas
        </Text>
        <Text fz={15} c="#b6b1bc" mt={4}>
          All editors and config, grouped so you always know where a tool lives.
        </Text>
      </Box>

      {visibleGroups.map((g) => (
        <Box
          key={g.title}
          p={{ base: 20, sm: 28 }}
          style={{
            background: "#17151c",
            border: "1px solid #2a2637",
            clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)",
          }}
        >
          <Group gap={10} mb={4} align="center">
            <Box className="dc-diamond" style={{ background: g.dot }} />
            <Text
              fz={21}
              fw={700}
              c="white"
              style={{ fontFamily: displayFont, letterSpacing: "0.03em" }}
            >
              {g.title}
            </Text>
          </Group>
          <Text fz={14} c="#b6b1bc" mb="md">
            {g.subtitle}
          </Text>
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing={14}>
            {g.tools.map((t) => (
              <ToolCard key={t.key} tool={t} onOpen={() => setSelected(t.key)} />
            ))}
          </SimpleGrid>
        </Box>
      ))}

      <Text fz={13} c="#6f6a78">
        Every tool from the old admin tabs lives under one of these groups. Directors only see the
        groups they have a capability for.
      </Text>
    </Stack>
  );
}
