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
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import {
  IconBolt,
  IconCaretDownFilled,
  IconCaretUpFilled,
  IconCheck,
  IconFlame,
  IconTrophy,
} from "@tabler/icons-react";
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { SectionLoader } from "../../components/navigation/loading";
import { getPokemonImageURL } from "../../helpers";
import {
  getHallOfFame,
  getRankings,
  getTournaments,
  getTournamentSignups,
  getTrainingSession,
  HallOfFameEntry,
  logTrainingPost,
  RankingRow,
  registerForTournament,
  resetTrainingSession,
  Tournament,
  TournamentSignup,
  TrainingSession,
  withdrawFromTournament,
} from "../../queries/colosseum";
import { getOwnedPokemons, getTeamsRaw } from "../../queries/dashboard";

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

/** Section heading shared across the redesigned tabs. */
function SectionLabel({ children, mb = "sm" }: { children: React.ReactNode; mb?: string | number }) {
  return (
    <Text fz={13} fw={800} c="white" tt="uppercase" mb={mb} style={{ letterSpacing: 1 }}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

const AVATAR_COLORS = ["red", "blue", "green", "grape", "teal", "orange", "cyan", "pink", "indigo", "lime"];

/** Deterministic avatar color so a player keeps the same circle every render. */
function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const RANK_COLORS = ["#f5c518", "#c9d1d9", "#cd7f32"]; // gold, silver, bronze for 1-3

/** How-points-work panel content, mirrors docs/COLOSSEUM_DATA.md scoring. */
const SCORING = [
  { label: "Defeat a Pokemon", value: "+1", color: "cyan" },
  { label: "Your Pokemon survives", value: "+1", color: "cyan" },
  { label: "Win the battle", value: "+3", color: "green" },
  { label: "Beat the champion", value: "+5", color: "yellow" },
  { label: "Upset (per rank gap)", value: "+0.4", color: "violet" },
  { label: "Tournament win", value: "+10", color: "yellow" },
];

function Movement({ value }: { value?: number }) {
  if (!value) {
    return (
      <Text fz={12} c="dimmed" w={14} ta="center" aria-label="No change">
        &ndash;
      </Text>
    );
  }
  const up = value > 0;
  const Icon = up ? IconCaretUpFilled : IconCaretDownFilled;
  return (
    <Icon
      size={13}
      color={up ? "var(--mantine-color-teal-5)" : "var(--mantine-color-red-5)"}
      aria-label={up ? "Moved up" : "Moved down"}
    />
  );
}

function StreakBadge({ streak }: { streak?: string }) {
  if (!streak) return null;
  const win = streak[0]?.toUpperCase() === "W";
  return (
    <Badge color={win ? "teal" : "red"} variant="light" radius="sm" size="sm">
      {streak}
    </Badge>
  );
}

function StandingRow({
  row,
  rank,
  showWL,
  showStreak,
}: {
  row: RankingRow;
  rank: number;
  showWL: boolean;
  showStreak: boolean;
}) {
  const rankColor = rank <= 3 ? RANK_COLORS[rank - 1] : "#8a8399";
  return (
    <Table.Tr>
      <Table.Td>
        <Group gap={8} wrap="nowrap">
          <Text fz={20} fw={800} c={rankColor} style={{ fontVariantNumeric: "tabular-nums", minWidth: 22 }}>
            {rank}
          </Text>
          <Movement value={row.movement} />
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap={10} wrap="nowrap">
          <Box
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: `var(--mantine-color-${avatarColor(row.id)}-6)`,
              flexShrink: 0,
            }}
          />
          <Text fz={14} fw={700} c="white" lineClamp={1}>
            {row.username || row.id}
          </Text>
        </Group>
      </Table.Td>
      {showWL && (
        <Table.Td ta="center">
          <Text fz={13} c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
            {row.wins ?? 0}&ndash;{row.losses ?? 0}
          </Text>
        </Table.Td>
      )}
      {showStreak && (
        <Table.Td ta="center">
          <StreakBadge streak={row.streak} />
        </Table.Td>
      )}
      <Table.Td ta="right">
        <Text fz={18} fw={800} c="yellow.4" style={{ fontVariantNumeric: "tabular-nums" }}>
          {row.points ?? 0}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

function PointsPanel() {
  return (
    <Card bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
      <SectionLabel>How Points Work</SectionLabel>
      <Stack gap={0}>
        {SCORING.map((s, i) => (
          <Group
            key={s.label}
            justify="space-between"
            wrap="nowrap"
            py={10}
            style={{ borderTop: i ? "1px solid #2a2637" : undefined }}
          >
            <Text fz={13} c="gray.3">
              {s.label}
            </Text>
            <Text fz={15} fw={800} c={`${s.color}.4`}>
              {s.value}
            </Text>
          </Group>
        ))}
      </Stack>
      <Text fz={11} c="dimmed" mt="sm" pt="sm" style={{ borderTop: "1px solid #2a2637" }}>
        Points are entered by admins from reported battles, no self-scoring.
      </Text>
    </Card>
  );
}

function RankingsTab() {
  const { data, isPending } = useQuery({
    queryKey: ["colosseum-rankings"],
    queryFn: getRankings,
  });

  const rows = data ?? [];
  const showWL = rows.some((r) => r.wins != null || r.losses != null);
  const showStreak = rows.some((r) => r.streak);

  return (
    <Flex direction={{ base: "column", md: "row" }} gap="lg" align="flex-start">
      <Box style={{ flex: "2 1 0%", minWidth: 0, width: "100%" }}>
        <SectionLabel>Competitive Standings</SectionLabel>
        <Card
          bg="#1c1a26"
          radius="md"
          p={0}
          withBorder
          style={{ borderColor: "#3a3550", overflow: "hidden" }}
        >
          {isPending ? (
            <Box p="md">
              <SectionLoader />
            </Box>
          ) : !rows.length ? (
            <Text fz={13} c="dimmed" p="md">
              No ranked players yet. Battle results will populate the ladder.
            </Text>
          ) : (
            <Box style={{ overflowX: "auto" }}>
              <Table verticalSpacing="sm" horizontalSpacing="md" miw={420} highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>#</Table.Th>
                    <Table.Th>Player</Table.Th>
                    {showWL && <Table.Th ta="center">W&ndash;L</Table.Th>}
                    {showStreak && <Table.Th ta="center">Streak</Table.Th>}
                    <Table.Th ta="right">Pts</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {rows.map((row, i) => (
                    <StandingRow
                      key={row.id}
                      row={row}
                      rank={i + 1}
                      showWL={showWL}
                      showStreak={showStreak}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </Box>
          )}
        </Card>
      </Box>

      <Box style={{ flex: "1 1 0%", minWidth: 0, width: "100%", maxWidth: 360 }}>
        <PointsPanel />
      </Box>
    </Flex>
  );
}

// ---------------------------------------------------------------------------
// Hall of Fame
// ---------------------------------------------------------------------------

function ChampionCard({ entry }: { entry: HallOfFameEntry }) {
  const team = entry.team ?? [];
  return (
    <Card
      bg="#1c1a26"
      radius="md"
      p="lg"
      withBorder
      style={{ borderColor: "#3a3550", position: "relative", overflow: "hidden" }}
    >
      <IconTrophy
        size={120}
        color="#ffffff"
        style={{ position: "absolute", top: -12, right: -12, opacity: 0.05, pointerEvents: "none" }}
      />
      <Group gap={14} wrap="nowrap" align="center" mb="md">
        <Box
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: "linear-gradient(135deg, #f9d423, #e6a817)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconTrophy size={28} color="#3a2a05" />
        </Box>
        <Box style={{ minWidth: 0 }}>
          <Text fz={17} fw={800} c="white" tt="uppercase" lineClamp={1}>
            {entry.tournament_name}
          </Text>
          <Text fz={13} fw={700} c="yellow.4" lineClamp={1}>
            {entry.year != null ? `${entry.year} Champion` : "Champion"} . {entry.winner || "Unknown"}
          </Text>
        </Box>
      </Group>

      <Text fz={11} fw={700} c="dimmed" tt="uppercase" mb={8} style={{ letterSpacing: 1 }}>
        Champion's Team
      </Text>
      <Group gap={8}>
        {team.length ? (
          team.map((slug, i) => (
            <Box
              key={`${slug}-${i}`}
              style={{
                width: 46,
                height: 46,
                borderRadius: 8,
                background: "#15131d",
                border: "1px solid #2a2637",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Image src={getPokemonImageURL(slug)} alt={slug} w={38} h={38} fit="contain" />
            </Box>
          ))
        ) : (
          <Text fz={12} c="dimmed">
            Team roster not recorded.
          </Text>
        )}
      </Group>
    </Card>
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
    <>
      <SectionLabel>Hall of Fame</SectionLabel>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {entries.map((entry) => (
          <ChampionCard key={entry.id} entry={entry} />
        ))}
      </SimpleGrid>
    </>
  );
}

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  upcoming: "gray",
  open_signup: "green",
  running: "grape",
  complete: "blue",
};

const PRIZE_ICON: Record<string, string> = {
  "1st": "\u{1F947}",
  "2nd": "\u{1F948}",
  "3rd": "\u{1F949}",
  participation: "\u{1F39F}\u{FE0F}",
};
const PRIZE_LABEL: Record<string, string> = {
  "1st": "1st Place",
  "2nd": "2nd Place",
  "3rd": "3rd Place",
  participation: "Participation",
};

/** Whole days until a start timestamp, 0 if already started, null if unset. */
function daysUntil(ts?: { seconds: number }): number | null {
  if (!ts?.seconds) return null;
  const ms = ts.seconds * 1000 - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <Box>
      <Text fz={30} fw={800} c="white" lh={1}>
        {value}
      </Text>
      <Text fz={10} c="dimmed" tt="uppercase" mt={4} style={{ letterSpacing: 1 }}>
        {label}
      </Text>
    </Box>
  );
}

function RulesCard({ html }: { html: string }) {
  return (
    <Card bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
      <SectionLabel>Rules</SectionLabel>
      <Box
        fz={13}
        c="dimmed"
        sx={{
          "& ul": { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 },
          "& li": { position: "relative", paddingLeft: 22, lineHeight: 1.5 },
          "& li::before": {
            content: '"\\A7"',
            position: "absolute",
            left: 0,
            color: "var(--mantine-color-grape-4)",
            fontWeight: 700,
          },
        }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
      />
    </Card>
  );
}

function PrizesCard({ prizes }: { prizes: Record<string, string[]> }) {
  const order = ["1st", "2nd", "3rd", "participation"];
  const keys = Object.keys(prizes).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return (
    <Card bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
      <SectionLabel>Prizes</SectionLabel>
      <Stack gap={0}>
        {keys.map((k, i) => (
          <Group
            key={k}
            gap={12}
            wrap="nowrap"
            align="flex-start"
            py={12}
            style={{ borderTop: i ? "1px solid #2a2637" : undefined }}
          >
            <Text fz={22} style={{ lineHeight: 1 }}>
              {PRIZE_ICON[k] ?? "\u{1F3C5}"}
            </Text>
            <Box style={{ minWidth: 0 }}>
              <Text fz={13} fw={700} c="white">
                {PRIZE_LABEL[k] ?? k}
              </Text>
              <Text fz={12} c="dimmed">
                {(prizes[k] ?? []).join(" . ")}
              </Text>
            </Box>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function RegisterCard({ t, signups }: { t: Tournament; signups: TournamentSignup[] }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const [friendCode, setFriendCode] = React.useState("");
  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState("");

  const { data: teams } = useQuery({
    queryKey: ["teams-raw", uid],
    queryFn: () => getTeamsRaw(uid as string),
    enabled: !!uid,
  });

  const mine = signups.find((s) => s.id === uid);

  React.useEffect(() => {
    if (mine) {
      setFriendCode(mine.friendCode ?? "");
      setTeamId(mine.teamId ?? null);
    }
  }, [mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const registerMutation = useMutation({
    mutationFn: () =>
      registerForTournament({
        tournamentId: t.id,
        uid: uid as string,
        username: user?.username,
        friendCode: friendCode.trim(),
        teamId: teamId as string,
        teamName: teams?.find((tm) => tm.id === teamId)?.team_name,
      }),
    onSuccess: () => {
      setStatus(mine ? "Registration updated." : "You are registered. Good luck!");
      queryClient.invalidateQueries({ queryKey: ["tournament-signups", t.id] });
    },
    onError: () => setStatus("Could not register. Please try again."),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawFromTournament(t.id, uid as string),
    onSuccess: () => {
      setStatus("You have withdrawn.");
      setFriendCode("");
      setTeamId(null);
      queryClient.invalidateQueries({ queryKey: ["tournament-signups", t.id] });
    },
    onError: () => setStatus("Could not withdraw. Please try again."),
  });

  const closed = t.status === "complete" || t.status === "running";
  const canRegister = !!friendCode.trim() && !!teamId;

  return (
    <Card
      radius="md"
      p="md"
      withBorder
      style={{ borderColor: "#5a3fb0", background: "linear-gradient(160deg, #241a3d, #1a1626)" }}
    >
      <SectionLabel>Register</SectionLabel>
      {!uid ? (
        <Text fz={13} c="dimmed">
          Sign in to register for this tournament.
        </Text>
      ) : closed ? (
        <Text fz={13} c="dimmed">
          Sign-ups for this event are closed.
        </Text>
      ) : (
        <Stack gap="sm">
          {mine && (
            <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
              Registered
            </Badge>
          )}
          <TextInput
            aria-label="Friend code"
            placeholder="Friend code (SW-0000-0000-0000)"
            value={friendCode}
            onChange={(e) => setFriendCode(e.currentTarget.value)}
          />
          <Select
            aria-label="Battle Team"
            placeholder={teams?.length ? "Select a Battle Team" : "You have no Battle Teams"}
            data={(teams ?? []).map((tm) => ({ value: tm.id, label: tm.team_name || "Unnamed team" }))}
            value={teamId}
            onChange={setTeamId}
            disabled={!teams?.length}
            nothingFoundMessage="No teams yet"
            searchable
          />
          <Button
            variant="gradient"
            gradient={{ from: "grape", to: "cyan", deg: 90 }}
            onClick={() => registerMutation.mutate()}
            loading={registerMutation.isPending}
            disabled={!canRegister}
            fullWidth
          >
            {mine ? "Update Registration" : `Register for ${t.name}`}
          </Button>
          {mine && (
            <Button
              variant="subtle"
              color="red"
              size="compact-sm"
              onClick={() => withdrawMutation.mutate()}
              loading={withdrawMutation.isPending}
            >
              Withdraw
            </Button>
          )}
          {status && (
            <Text fz={12} c="grape.3" role="status" aria-live="polite">
              {status}
            </Text>
          )}
        </Stack>
      )}
    </Card>
  );
}

function FeaturedTournament({ t }: { t: Tournament }) {
  const { data: signups } = useQuery({
    queryKey: ["tournament-signups", t.id],
    queryFn: () => getTournamentSignups(t.id),
  });
  const registered = signups?.length ?? 0;
  const days = daysUntil(t.start_date);
  const statusColor = STATUS_COLORS[t.status ?? "upcoming"] ?? "gray";

  return (
    <Flex direction={{ base: "column", md: "row" }} gap="md" align="stretch">
      <Box style={{ flex: "2 1 0%", minWidth: 0 }}>
        <Stack gap="md">
          <Box
            p={{ base: 20, sm: 28 }}
            style={{
              borderRadius: 14,
              background: "linear-gradient(135deg, #2a1b4a 0%, #16213e 100%)",
              border: "1px solid #3a3550",
            }}
          >
            <Group gap={10} mb={12} wrap="wrap">
              {t.status && (
                <Badge color={statusColor} variant="filled" radius="sm" tt="uppercase">
                  {t.status.replace(/_/g, " ")}
                </Badge>
              )}
              {t.game_generation && (
                <Text fz={12} c="dimmed">
                  {t.game_generation}
                </Text>
              )}
            </Group>
            <Title order={2} c="white" fw={800} tt="uppercase" size={30} mb={8}>
              {t.name}
            </Title>
            {t.format && (
              <Text fz={13} c="dimmed" mb="lg">
                {t.format}
              </Text>
            )}
            <Group gap={40}>
              {days != null && (
                <HeroStat value={`${days} ${days === 1 ? "day" : "days"}`} label="Until Start" />
              )}
              <HeroStat value={`${registered} / ${t.capacity ?? "-"}`} label="Registered" />
            </Group>
          </Box>

          {t.rules && <RulesCard html={t.rules} />}
        </Stack>
      </Box>

      <Box style={{ flex: "1 1 0%", minWidth: 0, maxWidth: 380 }}>
        <Stack gap="md">
          {t.prizes && <PrizesCard prizes={t.prizes} />}
          <RegisterCard t={t} signups={signups ?? []} />
        </Stack>
      </Box>
    </Flex>
  );
}

function CompactTournament({ t }: { t: Tournament }) {
  const days = daysUntil(t.start_date);
  return (
    <Card bg="#1c1a26" radius="md" p="md" withBorder style={{ borderColor: "#3a3550" }}>
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
      <Group gap="md">
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
        {days != null && (
          <Text fz={12} c="dimmed">
            {days === 0 ? "Started" : `Starts in ${days}d`}
          </Text>
        )}
      </Group>
    </Card>
  );
}

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

  const [featured, ...rest] = tournaments;

  return (
    <Stack gap="xl">
      <FeaturedTournament t={featured} />
      {rest.length > 0 && (
        <Box>
          <SectionLabel>More Events</SectionLabel>
          <Stack gap="md">
            {rest.map((t) => (
              <CompactTournament key={t.id} t={t} />
            ))}
          </Stack>
        </Box>
      )}
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
