import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCoin, IconSearch, IconStar } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { getCurrencies } from "../../queries/dashboard";
import { getMissions, Mission } from "../../queries/missions";

/**
 * Public Missions page (Mission Vault). Members browse always-available mission
 * briefs, filter by reward type, and open a detail modal. Picking one up and
 * grading happen in the Quests forum, so nothing here writes to the database.
 */

type FilterKey =
  | "all"
  | "emblem"
  | "snag"
  | "catch"
  | "recruit"
  | "egg"
  | "special";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All Rewards" },
  { key: "emblem", label: "Emblem Pieces" },
  { key: "snag", label: "Snag" },
  { key: "catch", label: "Catch" },
  { key: "recruit", label: "Recruit" },
  { key: "egg", label: "Egg" },
  { key: "special", label: "Special Item" },
];

const TIER_COLOR: Record<string, string> = {
  Story: "grape",
  Standard: "teal",
  Master: "violet",
  Exceptional: "orange",
};

const REWARD_LABEL: Record<string, string> = {
  snag: "Snag a Pokemon",
  catch: "Catch a Pokemon",
  recruit: "Recruit a Pokemon",
  egg: "Pokemon Egg",
};

/** Turn stored HTML into plain text for the card preview line. */
function htmlToText(html?: string): string {
  if (!html) return "";
  const el = document.createElement("div");
  el.innerHTML = DOMPurify.sanitize(html);
  return (el.textContent || el.innerText || "").trim();
}

/** Normalize a string | string[] field into an array of lines. */
function toLines(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function matchesFilter(mission: Mission, filter: FilterKey): boolean {
  switch (filter) {
    case "all":
      return true;
    case "emblem":
      return !!mission.emblem_eligible;
    case "special":
      return !!mission.special_item;
    case "snag":
    case "catch":
    case "recruit":
    case "egg":
      return mission.pokemon_reward?.kind === filter;
    default:
      return true;
  }
}

function StatChip(props: { value: string; label: string; gold?: boolean }) {
  return (
    <Box
      bg="rgba(0,0,0,0.35)"
      px={16}
      py={8}
      style={{ borderRadius: 12, textAlign: "center", minWidth: 92 }}
    >
      <Text fz={24} fw={700} c={props.gold ? "#F5C842" : "white"} lh={1.1}>
        {props.value}
      </Text>
      <Text fz={10} fw={600} c="dimmed" style={{ letterSpacing: 0.5 }}>
        {props.label}
      </Text>
    </Box>
  );
}

function RewardChip(props: { label: string; dot?: string; icon?: React.ReactNode }) {
  return (
    <Group
      gap={6}
      wrap="nowrap"
      bg="rgba(255,255,255,0.05)"
      px={8}
      py={4}
      style={{ borderRadius: 8 }}
    >
      {props.icon}
      {props.dot && (
        <Box
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: props.dot,
          }}
        />
      )}
      <Text fz={11} c="white">
        {props.label}
      </Text>
    </Group>
  );
}

