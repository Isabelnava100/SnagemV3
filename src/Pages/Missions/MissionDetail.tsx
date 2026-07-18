import { Badge, Box, Button, Container, Flex, Group, Image, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconMapPin, IconSparkles } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { getPokemonImageURL } from "../../helpers";
import { pokemonData } from "../../data/pokemon";
import { Mission, getMission, pickUpMission } from "../../queries/missions";

/**
 * Full-page mission brief (behind a Mission Vault card). A striped hero and a
 * two-column body (Briefing + Objective/Opposition + Pokemon Rules + possible
 * encounters on the left, Rewards + Bonus + pick-up on the right). "Pick Up
 * Mission" calls the pickUpMission Cloud Function, which creates the Quests
 * thread with the briefing preloaded; closing that thread later files the run
 * for grading automatically, so there is no separate submit form here.
 */

const TIER_COLOR: Record<string, string> = {
  Story: "#7C3AED",
  Standard: "#12B886",
  Master: "#7048E8",
  Exceptional: "#E8590C",
};

const REWARD_LABEL: Record<string, string> = {
  snag: "Snag a Pokemon",
  catch: "Catch a Pokemon",
  recruit: "Recruit a Pokemon",
  egg: "Pokemon Egg",
};

const BRIEF_GRADIENT = "linear-gradient(90deg, #c026d3, #6366f1, #22d3ee)";
const REWARD_GRADIENT = "linear-gradient(90deg, #f76b1c, #e0446b)";
const HERO_STRIPES =
  "repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 12px, transparent 12px, transparent 24px)";
const HERO_GRADIENT = "linear-gradient(120deg, #3a1d63 0%, #2c2352 55%, #1c2a4a 100%)";

function toLines(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/* --------------------------------- Panels ---------------------------------- */

function Panel(props: { children: React.ReactNode; accent?: boolean }) {
  return (
    <Box
      style={{
        borderRadius: 14,
        background: props.accent ? "#17151c" : "#161319",
        border: "1px solid #232028",
        overflow: "hidden",
      }}
    >
      {props.children}
    </Box>
  );
}

/** A card with a full-width gradient header bar. */
function GradientPanel(props: { title: string; gradient: string; children: React.ReactNode }) {
  return (
    <Panel>
      <Box px="md" py={10} style={{ background: props.gradient }}>
        <Text fw={800} c="white" fz={16}>
          {props.title}
        </Text>
      </Box>
      <Box p="md">{props.children}</Box>
    </Panel>
  );
}

function LineList(props: { label: string; color: string; lines: string[] }) {
  if (!props.lines.length) return null;
  return (
    <Panel>
      <Box p="md">
        <Text fz={14} fw={800} tt="uppercase" c={props.color} mb={10} style={{ letterSpacing: 1 }}>
          {props.label}
        </Text>
        <Stack gap={8}>
          {props.lines.map((line, i) => (
            <Group key={i} gap={8} wrap="nowrap" align="flex-start">
              <IconArrowRight size={14} color={props.color} style={{ marginTop: 3, flexShrink: 0 }} />
              <Text fz={16} c="gray.4">
                {line}
              </Text>
            </Group>
          ))}
        </Stack>
      </Box>
    </Panel>
  );
}

function RewardRow(props: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Group gap={12} wrap="nowrap" p={12} style={{ borderRadius: 10, background: "#0e0c14" }}>
      {props.icon}
      <Box style={{ minWidth: 0 }}>
        <Text fz={16} fw={700} c="white" lineClamp={1}>
          {props.title}
        </Text>
        <Text fz={14} c="dimmed" lineClamp={1}>
          {props.sub}
        </Text>
      </Box>
    </Group>
  );
}

function CoinIcon() {
  return (
    <Box
      style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <Text fz={16} fw={800} c="#3a2a05">
        C
      </Text>
    </Box>
  );
}

function DotIcon({ color }: { color: string }) {
  return (
    <Box
      style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: "#1c1a26", display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <Box style={{ width: 12, height: 12, borderRadius: "50%", background: color }} />
    </Box>
  );
}

/* ------------------------------- Encounters -------------------------------- */

const pokemonNameBySlug = new Map(pokemonData.map((p) => [p.slug, p.name]));

/**
 * The mission's default encounter pool so members know what they can run into
 * before picking the job up. Required foes (from the briefing) are flagged;
 * they are the minimum to beat for the grade, everything else is optional.
 */
