import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Progress,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconCheck, IconLock } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { SectionLoader } from "../../components/navigation/loading";
import {
  getChallengeProgress,
  getGymRegions,
  getIslandTrials,
  ChallengeProgress,
  Gym,
  GymRegion,
  IslandTrial,
} from "../../queries/challenges";

/**
 * Public, display only view of the two progress tracked challenge systems:
 * Gym Leader Runs and Island Trials. Progression is granted by admins and
 * graders elsewhere, so this page never writes. It reads the region and trial
 * content plus the current member's stored progress, then draws each system as
 * an ordered path with a progress sidebar. Everything renders with no signed in
 * user, empty content, and no progress without crashing.
 */

type NodeState = "cleared" | "available" | "locked";

const HEADER_GRADIENT =
  "repeating-linear-gradient(135deg, #3a1d63 0px, #3a1d63 14px, #4a2680 14px, #4a2680 28px)";

const TAB_SUBTITLES: Record<string, string> = {
  gyms:
    "Pick a region and clear all 8 gyms in order, then the Elite Four and Champion. Leaders fight at full power, no filler trainers.",
  trials:
    "Complete the island trials in order, defeat each Totem, then face the island Kahunas in their Grand Trials to earn Z-Crystals.",
};

/** A single circular node in a challenge path. */
function PathNode(props: {
  order: number | string;
  title: string;
  type?: string;
  state: NodeState;
  tag?: string;
}) {
  const { state } = props;
  const cleared = state === "cleared";
  const available = state === "available";
  const locked = state === "locked";

  return (
    <Stack gap={4} align="center" w={110} style={{ opacity: locked ? 0.55 : 1 }}>
      <Box
        style={{
          width: 66,
          height: 66,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: cleared ? "#2f9e44" : "#2b2a2b",
          border: available
            ? "3px solid #cc5de8"
            : cleared
              ? "3px solid #2f9e44"
              : "2px solid #444",
          boxShadow: available ? "0 0 0 4px rgba(204,93,232,0.25)" : "none",
        }}
      >
        {cleared ? (
          <IconCheck size={30} color="white" />
        ) : locked ? (
          <IconLock size={26} color="#888" />
        ) : (
          <Text fz={22} fw={700} c="white">
            {props.order}
          </Text>
        )}
      </Box>
      <Badge
        size="xs"
        radius="sm"
        variant="filled"
        color={cleared ? "green" : available ? "grape" : "dark"}
      >
        {typeof props.order === "number" ? `#${props.order}` : props.order}
      </Badge>
      <Text fz={12} fw={600} c="white" ta="center" lineClamp={2}>
        {props.title}
      </Text>
      <Group gap={4} justify="center">
        {props.type && (
          <Badge size="xs" variant="light" color="grape">
            {props.type}
          </Badge>
        )}
        {props.tag && (
          <Badge size="xs" variant="light" color="yellow">
            {props.tag}
          </Badge>
        )}
      </Group>
    </Stack>
  );
}

/** Small dot separator drawn between path nodes. */
function NodeSeparator() {
  return (
    <Text c="dimmed" fz={20} fw={700} px={2} aria-hidden="true">
      ...
    </Text>
  );
}

/** Wrapping row that lays out path nodes with separators between them. */
function PathFlow(props: { children: React.ReactNode[] }) {
  const items = props.children.filter(Boolean);
  return (
    <Group gap={8} align="flex-start" style={{ rowGap: 20 }}>
      {items.map((node, i) => (
        <React.Fragment key={i}>
          {i > 0 && <NodeSeparator />}
          {node}
        </React.Fragment>
      ))}
    </Group>
  );
}

function SidebarCard(props: { title: string; children: React.ReactNode }) {
  return (
    <Card bg="#2b2a2b" radius="md" p={14} withBorder>
      <Text fz={11} fw={700} c="dimmed" tt="uppercase" mb={8}>
        {props.title}
      </Text>
      {props.children}
    </Card>
  );
}

/* ------------------------------- Gym Leader Runs ------------------------------- */

