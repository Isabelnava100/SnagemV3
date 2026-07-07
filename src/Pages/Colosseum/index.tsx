import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Image,
  RingProgress,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { IconBolt, IconFlame, IconTrophy } from "@tabler/icons-react";
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { SectionLoader } from "../../components/navigation/loading";
import { getPokemonImageURL } from "../../helpers";
import {
  getHallOfFame,
  getRankings,
  getTournaments,
  getTrainingSession,
  logTrainingPost,
  resetTrainingSession,
  TrainingSession,
} from "../../queries/colosseum";
import { getOwnedPokemons } from "../../queries/dashboard";

/**
 * The Colosseum: the battle and training hub. Four sub-systems in one page:
 * the Super Training Room grind, the competitive rankings ladder, the Hall of
 * Fame record, and organized tournaments. Everything renders with no signed-in
 * user and empty collections, so it never crashes on a fresh install.
 */

const SOLO_WINDOW_MS = 2 * 60 * 60 * 1000;
const PARTNER_WINDOW_MS = 4 * 60 * 60 * 1000;

/** Format a millisecond remainder as H:MM:SS, clamped at zero. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h}:${pad(m)}:${pad(s)}`;
}

/** Countdown for the active training window, from startedAt to now. */
function useSessionCountdown(session: TrainingSession | undefined, partner: boolean): string {
  const windowMs = partner ? PARTNER_WINDOW_MS : SOLO_WINDOW_MS;
  const startedSeconds = session?.startedAt?.seconds;
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!startedSeconds) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedSeconds]);

  if (!startedSeconds) return formatCountdown(windowMs);
  const endMs = startedSeconds * 1000 + windowMs;
  return formatCountdown(endMs - now);
}

function StatTile(props: { label: string; value: React.ReactNode }) {
  return (
    <Card bg="#201e2b" radius="md" p={12} withBorder style={{ borderColor: "#3a3550" }}>
      <Stack gap={2} align="center">
        <Text fz={22} fw={700} c="white">
          {props.value}
        </Text>
        <Text fz={10} c="dimmed" tt="uppercase" ta="center">
          {props.label}
        </Text>
      </Stack>
    </Card>
  );
}