function EncountersPanel({ mission }: { mission: Mission }) {
  const pool = mission.encounters ?? [];
  if (!pool.length) return null;
  const required = new Set(mission.requiredEncounters ?? []);
  const sorted = [...pool].sort((a, b) => Number(required.has(b)) - Number(required.has(a)));

  return (
    <Panel>
      <Box p="md">
        <Text fz={14} fw={800} tt="uppercase" c="cyan.4" mb={8} style={{ letterSpacing: 1 }}>
          Possible Encounters
        </Text>
        <Text fz={14} c="dimmed" mb={12}>
          You choose when to take on each opponent inside your thread.
          {required.size > 0 &&
            " The ones marked Required come from the briefing; beating them is the minimum to clear the mission."}
        </Text>
        <Group gap={8}>
          {sorted.map((slug) => (
            <Stack key={slug} gap={2} align="center" w={72}>
              <Box
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  background: "#0e0c14",
                  border: `1px solid ${required.has(slug) ? "#f76b1c" : "#232028"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src={getPokemonImageURL(slug)}
                  alt={pokemonNameBySlug.get(slug) ?? slug}
                  w={44}
                  h={44}
                  fit="contain"
                />
              </Box>
              <Text fz={14} c="gray.4" ta="center" lineClamp={1} w="100%">
                {pokemonNameBySlug.get(slug) ?? slug}
              </Text>
              {required.has(slug) && (
                <Badge size="xs" color="gold.2" variant="light">
                  Required
                </Badge>
              )}
            </Stack>
          ))}
        </Group>
      </Box>
    </Panel>
  );
}

/* ---------------------------------- Page ----------------------------------- */

export default function MissionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickUpError, setPickUpError] = React.useState("");
  const { data: mission, isPending } = useQuery({
    queryKey: ["mission", id],
    queryFn: () => getMission(id!),
    enabled: !!id,
  });

  const pickUpMutation = useMutation({
    mutationFn: () => pickUpMission(id!),
    onSuccess: ({ threadId }) => navigate(`/Forum/Quests/thread/${threadId}`),
    onError: (e) =>
      setPickUpError((e as Error).message || "Could not open the mission thread. Try again."),
  });

  if (isPending) {
    return (
      <Container size="lg" py={{ base: 20, sm: 32 }} px={{ base: 16, sm: 24 }}>
        <SectionLoader />
      </Container>
    );
  }

  if (!mission) {
    return (
      <Container size="lg" py={{ base: 20, sm: 32 }} px={{ base: 16, sm: 24 }}>
        <Stack gap={16}>
          <Button
            component={Link}
            to="/Missions"
            variant="default"
            radius="xl"
            w="fit-content"
            leftSection={<IconArrowLeft size={16} />}
          >
            All missions
          </Button>
          <Panel>
            <Box p="lg">
              <Text c="white" fw={800} fz={28} mb={8}>
                Mission not found
              </Text>
              <Text c="dimmed" fz={16}>
                This mission may have been retired or the link is out of date. Head back to the Vault
                to pick another job.
              </Text>
            </Box>
          </Panel>
        </Stack>
      </Container>
    );
  }

  const objectives = toLines(mission.objective);
  const oppositions = toLines(mission.opposition);
  const rewardLabel = mission.pokemon_reward ? REWARD_LABEL[mission.pokemon_reward.kind] : undefined;
  const tierColor = mission.tier ? TIER_COLOR[mission.tier] ?? "#8a8399" : "#8a8399";

  return (
    <Box>
      {/* Full-bleed striped hero */}
      <Box
        px={{ base: 16, sm: 40 }}
        pt={{ base: 20, sm: 28 }}
        pb={{ base: 24, sm: 36 }}
        style={{ background: `${HERO_STRIPES}, ${HERO_GRADIENT}` }}
      >
        <Container size="lg" px={0}>
          <Button
            component={Link}
            to="/Missions"
            radius="xl"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
            styles={{ root: { background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid #4a4368" } }}
            mb="lg"
          >
            All missions
          </Button>

          {mission.tier && (
            <Text
              display="inline-block"
              fz={14}
              fw={700}
              c="#fff"
              px={12}
              py={4}
              mb={12}
              style={{ borderRadius: 999, background: tierColor }}
            >
              {mission.tier}
            </Text>
          )}
          <Text component="h1" c="white" fw={800} fz={{ base: 34, sm: 48 }} style={{ lineHeight: 1.05, margin: 0 }}>
            {mission.title}
          </Text>
          <Group gap={10} mt={12} wrap="wrap">
            {mission.location && (
              <Group gap={4} wrap="nowrap">
                <IconMapPin size={15} color="#f76b1c" />
                <Text fz={16} c="gray.3">
                  {mission.location}
                </Text>
              </Group>
            )}
            {mission.location && mission.times_taken != null && (
              <Text c="dimmed" fz={16}>
                &middot;
              </Text>
            )}
            {mission.times_taken != null && (
              <Text fz={16} c="gray.3">
                Taken {mission.times_taken}&times;
              </Text>
            )}
          </Group>
        </Container>
      </Box>

      <Container size="lg" py={{ base: 20, sm: 32 }} px={{ base: 16, sm: 24 }}>
        <Flex direction={{ base: "column", md: "row" }} gap="lg" align="stretch">
          {/* Left column */}
          <Box style={{ flex: "2 1 0%", minWidth: 0 }}>
            <Stack gap="md">
              {mission.story && (
                <GradientPanel title="Briefing" gradient={BRIEF_GRADIENT}>
                  <Box
                    fz={16}
                    c="gray.3"
                    style={{ lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mission.story) }}
                  />
                </GradientPanel>
              )}

              <Flex direction={{ base: "column", sm: "row" }} gap="md" align="stretch">
                <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
                  <LineList label="Objective" color="#51CF66" lines={objectives} />
                </Box>
                <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
                  <LineList label="Opposition" color="#FF8787" lines={oppositions} />
                </Box>
              </Flex>

              {mission.pokemon_note && (
                <Panel>
                  <Box p="md">
                    <Text fz={14} fw={800} tt="uppercase" c="grape.3" mb={8} style={{ letterSpacing: 1 }}>
                      Pokemon Rules
                    </Text>
                    <Text fz={16} c="gray.4">
                      {mission.pokemon_note}
                    </Text>
                  </Box>
                </Panel>
              )}

              <EncountersPanel mission={mission} />
            </Stack>
          </Box>

          {/* Right column */}
          <Box style={{ flex: "1 1 0%", minWidth: 0, maxWidth: 400 }}>
            <Stack gap="md">
              <GradientPanel title="Rewards" gradient={REWARD_GRADIENT}>
                <Stack gap={10}>
                  {!!mission.coins && (
                    <RewardRow icon={<CoinIcon />} title={`${mission.coins} Snag Coins`} sub="base payout" />
                  )}
                  {rewardLabel && (
                    <RewardRow
                      icon={<DotIcon color="#e9ecef" />}
                      title={rewardLabel}
                      sub={mission.pokemon_reward?.note || "mission reward"}
                    />
                  )}
                  {mission.special_item && (
                    <RewardRow icon={<DotIcon color="#3B82F6" />} title={mission.special_item} sub="special item" />
                  )}
                  {mission.emblem_eligible && (
                    <RewardRow icon={<DotIcon color="#F5C842" />} title="Snag Emblem Piece" sub="if eligible" />
                  )}
                  {!mission.coins && !rewardLabel && !mission.special_item && !mission.emblem_eligible && (
                    <Text fz={14} c="dimmed">
                      Rewards set by the grader.
                    </Text>
                  )}
                </Stack>
              </GradientPanel>

              <Box
                p="md"
                style={{ borderRadius: 14, border: "1px solid #4a3fa0", background: "#1a1636" }}
              >
                <Group gap={6} mb={6}>
                  <IconSparkles size={15} color="#b197fc" />
                  <Text fz={14} fw={800} c="grape.3" tt="uppercase" style={{ letterSpacing: 0.5 }}>
                    Bonus
                  </Text>
                </Group>
                <Text fz={14} c="rgba(255,255,255,0.85)">
                  {mission.bonus || "Write it well, make it fun to read, and the grader tips extra."}
                </Text>
              </Box>

              <Button
                variant="gradient"
                gradient={{ from: "grape", to: "cyan", deg: 90 }}
                radius="xl"
                size="lg"
                fullWidth
                loading={pickUpMutation.isPending}
                disabled={!user}
                onClick={() => {
                  setPickUpError("");
                  pickUpMutation.mutate();
                }}
              >
                Pick Up Mission
              </Button>
              {pickUpError && (
                <Text fz={14} c="#E54156" ta="center" role="status" aria-live="polite">
                  {pickUpError}
                </Text>
              )}
              <Text fz={14} c="dimmed" ta="center">
                {user
                  ? "Creates your roleplay thread in the Quests forum with this briefing preloaded. Play it out, then close the thread and it goes straight to the admins for grading."
                  : "Sign in to pick up this mission."}
              </Text>
            </Stack>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