function MissionCard(props: { mission: Mission; onOpen: () => void }) {
  const { mission } = props;
  const preview =
    htmlToText(mission.story) ||
    mission.pokemon_note ||
    toLines(mission.objective).join(" ") ||
    "";
  const rewardLabel = mission.pokemon_reward
    ? REWARD_LABEL[mission.pokemon_reward.kind]
    : undefined;

  return (
    <Card bg="#232122" radius="lg" withBorder p={0} style={{ overflow: "hidden" }}>
      <Box
        h={90}
        style={{
          position: "relative",
          background: mission.image
            ? `center / cover no-repeat url(${mission.image})`
            : "linear-gradient(135deg,#3A2A4D 0%,#2C3E50 100%)",
        }}
      >
        {!mission.image && (
          <Text
            ff="monospace"
            fz={12}
            c="dimmed"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
            }}
          >
            mission.image
          </Text>
        )}
        {mission.tier && (
          <Badge
            color={TIER_COLOR[mission.tier] ?? "gray"}
            variant="filled"
            size="sm"
            style={{ position: "absolute", top: 8, left: 8 }}
          >
            {mission.tier}
          </Badge>
        )}
        {mission.emblem_eligible && (
          <Badge
            color="yellow"
            variant="filled"
            size="sm"
            leftSection={<IconStar size={11} />}
            style={{ position: "absolute", top: 8, right: 8 }}
          >
            EMBLEM
          </Badge>
        )}
      </Box>

      <Stack gap={8} p={12}>
        <Box>
          <Text c="white" fw={600} fz={15} lineClamp={1}>
            {mission.title}
          </Text>
          {mission.location && (
            <Text c="dimmed" fz={12} lineClamp={1}>
              {mission.location}
            </Text>
          )}
        </Box>

        {preview && (
          <Text c="dimmed" fz={12} lineClamp={2}>
            {preview}
          </Text>
        )}

        <Group gap={6} wrap="wrap">
          {!!mission.coins && (
            <RewardChip label={`${mission.coins} Coins`} dot="#F5C842" />
          )}
          {rewardLabel && <RewardChip label={rewardLabel} dot="#8C2595" />}
          {mission.special_item && (
            <RewardChip label={mission.special_item} dot="#3B82F6" />
          )}
        </Group>

        <Group justify="space-between" wrap="nowrap" mt={4}>
          <Text c="dimmed" fz={12}>
            Taken {mission.times_taken || 0}x
          </Text>
          <Button size="xs" variant="light" color="grape" onClick={props.onOpen}>
            View brief
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function MissionModal(props: { mission: Mission | null; opened: boolean; onClose: () => void }) {
  const { mission } = props;
  if (!mission) return null;

  const objectives = toLines(mission.objective);
  const oppositions = toLines(mission.opposition);
  const rewardLabel = mission.pokemon_reward
    ? REWARD_LABEL[mission.pokemon_reward.kind]
    : undefined;

  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title={
        <Text c="white" fw={700} fz={18}>
          {mission.title}
        </Text>
      }
      size="lg"
      radius="md"
      centered
    >
      <Stack gap={16}>
        {mission.location && (
          <Text c="dimmed" fz={13}>
            {mission.location}
          </Text>
        )}

        {mission.story && (
          <Box
            fz={14}
            c="gray.3"
            style={{ lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(mission.story),
            }}
          />
        )}

        {!!objectives.length && (
          <Box>
            <Text c="white" fw={600} fz={14} mb={4}>
              Objective
            </Text>
            <Stack gap={2}>
              {objectives.map((line, i) => (
                <Text key={i} c="gray.4" fz={13}>
                  {line}
                </Text>
              ))}
            </Stack>
          </Box>
        )}

        {!!oppositions.length && (
          <Box>
            <Text c="white" fw={600} fz={14} mb={4}>
              Opposition
            </Text>
            <Stack gap={2}>
              {oppositions.map((line, i) => (
                <Text key={i} c="gray.4" fz={13}>
                  {line}
                </Text>
              ))}
            </Stack>
          </Box>
        )}

        {mission.pokemon_note && (
          <Box>
            <Text c="white" fw={600} fz={14} mb={4}>
              Pokemon note
            </Text>
            <Text c="gray.4" fz={13}>
              {mission.pokemon_note}
            </Text>
          </Box>
        )}

        <Box>
          <Text c="white" fw={600} fz={14} mb={6}>
            Rewards
          </Text>
          <Group gap={6} wrap="wrap">
            {!!mission.coins && (
              <RewardChip
                label={`${mission.coins} Snag Coins`}
                icon={<IconCoin size={13} color="#F5C842" />}
              />
            )}
            {rewardLabel && <RewardChip label={rewardLabel} dot="#8C2595" />}
            {mission.special_item && (
              <RewardChip label={mission.special_item} dot="#3B82F6" />
            )}
            {mission.emblem_eligible && (
              <RewardChip label="Snag Emblem Piece" dot="#F5C842" />
            )}
            {mission.pokemon_reward?.note && (
              <RewardChip label={mission.pokemon_reward.note} />
            )}
          </Group>
        </Box>

        <Divider />

        <Text c="dimmed" fz={12}>
          To take this mission, submitting for grading happens in the Quests
          forum thread you open. Base pay is Snag Coins, write it well and the
          grader tips extra.
        </Text>

        <Button variant="default" disabled fullWidth>
          Pick up in Quests forum
        </Button>
      </Stack>
    </Modal>
  );
}