function TrainingRoomTab() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();

  const { data: owned, isPending: ownedPending } = useQuery({
    queryKey: ["owned-pokemons", uid],
    queryFn: () => getOwnedPokemons(uid as string),
    enabled: !!uid,
  });

  const { data: session } = useQuery({
    queryKey: ["training-session", uid],
    queryFn: () => getTrainingSession(uid as string),
    enabled: !!uid,
  });

  const pokemons = owned?.sortedData ?? [];
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [partner, setPartner] = React.useState(false);
  const [status, setStatus] = React.useState("");

  // Default the target to the first owned pokemon once they load.
  React.useEffect(() => {
    if (!selectedId && pokemons.length) setSelectedId(pokemons[0].id);
  }, [pokemons, selectedId]);

  const selected = pokemons.find((p) => p.id === selectedId);
  const countdown = useSessionCountdown(session, partner);

  const experience = selected?.experience ?? 0;
  const pct = Math.min(100, Math.round((experience / 25) * 100));
  const postsLogged = session?.postsLogged ?? 0;
  const nextEvoPts = postsLogged < 5 ? "1.0" : "0.75";

  const logMutation = useMutation({
    mutationFn: () => logTrainingPost(selectedId as string, partner),
    onSuccess: (res) => {
      setStatus(
        `Post logged. Earned ${res.awardedEvo} evolution and ${res.awardedHappiness} happiness points.`
      );
      queryClient.invalidateQueries({ queryKey: ["training-session", uid] });
      queryClient.invalidateQueries({ queryKey: ["owned-pokemons", uid] });
    },
    onError: () => setStatus("Could not log that post. Please try again."),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetTrainingSession(),
    onSuccess: () => {
      setStatus("Session reset.");
      queryClient.invalidateQueries({ queryKey: ["training-session", uid] });
    },
    onError: () => setStatus("Could not reset the session."),
  });

  if (!uid) {
    return (
      <Text fz={13} c="dimmed" py={24}>
        Sign in to use the Super Training Room and log training posts.
      </Text>
    );
  }

  if (ownedPending) return <SectionLoader />;

  return (
    <Stack gap="md">
      <Select
        aria-label="Training target Pokemon"
        label="Training target"
        placeholder={pokemons.length ? "Choose a Pokemon" : "You have no Pokemon yet"}
        data={pokemons.map((p) => ({ value: p.id, label: p.name || p.species }))}
        value={selectedId}
        onChange={setSelectedId}
        disabled={!pokemons.length}
        maw={320}
        w="100%"
        searchable
      />

      <Flex direction={{ base: "column", sm: "row" }} gap="md" align="stretch">
        <Box style={{ flex: "2 1 0%", minWidth: 0 }}>
          <Card bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
            <Group justify="space-between" align="flex-start" wrap="nowrap" mb="md">
              <Text fz={12} fw={700} c="grape.3" tt="uppercase">
                Session Live . Super Training Room
              </Text>
              <Badge color="grape" variant="light" leftSection={<IconBolt size={12} />}>
                {countdown}
              </Badge>
            </Group>

            <Group justify="center" mb="md">
              <RingProgress
                size={140}
                thickness={12}
                roundCaps
                sections={[{ value: pct, color: "grape" }]}
                label={
                  <Stack gap={0} align="center">
                    <Text fz={13} fw={700} c="white" ta="center" lineClamp={1}>
                      {selected?.name || "No target"}
                    </Text>
                    <Text fz={10} c="dimmed" ta="center">
                      {pct}% to evolve
                    </Text>
                  </Stack>
                }
              />
            </Group>

            <SimpleGrid cols={{ base: 3 }} spacing="xs" mb="md">
              <StatTile label="Evolution Pts" value={session?.evoPts ?? 0} />
              <StatTile label="Happiness Pts" value={session?.happinessPts ?? 0} />
              <StatTile label="Posts Logged" value={postsLogged} />
            </SimpleGrid>

            <Stack gap="sm">
              <SegmentedControl
                value={partner ? "partner" : "solo"}
                onChange={(v) => setPartner(v === "partner")}
                data={[
                  { label: "Solo", value: "solo" },
                  { label: "Partner", value: "partner" },
                ]}
                fullWidth
              />

              <Button
                variant="gradient"
                gradient={{ from: "grape", to: "indigo", deg: 90 }}
                onClick={() => logMutation.mutate()}
                loading={logMutation.isPending}
                disabled={!selectedId}
                fullWidth
              >
                Log a Training Post
              </Button>

              <Group justify="space-between" wrap="nowrap">
                <Text fz={11} c="dimmed">
                  Next post earns {nextEvoPts} evolution pts.
                </Text>
                <Button
                  variant="subtle"
                  color="gray"
                  size="compact-sm"
                  onClick={() => resetMutation.mutate()}
                  loading={resetMutation.isPending}
                >
                  Reset
                </Button>
              </Group>

              {status && (
                <Text fz={12} c="grape.3" role="status" aria-live="polite">
                  {status}
                </Text>
              )}
            </Stack>
          </Card>
        </Box>

        <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
          <Stack gap="md">
            <Card bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
              <Text fz={12} fw={700} c="grape.3" tt="uppercase" mb="xs">
                Session Rules
              </Text>
              <Stack gap={6}>
                <Text fz={12} c="dimmed">
                  Once per day, 2-hour limit.
                </Text>
                <Text fz={12} c="dimmed">
                  Train in a pair for a 4-hour window.
                </Text>
                <Text fz={12} c="dimmed">
                  Shadow Pokemon earn Purification instead.
                </Text>
                <Text fz={12} c="dimmed">
                  Regional forms (Alolan, Galarian, Hisuian) allowed.
                </Text>
              </Stack>
            </Card>

            <Card bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
              <Group gap={6} mb="xs">
                <IconFlame size={16} color="var(--mantine-color-orange-4)" />
                <Text fz={12} fw={700} c="orange.4" tt="uppercase">
                  Coach's Tip
                </Text>
              </Group>
              <Text fz={12} c="dimmed">
                High-effort posts catch a grader's eye. Detailed training scenes can earn a
                random bonus on top of your base points.
              </Text>
            </Card>
          </Stack>
        </Box>
      </Flex>

      <Card bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
        <Text fz={12} fw={700} c="grape.3" tt="uppercase" mb="sm">
          How Training Scores
        </Text>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <Text fz={12} c="dimmed">
            Posts 1-5: 1.0 evolution pt each (solo).
          </Text>
          <Text fz={12} c="dimmed">
            Posts 6+: 0.75 pt each, pace yourself.
          </Text>
          <Text fz={12} c="dimmed">
            Partner mode: 1.0 pt through post 10 plus a 4-hour window.
          </Text>
          <Text fz={12} c="dimmed">
            Shadow Pokemon: earn Purification at the same rates.
          </Text>
        </SimpleGrid>
      </Card>
    </Stack>
  );
}