function GymRunsTab(props: {
  regions: GymRegion[];
  progress: ChallengeProgress;
}) {
  const { regions, progress } = props;
  const [regionId, setRegionId] = React.useState<string | null>(
    regions[0]?.id ?? null
  );

  React.useEffect(() => {
    if (regions.length && !regions.some((r) => r.id === regionId)) {
      setRegionId(regions[0].id);
    }
  }, [regions, regionId]);

  if (!regions.length) {
    return (
      <Text fz={13} c="dimmed" ta="center" py={30}>
        Regions are being set up. Check back soon.
      </Text>
    );
  }

  const region = regions.find((r) => r.id === regionId) ?? regions[0];
  const gyms: Gym[] = [...(region.gyms ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const earned = progress.badges?.[region.id] ?? [];
  const eliteDone = progress.eliteFour?.[region.id] ?? false;
  const championDone = progress.champion?.[region.id] ?? false;

  const isGymCleared = (g: Gym) => earned.includes(g.leaderName);
  const allBadges = gyms.length > 0 && gyms.every(isGymCleared);

  // First not cleared gym is "available"; the rest are "locked".
  const firstOpenIndex = gyms.findIndex((g) => !isGymCleared(g));

  const gymState = (g: Gym, idx: number): NodeState => {
    if (isGymCleared(g)) return "cleared";
    if (idx === firstOpenIndex) return "available";
    return "locked";
  };

  const eliteState: NodeState = eliteDone
    ? "cleared"
    : allBadges
      ? "available"
      : "locked";
  const championState: NodeState = championDone
    ? "cleared"
    : allBadges && eliteDone
      ? "available"
      : "locked";

  const totalStages = gyms.length + 2; // gyms + Elite Four + Champion
  const clearedCount =
    gyms.filter(isGymCleared).length +
    (eliteDone ? 1 : 0) +
    (championDone ? 1 : 0);
  const pct = totalStages ? Math.round((clearedCount / totalStages) * 100) : 0;

  const nextGym = firstOpenIndex >= 0 ? gyms[firstOpenIndex] : null;

  return (
    <Stack gap={16}>
      <Group gap={8} wrap="wrap" role="tablist" aria-label="Select a region">
        {regions.map((r) => (
          <Button
            key={r.id}
            size="xs"
            radius="xl"
            variant={r.id === region.id ? "filled" : "light"}
            color="grape"
            onClick={() => setRegionId(r.id)}
            aria-pressed={r.id === region.id}
          >
            {r.name}
          </Button>
        ))}
      </Group>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card bg="#2b2a2b" radius="md" p={16} withBorder>
            <Title order={3} c="white" fz={18} mb={14}>
              {region.name} Badge Run
            </Title>
            {gyms.length === 0 ? (
              <Text fz={13} c="dimmed" py={20}>
                Gyms for this region are being set up.
              </Text>
            ) : (
              <PathFlow>
                {[
                  ...gyms.map((g, idx) => (
                    <PathNode
                      key={`gym-${g.order}-${g.leaderName}`}
                      order={g.order}
                      title={g.leaderName}
                      type={g.type}
                      state={gymState(g, idx)}
                    />
                  )),
                  <PathNode
                    key="elite-four"
                    order="E4"
                    title={region.eliteFour?.members?.length ? "Elite Four" : "Elite Four"}
                    state={eliteState}
                  />,
                  <PathNode
                    key="champion"
                    order="Champ"
                    title={region.eliteFour?.champion?.name || "Champion"}
                    state={championState}
                  />,
                ]}
              </PathFlow>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap={12} style={{ position: "sticky", top: 16 }}>
            <SidebarCard title="Progress">
              <Text fz={14} c="white" fw={600} mb={6}>
                {clearedCount} / {totalStages} stages cleared
              </Text>
              <Progress value={pct} color="grape" radius="xl" />
            </SidebarCard>

            <SidebarCard title="Badges Earned">
              {gyms.length === 0 ? (
                <Text fz={12} c="dimmed">
                  No badges to earn yet.
                </Text>
              ) : (
                <Group gap={6} wrap="wrap">
                  {gyms.map((g) => {
                    const got = isGymCleared(g);
                    return (
                      <Badge
                        key={`badge-${g.order}`}
                        size="lg"
                        circle
                        variant={got ? "filled" : "outline"}
                        color={got ? "green" : "gray"}
                        title={g.leaderName}
                      >
                        {g.leaderName.charAt(0).toUpperCase()}
                      </Badge>
                    );
                  })}
                </Group>
              )}
            </SidebarCard>

            <SidebarCard title="Next Up">
              {nextGym ? (
                <Stack gap={4}>
                  <Group gap={6}>
                    <Text fz={14} c="white" fw={600}>
                      {nextGym.leaderName}
                    </Text>
                    {nextGym.type && (
                      <Badge size="xs" variant="light" color="grape">
                        {nextGym.type}
                      </Badge>
                    )}
                  </Group>
                  <Text fz={12} c="dimmed">
                    Gym battle, single, up to{" "}
                    {nextGym.challengerPokemonLimit || 6} Pokemon
                  </Text>
                </Stack>
              ) : allBadges && !championDone ? (
                <Text fz={13} c="white">
                  {!eliteDone ? "Face the Elite Four." : "Challenge the Champion."}
                </Text>
              ) : (
                <Text fz={13} c="dimmed">
                  This region is complete. Well done.
                </Text>
              )}
            </SidebarCard>

            <SidebarCard title="Final Prize">
              <Text fz={13} c="white">
                {region.championPrize ||
                  "Beat the Champion to claim this region's special prize."}
              </Text>
            </SidebarCard>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

/* -------------------------------- Island Trials -------------------------------- */

function IslandTrialsTab(props: {
  trials: IslandTrial[];
  progress: ChallengeProgress;
}) {
  const { trials, progress } = props;

  if (!trials.length) {
    return (
      <Text fz={13} c="dimmed" ta="center" py={30}>
        Trials coming soon.
      </Text>
    );
  }

  const sorted = [...trials].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const completed = new Set([
    ...(progress.trialsCompleted ?? []),
    ...(progress.grandTrials ?? []),
  ]);
  const zCrystals = progress.zCrystals ?? [];

  const isCleared = (t: IslandTrial) => completed.has(t.id);
  const firstOpenIndex = sorted.findIndex((t) => !isCleared(t));

  const trialState = (t: IslandTrial, idx: number): NodeState => {
    if (isCleared(t)) return "cleared";
    if (idx === firstOpenIndex) return "available";
    return "locked";
  };

  const totalStages = sorted.length;
  const clearedCount = sorted.filter(isCleared).length;
  const pct = totalStages
    ? Math.round((clearedCount / totalStages) * 100)
    : 0;

  const nextTrial = firstOpenIndex >= 0 ? sorted[firstOpenIndex] : null;

  // Distinct Z-Crystal rewards defined across the grand trials, used to draw
  // locked placeholders next to the ones the member has earned.
  const allCrystals = Array.from(
    new Set(
      sorted
        .map((t) => t.zCrystalReward)
        .filter((z): z is string => Boolean(z))
    )
  );

  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Card bg="#2b2a2b" radius="md" p={16} withBorder>
          <Title order={3} c="white" fz={18} mb={14}>
            Alola Island Challenge
          </Title>
          <PathFlow>
            {sorted.map((t, idx) => (
              <PathNode
                key={t.id}
                order={t.order ?? idx + 1}
                title={t.name}
                type={t.type}
                tag={t.grand ? "GRAND" : undefined}
                state={trialState(t, idx)}
              />
            ))}
          </PathFlow>
        </Card>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 4 }}>
        <Stack gap={12} style={{ position: "sticky", top: 16 }}>
          <SidebarCard title="Progress">
            <Text fz={14} c="white" fw={600} mb={6}>
              {clearedCount} / {totalStages} stages cleared
            </Text>
            <Progress value={pct} color="grape" radius="xl" />
          </SidebarCard>

          <SidebarCard title="Z-Crystals Earned">
            {allCrystals.length === 0 && zCrystals.length === 0 ? (
              <Text fz={12} c="dimmed">
                No Z-Crystals defined yet.
              </Text>
            ) : (
              <Group gap={6} wrap="wrap">
                {allCrystals.map((z) => {
                  const got = zCrystals.includes(z);
                  return (
                    <Badge
                      key={z}
                      size="sm"
                      radius="sm"
                      variant={got ? "filled" : "outline"}
                      color={got ? "yellow" : "gray"}
                      leftSection={got ? <IconCheck size={12} /> : undefined}
                    >
                      {z}
                    </Badge>
                  );
                })}
                {zCrystals
                  .filter((z) => !allCrystals.includes(z))
                  .map((z) => (
                    <Badge
                      key={z}
                      size="sm"
                      radius="sm"
                      variant="filled"
                      color="yellow"
                      leftSection={<IconCheck size={12} />}
                    >
                      {z}
                    </Badge>
                  ))}
              </Group>
            )}
          </SidebarCard>

          <SidebarCard title="Next Up">
            {nextTrial ? (
              <Stack gap={4}>
                <Group gap={6}>
                  <Text fz={14} c="white" fw={600}>
                    {nextTrial.name}
                  </Text>
                  {nextTrial.type && (
                    <Badge size="xs" variant="light" color="grape">
                      {nextTrial.type}
                    </Badge>
                  )}
                </Group>
                <Text fz={12} c="dimmed">
                  Totem: {nextTrial.totemPokemon || "To be revealed"}
                </Text>
              </Stack>
            ) : (
              <Text fz={13} c="dimmed">
                Every trial is complete. Well done.
              </Text>
            )}
          </SidebarCard>

          <SidebarCard title="Final Prize">
            <Text fz={13} c="white">
              Clear all Grand Trials to earn the full Z-Crystal set and Alola
              Champion standing.
            </Text>
          </SidebarCard>
        </Stack>
      </Grid.Col>
    </Grid>
  );
}

/* ------------------------------------ Page ------------------------------------ */

export default function Challenges() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [tab, setTab] = React.useState<string>("gyms");

  const regionsQuery = useQuery({
    queryKey: ["gym-regions"],
    queryFn: getGymRegions,
  });
  const trialsQuery = useQuery({
    queryKey: ["island-trials"],
    queryFn: getIslandTrials,
  });
  const progressQuery = useQuery({
    queryKey: ["challenge-progress", uid],
    queryFn: () => getChallengeProgress(uid as string),
    enabled: Boolean(uid),
  });

  const loading =
    regionsQuery.isPending ||
    trialsQuery.isPending ||
    (Boolean(uid) && progressQuery.isPending);

  const progress: ChallengeProgress = progressQuery.data ?? {};
  const subtitle = TAB_SUBTITLES[tab] ?? TAB_SUBTITLES.gyms;

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Box
        mb={20}
        p={{ base: 18, sm: 24 }}
        style={{ background: HEADER_GRADIENT, borderRadius: 12 }}
      >
        <Title order={1} c="white" size={30} fw={700}>
          Take on a Challenge!
        </Title>
        <Text fz={13} c="white" mt={6} style={{ maxWidth: 640, opacity: 0.92 }}>
          {subtitle}
        </Text>
      </Box>

      <Tabs
        value={tab}
        onChange={(value) => value && setTab(value)}
        variant="pills"
        color="grape"
        keepMounted={false}
      >
        <Tabs.List mb={16} style={{ flexWrap: "wrap" }}>
          <Tabs.Tab value="gyms">Gym Leader Runs</Tabs.Tab>
          <Tabs.Tab value="trials">Island Trials</Tabs.Tab>
        </Tabs.List>

        {loading ? (
          <SectionLoader />
        ) : (
          <>
            <Tabs.Panel value="gyms">
              <GymRunsTab regions={regionsQuery.data ?? []} progress={progress} />
            </Tabs.Panel>
            <Tabs.Panel value="trials">
              <IslandTrialsTab
                trials={trialsQuery.data ?? []}
                progress={progress}
              />
            </Tabs.Panel>
          </>
        )}
      </Tabs>
    </Container>
  );
}