export default function Missions() {
  const { user } = useAuth();
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<Mission | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const { data: missions, isPending } = useQuery({
    queryKey: ["missions"],
    queryFn: getMissions,
  });

  const { data: currency } = useQuery({
    queryKey: ["currencies", user?.uid],
    queryFn: () => getCurrencies(user!.uid),
    enabled: !!user?.uid,
  });

  // snagEmblemPieces is a newer bag/currency field not yet in the Currencies
  // type, so read it through a permissive record view.
  const pieces = Number(
    (currency as Record<string, string | undefined> | undefined)?.snagEmblemPieces ?? 0
  );

  const all = missions ?? [];
  const q = search.trim().toLowerCase();
  const shown = all.filter((m) => {
    if (!matchesFilter(m, filter)) return false;
    if (!q) return true;
    return (
      m.title.toLowerCase().includes(q) ||
      (m.location ?? "").toLowerCase().includes(q)
    );
  });

  const openMission = (mission: Mission) => {
    setSelected(mission);
    open();
  };

  return (
    <Box>
      <Box
        px={{ base: 16, sm: 40 }}
        py={{ base: 24, sm: 32 }}
        style={{
          background: "linear-gradient(90deg,#3A2A4D 0%,#2C3E50 100%)",
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap={20}>
          <Box style={{ flex: "1 1 320px", minWidth: 0 }}>
            <Title c="white" fw={700} fz={{ base: 26, sm: 34 }} mb={8}>
              Take on a Mission!!
            </Title>
            <Text c="gray.3" fz={{ base: 13, sm: 15 }} maw={620}>
              Pick up a job from the Vault to open a roleplay thread in the
              Quests forum. Base pay is Snag Coins, write it well and the grader
              tips extra.
            </Text>
          </Box>
          <Group gap={12} wrap="nowrap">
            <StatChip value={String(all.length)} label="MISSIONS" />
            <StatChip value={`${pieces % 3}/3`} label="EMBLEM PIECES" gold />
          </Group>
        </Group>
      </Box>

      <Container size="xl" py={{ base: 20, sm: 28 }} px={{ base: 16, sm: 24 }}>
        <Group justify="space-between" align="center" wrap="wrap" gap={12} mb={20}>
          <Group gap={8} wrap="wrap">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Button
                  key={f.key}
                  size="xs"
                  radius="xl"
                  onClick={() => setFilter(f.key)}
                  aria-pressed={active}
                  styles={{
                    root: {
                      background: active ? "#8C2595" : "#2b2a2b",
                      color: "white",
                      border: "none",
                    },
                  }}
                >
                  {f.label}
                </Button>
              );
            })}
          </Group>
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Search missions or locations..."
            aria-label="Search missions or locations"
            leftSection={<IconSearch size={15} />}
            radius="xl"
            maw={280}
            w="100%"
            styles={{ input: { background: "#2E2D2E" } }}
          />
        </Group>

        {isPending ? (
          <SectionLoader />
        ) : !shown.length ? (
          <Text c="dimmed" fz={14} ta="center" py={40} role="status" aria-live="polite">
            No missions match your filters.
          </Text>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 4 }} spacing="md">
            {shown.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onOpen={() => openMission(mission)}
              />
            ))}
          </SimpleGrid>
        )}
      </Container>

      <MissionModal mission={selected} opened={opened} onClose={close} />
    </Box>
  );
}