function RankingsTab() {
  const { data, isPending } = useQuery({
    queryKey: ["colosseum-rankings"],
    queryFn: getRankings,
  });

  if (isPending) return <SectionLoader />;

  const rows = data ?? [];
  if (!rows.length) {
    return (
      <Text fz={13} c="dimmed" py={24}>
        No ranked players yet. Battle results will populate the ladder.
      </Text>
    );
  }

  const showWL = rows.some((r) => r.wins != null || r.losses != null);

  return (
    <Box style={{ overflowX: "auto" }}>
      <Table striped highlightOnHover miw={360}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Rank</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th ta="right">Points</Table.Th>
            {showWL && <Table.Th ta="right">W / L</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, i) => (
            <Table.Tr key={row.id}>
              <Table.Td fw={700}>#{i + 1}</Table.Td>
              <Table.Td>{row.username || row.id}</Table.Td>
              <Table.Td ta="right">{row.points ?? 0}</Table.Td>
              {showWL && (
                <Table.Td ta="right">
                  {row.wins ?? 0} / {row.losses ?? 0}
                </Table.Td>
              )}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}

function HallOfFameTab() {
  const { data, isPending } = useQuery({
    queryKey: ["colosseum-hall-of-fame"],
    queryFn: getHallOfFame,
  });

  if (isPending) return <SectionLoader />;

  const entries = data ?? [];
  if (!entries.length) {
    return (
      <Text fz={13} c="dimmed" py={24}>
        No champions recorded yet. Tournament winners will be enshrined here.
      </Text>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      {entries.map((entry) => (
        <Card key={entry.id} bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
          <Group gap={8} mb={4} wrap="nowrap">
            <IconTrophy size={18} color="var(--mantine-color-yellow-4)" />
            <Text fz={15} fw={700} c="white" lineClamp={1}>
              {entry.tournament_name}
            </Text>
          </Group>
          {entry.year != null && (
            <Text fz={12} c="dimmed">
              {entry.year}
            </Text>
          )}
          <Text fz={13} c="grape.3" mt={4}>
            Champion: {entry.winner || "Unknown"}
          </Text>
          {!!entry.team?.length && (
            <Group gap={6} mt="sm">
              {entry.team.map((slug, i) => (
                <Image
                  key={`${slug}-${i}`}
                  src={getPokemonImageURL(slug)}
                  alt={slug}
                  w={40}
                  h={40}
                  fit="contain"
                />
              ))}
            </Group>
          )}
        </Card>
      ))}
    </SimpleGrid>
  );
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: "gray",
  open_signup: "green",
  running: "grape",
  complete: "blue",
};

function TournamentsTab() {
  const { data, isPending } = useQuery({
    queryKey: ["colosseum-tournaments"],
    queryFn: getTournaments,
  });

  if (isPending) return <SectionLoader />;

  const tournaments = data ?? [];
  if (!tournaments.length) {
    return (
      <Text fz={13} c="dimmed" py={24}>
        No tournaments scheduled right now. Check back for the next bracket event.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      {tournaments.map((t) => {
        const startDate = t.start_date?.seconds
          ? new Date(t.start_date.seconds * 1000).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : null;
        const prizeEntries = Object.entries(t.prizes ?? {});
        return (
          <Card key={t.id} bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
            <Group justify="space-between" wrap="nowrap" mb={6}>
              <Text fz={16} fw={700} c="white" lineClamp={1}>
                {t.name}
              </Text>
              {t.status && (
                <Badge color={STATUS_COLORS[t.status] ?? "gray"} variant="light">
                  {t.status.replace(/_/g, " ")}
                </Badge>
              )}
            </Group>

            <Group gap="md" mb="sm">
              {t.game_generation && (
                <Text fz={12} c="dimmed">
                  {t.game_generation}
                </Text>
              )}
              {t.format && (
                <Text fz={12} c="dimmed">
                  {t.format}
                </Text>
              )}
              {startDate && (
                <Text fz={12} c="dimmed">
                  Starts {startDate}
                </Text>
              )}
            </Group>

            {t.rules && (
              <Box
                fz={13}
                c="dimmed"
                mb="sm"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t.rules) }}
              />
            )}

            {!!prizeEntries.length && (
              <Box>
                <Text fz={12} fw={700} c="grape.3" tt="uppercase" mb={6}>
                  Prizes
                </Text>
                <Stack gap={6}>
                  {prizeEntries.map(([placement, rewards]) => (
                    <Box key={placement}>
                      <Text fz={12} fw={600} c="white" tt="capitalize">
                        {placement.replace(/_/g, " ")}
                      </Text>
                      <Text fz={12} c="dimmed">
                        {(rewards ?? []).join(", ")}
                      </Text>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Card>
        );
      })}
    </Stack>
  );
}

const TABS = [
  { value: "training", label: "Training Room", content: <TrainingRoomTab /> },
  { value: "rankings", label: "Rankings", content: <RankingsTab /> },
  { value: "hall", label: "Hall of Fame", content: <HallOfFameTab /> },
  { value: "tournaments", label: "Tournaments", content: <TournamentsTab /> },
];

export default function Colosseum() {
  const { data: rankings } = useQuery({
    queryKey: ["colosseum-rankings"],
    queryFn: getRankings,
  });
  const { data: tournaments } = useQuery({
    queryKey: ["colosseum-tournaments"],
    queryFn: getTournaments,
  });

  const rankedCount = rankings?.length ?? 0;

  // Days until the soonest upcoming tournament start, else a dash.
  const daysToCup = React.useMemo(() => {
    const now = Date.now();
    const upcoming = (tournaments ?? [])
      .map((t) => t.start_date?.seconds)
      .filter((s): s is number => typeof s === "number" && s * 1000 > now)
      .sort((a, b) => a - b);
    if (!upcoming.length) return "-";
    const days = Math.ceil((upcoming[0] * 1000 - now) / (24 * 60 * 60 * 1000));
    return `${days}d`;
  }, [tournaments]);

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Box
        p={{ base: 20, sm: 28 }}
        mb={24}
        style={{
          borderRadius: 16,
          background: "linear-gradient(135deg, #2a1b4a 0%, #1a1636 60%, #12102a 100%)",
          border: "1px solid #3a3550",
        }}
      >
        <Flex direction={{ base: "column", sm: "row" }} gap="md" align={{ base: "stretch", sm: "center" }}>
          <Box style={{ flex: "2 1 0%", minWidth: 0 }}>
            <Group gap={8} mb={8}>
              <Badge color="red" variant="filled" radius="sm">
                LIVE
              </Badge>
              <Text fz={11} c="grape.3" fw={700} tt="uppercase" style={{ letterSpacing: 1 }}>
                Season 4 . Week 9
              </Text>
            </Group>
            <Title order={1} c="white" fw={800} tt="uppercase" size={34}>
              The Colosseum
            </Title>
            <Text fz={14} c="dimmed" mt={8} maw={520}>
              Train. Battle. Climb the ladder. Every post, every match, every point counts
              toward the top of the standings.
            </Text>
          </Box>

          <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
            <SimpleGrid cols={{ base: 2 }} spacing="sm">
              <Card bg="rgba(0,0,0,0.35)" radius="md" p={12} withBorder style={{ borderColor: "#3a3550" }}>
                <Text fz={24} fw={800} c="white">
                  {rankedCount}
                </Text>
                <Text fz={10} c="dimmed" tt="uppercase">
                  Ranked Players
                </Text>
              </Card>
              <Card bg="rgba(0,0,0,0.35)" radius="md" p={12} withBorder style={{ borderColor: "#3a3550" }}>
                <Text fz={24} fw={800} c="white">
                  {daysToCup}
                </Text>
                <Text fz={10} c="dimmed" tt="uppercase">
                  To Paldea Cup
                </Text>
              </Card>
            </SimpleGrid>
          </Box>
        </Flex>
      </Box>

      <Tabs defaultValue="training" variant="pills" color="grape" keepMounted={false}>
        <Tabs.List mb={16} style={{ flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <Tabs.Tab key={t.value} value={t.value}>
              {t.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {TABS.map((t) => (
          <Tabs.Panel key={t.value} value={t.value}>
            {t.content}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Container>
  );
}
