import { Box, Button, Divider, Group, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import React from "react";
import { ActivityLog } from "../../components/admin/ActivityLog";
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
    title: "Logs",
    subtitle: "Audit trail of every staff action.",
    dot: "#a78bfa",
    tools: [
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

function capPill(cap: Capability | null): string {
  return cap === null ? "admin" : `cap ${cap}`;
}

function ToolCard(props: { tool: Tool; onOpen: () => void }) {
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      gap="md"
      p="md"
      style={{ borderRadius: 12, background: "#141318", border: "1px solid #232028" }}
    >
      <Box style={{ minWidth: 0 }}>
        <Group gap={8} wrap="nowrap" mb={2}>
          <Text fw={700} c="white" lineClamp={1}>
            {props.tool.label}
          </Text>
          <Text
            fz={11}
            fw={600}
            c="grape.3"
            px={8}
            py={2}
            style={{ borderRadius: 6, background: "rgba(160,120,220,0.14)", whiteSpace: "nowrap" }}
          >
            {capPill(props.tool.cap)}
          </Text>
        </Group>
        <Text fz={13} c="dimmed" lineClamp={1}>
          {props.tool.desc}
        </Text>
      </Box>
      <Button
        variant="default"
        radius="xl"
        rightSection={<IconArrowRight size={16} />}
        onClick={props.onOpen}
        style={{ flexShrink: 0 }}
      >
        Open
      </Button>
    </Group>
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
          <Text fz={30} fw={800} c="white">
            {active.label}
          </Text>
          <Text fz={14} c="dimmed" mt={4}>
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
        <Text fz={30} fw={800} c="white">
          Manage
        </Text>
        <Text fz={14} c="dimmed" mt={4}>
          All editors and config, grouped into {visibleGroups.length}{" "}
          {visibleGroups.length === 1 ? "area" : "areas"}.
        </Text>
      </Box>

      <Group gap={10} wrap="wrap">
        {visibleGroups.map((g) => (
          <Text
            key={g.title}
            fz={13}
            fw={600}
            c="dimmed"
            px={14}
            py={6}
            style={{ borderRadius: 999, background: "#1c1a26", border: "1px solid #2a2637" }}
          >
            {g.title}
          </Text>
        ))}
      </Group>

      {visibleGroups.map((g) => (
        <Box
          key={g.title}
          p="lg"
          style={{ borderRadius: 16, background: "#17151c", border: "1px solid #232028" }}
        >
          <Group gap={10} mb={4}>
            <Box style={{ width: 10, height: 10, borderRadius: "50%", background: g.dot }} />
            <Text fz={20} fw={800} c="white">
              {g.title}
            </Text>
          </Group>
          <Text fz={13} c="dimmed" mb="md">
            {g.subtitle}
          </Text>
          <Stack gap={12}>
            {g.tools.map((t) => (
              <ToolCard key={t.key} tool={t} onOpen={() => setSelected(t.key)} />
            ))}
          </Stack>
        </Box>
      ))}

      <Text fz={13} c="dimmed">
        Every tool from the old admin tabs lives under one of these groups. Directors only see the
        groups they have a capability for: the cap pill shows which.
      </Text>
    </Stack>
  );
}
