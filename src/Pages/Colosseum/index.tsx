import {
  Anchor,
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Group,
  Image,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { IconBolt, IconCheck, IconFlame, IconTrophy } from "@tabler/icons-react";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SHADOW_GUIDE_LINK } from "../../lib/shadow";
import { ConfirmPopover } from "../../components/common/ConfirmPopover";
import { HeroStat as HeroStatChip, PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { PokemonHoverCard } from "../../components/pokemon/PokemonHoverCard";
import { SectionLoader } from "../../components/navigation/loading";
import { getPokemonImageURL } from "../../helpers";
import { pokemonData } from "../../data/pokemon";
import {
  BracketRound,
  ensureTrainingThread,
  getHallOfFame,
  getRankings,
  getTournaments,
  getTournamentSignups,
  getTrainingSession,
  HallOfFameEntry,
  MAX_TRAINING_POSTS,
  RankingRow,
  registerForTournament,
  resetTrainingSession,
  Tournament,
  TournamentSignup,
  TrainingSession,
  withdrawFromTournament,
} from "../../queries/colosseum";
import { getMyFriendCode, saveFriendCode } from "../../queries/settings";
import { getOwnedPokemons } from "../../queries/dashboard";
import { levelProgress } from "../../lib/leveling";
import { OwnedPokemon } from "../../components/types/typesUsed";

/**
 * The Colosseum: the battle and training hub. Four sub-systems in one page:
 * the Super Training Room grind, the competitive rankings ladder, the Hall of
 * Fame record, and organized tournaments. Everything renders with no signed-in
 * user and empty collections, so it never crashes on a fresh install.
 *
 * Restyled July 2026 to the cinematic redesign: angular clip-path panels, the
 * Quantico display face, segmented gradient tabs and gold accents. Behavior is
 * unchanged (every query, mutation and counter is preserved).
 */

// --- Redesign tokens (mirror the hi-fi mockup) -----------------------------
const FONT_DISPLAY = "var(--font-display, 'Quantico', sans-serif)";

const CARD_BG = "#141318";
const CARD_BORDER = "#2a2637";
const ASIDE_BG = "#17151c";
const WELL_BG = "#1b1a1e";
const WELL_BORDER = "#3a3550";
const GOLD = "#FFD074";
const GOLD_DEEP = "#C9940F";
const CYAN = "#12B7B6";
const RED = "#E54156";
const DIM = "#b6b1bc";
const FAINT = "#6f6a78";
const PURPLE = "#c79bd6";
const GRAD = "linear-gradient(90deg, #7E2C75, #E54156)";
const BAR_GRAD = "linear-gradient(90deg, #912691, #14e0de)";

const PANEL_CLIP = "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)";
const ASIDE_CLIP = "polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)";
const CTA_CLIP = "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)";
const TAB_CLIP = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";
const CHIP_CLIP = "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)";
const TILE_CLIP = "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)";
const AVATAR_CLIP = "polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)";
const BANNER_CLIP = "polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)";
const RULES_CLIP = "polygon(0 0, 100% 0, 100% 100%, 22px 100%, 0 calc(100% - 22px))";

const SOLO_WINDOW_MS = 2 * 60 * 60 * 1000;
const PARTNER_WINDOW_MS = 4 * 60 * 60 * 1000;

/** Uppercase Quantico label used as the eyebrow inside every panel. */
function PanelLabel(props: {
  children: React.ReactNode;
  color?: string;
  fz?: number;
  spacing?: string;
}) {
  return (
    <Text
      fz={props.fz ?? 13}
      fw={700}
      c={props.color ?? PURPLE}
      tt="uppercase"
      style={{ fontFamily: FONT_DISPLAY, letterSpacing: props.spacing ?? "0.24em" }}
    >
      {props.children}
    </Text>
  );
}

/** Angular dark panel surface shared by the main-column sections. */
function Panel(props: {
  children: React.ReactNode;
  bg?: string;
  border?: string;
  clip?: string;
  padding?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Box
      style={{
        background: props.bg ?? CARD_BG,
        border: `1px solid ${props.border ?? CARD_BORDER}`,
        clipPath: props.clip ?? PANEL_CLIP,
        padding: props.padding ?? "24px 28px",
        ...props.style,
      }}
    >
      {props.children}
    </Box>
  );
}

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

/** Centered numeric well used for the three session counters. */
function StatTile(props: { label: string; value: React.ReactNode }) {
  return (
    <Box
      style={{
        background: WELL_BG,
        border: `1px solid ${CARD_BORDER}`,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Text fz={28} fw={700} c="white" style={{ fontFamily: FONT_DISPLAY }}>
        {props.value}
      </Text>
      <Text
        fz={11}
        fw={700}
        c={FAINT}
        ta="center"
        tt="uppercase"
        style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.22em" }}
      >
        {props.label}
      </Text>
    </Box>
  );
}

/**
 * The training-target header: sprite well, the pokemon's details and a
 * level-progress bar so the member can confirm what they are training.
 */
function TrainingTarget({ pokemon, tag }: { pokemon: OwnedPokemon; tag: string }) {
  const experience = pokemon.experience ?? 0;
  const levelInfo = levelProgress(experience);
  const pct = Math.round(levelInfo.ratio * 100);
  const genderColor = pokemon.gender === "F" ? RED : pokemon.gender === "M" ? "#4dabf7" : FAINT;
  const genderLabel = pokemon.gender === "M" || pokemon.gender === "F" ? pokemon.gender : "";
  const types = [pokemon.type1, pokemon.type2].filter((t) => t && t !== "Unknown").join(" / ");

  return (
    <Flex gap={24} align="center" wrap="wrap">
      <Box
        style={{
          flex: "none",
          width: 84,
          height: 84,
          background: WELL_BG,
          border: `1px solid ${WELL_BORDER}`,
          clipPath: TILE_CLIP,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PokemonHoverCard pokemon={pokemon}>
          <Image
            src={getPokemonImageURL(pokemon.image_slug)}
            alt={`${pokemon.name || pokemon.species} sprite`}
            w={60}
            h={60}
            fit="contain"
            style={{ imageRendering: "pixelated" }}
          />
        </PokemonHoverCard>
      </Box>

      <Stack gap={4} style={{ minWidth: 180 }}>
        <Text fz={22} fw={700} c="white" style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.02em" }}>
          {pokemon.name || pokemon.species}{" "}
          {genderLabel && (
            <Text component="span" c={genderColor}>
              {genderLabel}
            </Text>
          )}
        </Text>
        <Text fz={14} c={DIM}>
          {types || "Unknown type"}
        </Text>
        <Text
          fz={12}
          fw={700}
          c={PURPLE}
          tt="uppercase"
          style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.18em" }}
        >
          {levelInfo.isMax ? "Max Lv 100" : `Lv ${levelInfo.level} . ${pct}% to next`}
        </Text>
      </Stack>

      <Stack gap={8} style={{ flex: 1, minWidth: 200 }}>
        <Box
          style={{
            height: 10,
            background: "#232028",
            clipPath: "polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)",
          }}
        >
          <Box style={{ height: "100%", width: `${pct}%`, background: BAR_GRAD }} />
        </Box>
        <Group justify="space-between" wrap="nowrap">
          <Text fz={12} c={FAINT}>
            progress to next level
          </Text>
          <Text
            fz={12}
            fw={700}
            c={CYAN}
            style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.1em" }}
          >
            {tag}
          </Text>
        </Group>
      </Stack>
    </Flex>
  );
}

/** One angled mode toggle (Solo / Partner). */
function ModeButton(props: { active: boolean; label: string; onClick: () => void; overlap?: boolean }) {
  return (
    <UnstyledButton
      onClick={props.onClick}
      aria-pressed={props.active}
      style={{
        flex: 1,
        minWidth: 200,
        marginLeft: props.overlap ? -2 : 0,
        fontFamily: FONT_DISPLAY,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textAlign: "center",
        padding: "14px 20px",
        border: `1px solid ${WELL_BORDER}`,
        background: props.active ? GRAD : WELL_BG,
        color: props.active ? "#fff" : DIM,
        clipPath: TAB_CLIP,
      }}
    >
      {props.label}
    </UnstyledButton>
  );
}

function TrainingRoomTab() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  // Session counters only apply to today's window (the server resets by date).
  const today = new Date().toISOString().slice(0, 10);
  const sessionIsToday = session?.date === today;
  const postsLogged = sessionIsToday ? session?.postsLogged ?? 0 : 0;
  // Full-point cap is 5 posts solo, 10 with a partner (mirror of the server's
  // evoCap in logTrainingPost).
  const nextEvoPts = postsLogged < (partner ? 10 : 5) ? "1.0" : "0.75";
  const atPostCap = postsLogged >= MAX_TRAINING_POSTS;
  const onLastPost = postsLogged === MAX_TRAINING_POSTS - 1;

  // Opens the shared pinned training thread and sends the member to the post
  // composer with this target preloaded. Points are awarded when the post is
  // published there (the composer calls logTrainingPost).
  const logMutation = useMutation({
    mutationFn: () => ensureTrainingThread(),
    onSuccess: ({ threadId }) => {
      navigate(
        `/Forum/The-Colosseum/thread/${threadId}/post?training=${selectedId}&partner=${partner ? 1 : 0}`
      );
    },
    onError: () => setStatus("Could not open the training thread. Please try again."),
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
      <Panel>
        <Text fz={15} c={DIM}>
          Sign in to use the Super Training Room and log training posts.
        </Text>
      </Panel>
    );
  }

  if (ownedPending) return <SectionLoader />;

  const nextLabel = atPostCap
    ? `Window full, ${MAX_TRAINING_POSTS} posts logged. Come back tomorrow.`
    : `Next post earns ${nextEvoPts} evolution pts.`;
  const sessionTag = atPostCap ? "WINDOW FULL" : "SESSION LIVE";
  const modeHint = partner
    ? "Partner: train in a pair for a 4-hour window. Every post through post 10 earns a full 1.0 pt."
    : "Solo: once per day, 2-hour limit. Posts 1-5 earn 1.0 pt, posts 6 and up earn 0.75.";

  return (
    <Flex direction={{ base: "column", md: "row" }} gap="lg" align="stretch">
      {/* Main column */}
      <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
        <Stack gap="lg">
          <Panel>
            <Stack gap={16}>
              <Group gap={16} wrap="wrap" align="center">
                <PanelLabel color={FAINT}>Training Target</PanelLabel>
                <Select
                  aria-label="Training target Pokemon"
                  placeholder={pokemons.length ? "Choose a Pokemon" : "You have no Pokemon yet"}
                  data={pokemons.map((p) => ({
                    value: p.id,
                    label:
                      p.name && p.name !== p.species ? `${p.name} (${p.species})` : p.species || p.name,
                  }))}
                  value={selectedId}
                  onChange={setSelectedId}
                  disabled={!pokemons.length}
                  maw={280}
                  w="100%"
                  searchable
                  styles={{ input: { background: WELL_BG, borderColor: WELL_BORDER, fontWeight: 700 } }}
                />
              </Group>
              {selected ? (
                <TrainingTarget pokemon={selected} tag={sessionTag} />
              ) : (
                <Text fz={14} c={DIM}>
                  You have no Pokemon yet. Choose a starter to begin training.
                </Text>
              )}
            </Stack>
          </Panel>

          <Panel>
            <Stack gap={18}>
              <Group justify="space-between" gap={16} wrap="wrap" align="center">
                <Title
                  order={2}
                  fz={20}
                  fw={700}
                  c="white"
                  style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.04em" }}
                >
                  Session Live . Super Training Room
                </Title>
                <Group
                  gap={6}
                  wrap="nowrap"
                  style={{
                    border: `1px solid ${GOLD_DEEP}`,
                    padding: "7px 16px",
                    clipPath: CHIP_CLIP,
                  }}
                >
                  <IconBolt size={14} color={GOLD} />
                  <Text
                    fz={13}
                    fw={700}
                    c={GOLD}
                    style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.1em" }}
                  >
                    {countdown} LEFT
                  </Text>
                </Group>
              </Group>

              <SimpleGrid cols={3} spacing={14}>
                <StatTile label="Exp Pts" value={sessionIsToday ? session?.evoPts ?? 0 : 0} />
                <StatTile
                  label="Friendship Pts"
                  value={sessionIsToday ? session?.happinessPts ?? 0 : 0}
                />
                <StatTile
                  label="Posts Logged"
                  value={
                    <>
                      {postsLogged}{" "}
                      <Text component="span" fz={16} c={FAINT}>
                        / {MAX_TRAINING_POSTS}
                      </Text>
                    </>
                  }
                />
              </SimpleGrid>

              <Stack gap={10}>
                <PanelLabel color={FAINT} fz={12}>
                  Training Mode
                </PanelLabel>
                <Flex wrap="wrap">
                  <ModeButton
                    active={!partner}
                    label="SOLO . 2-HOUR WINDOW"
                    onClick={() => setPartner(false)}
                  />
                  <ModeButton
                    active={partner}
                    label="PARTNER . 4-HOUR WINDOW"
                    onClick={() => setPartner(true)}
                    overlap
                  />
                </Flex>
                <Text fz={13} c={DIM} lh={1.5}>
                  {modeHint}
                </Text>
              </Stack>

              <Group gap={18} wrap="wrap" align="center">
                <Button
                  onClick={() => logMutation.mutate()}
                  loading={logMutation.isPending}
                  disabled={!selectedId || atPostCap}
                  tt="uppercase"
                  style={{
                    background: GRAD,
                    border: "none",
                    clipPath: CTA_CLIP,
                    padding: "17px 34px",
                    height: "auto",
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                  }}
                >
                  Log a Training Post →
                </Button>
                <Text fz={14} fw={700} c={atPostCap ? GOLD : CYAN}>
                  {nextLabel}
                </Text>
                <Box style={{ flex: 1 }} />
                <ConfirmPopover
                  message="Reset this training session? Your logged posts for this window are cleared."
                  confirmLabel="Reset"
                  loading={resetMutation.isPending}
                  onConfirm={() => resetMutation.mutate()}
                  target={(open) => (
                    <Button
                      variant="default"
                      onClick={open}
                      loading={resetMutation.isPending}
                      tt="uppercase"
                      c={DIM}
                      style={{
                        background: "none",
                        borderColor: WELL_BORDER,
                        clipPath: CHIP_CLIP,
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: 12,
                        letterSpacing: "0.12em",
                      }}
                    >
                      Reset
                    </Button>
                  )}
                />
              </Group>

              {atPostCap && (
                <Text fz={14} c={GOLD} role="status" aria-live="polite">
                  You reached the {MAX_TRAINING_POSTS}-post limit for this training window.
                </Text>
              )}
              {onLastPost && (
                <Text fz={14} c={GOLD} role="status" aria-live="polite">
                  Heads up: your next post is the last one of this training window.
                </Text>
              )}
              {status && (
                <Text fz={14} c={PURPLE} role="status" aria-live="polite">
                  {status}
                </Text>
              )}
            </Stack>
          </Panel>
        </Stack>
      </Box>

      {/* Aside */}
      <Box style={{ flex: "1 1 0%", minWidth: 0, width: "100%", maxWidth: 340 }}>
        <Stack gap={16}>
          <Panel clip={ASIDE_CLIP} padding="22px 24px">
            <Stack gap={12}>
              <PanelLabel>How Training Scores</PanelLabel>
              {[
                { pts: "1.0 pt", rule: "Posts 1-5, solo mode." },
                { pts: "0.75 pt", rule: "Posts 6 and up, pace yourself." },
                { pts: "1.0 pt", rule: "Every post through 10 in partner mode." },
                { pts: "+1", rule: "Friendship point on every logged post." },
              ].map((r) => (
                <Group key={r.rule} gap={12} wrap="nowrap" align="flex-start">
                  <Text
                    fz={14}
                    fw={700}
                    c={GOLD}
                    style={{ flex: "none", minWidth: 52, fontFamily: FONT_DISPLAY }}
                  >
                    {r.pts}
                  </Text>
                  <Text fz={13} c={DIM} lh={1.55}>
                    {r.rule}
                  </Text>
                </Group>
              ))}
              <Text fz={12} c={FAINT} lh={1.5}>
                Shadow Pokemon earn Purification Points at the same rates instead of evolution
                points. A full purification bar (100) clears the shadow.
              </Text>
              <Anchor component={Link} to={SHADOW_GUIDE_LINK} fz={13} c={PURPLE}>
                How exp, friendship, shadow and purification work →
              </Anchor>
            </Stack>
          </Panel>

          <Panel bg={ASIDE_BG} clip={ASIDE_CLIP} padding="22px 24px">
            <Stack gap={12}>
              <PanelLabel>Session Rules</PanelLabel>
              {[
                "Once per day, 2-hour limit.",
                "Train in a pair for a 4-hour window.",
                `Maximum ${MAX_TRAINING_POSTS} posts per training window.`,
                "Shadow Pokemon earn Purification instead.",
                "Regional forms (Alolan, Galarian, Hisuian) allowed.",
              ].map((text) => (
                <Group key={text} gap={10} wrap="nowrap" align="flex-start">
                  <Box style={{ flex: "none", width: 14, height: 3, background: RED, marginTop: 8 }} />
                  <Text fz={13} c={DIM} lh={1.55}>
                    {text}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Panel>

          <Panel bg="#241f2e" border="#4b3f63" clip={ASIDE_CLIP} padding="22px 24px">
            <Stack gap={10}>
              <Group gap={8} align="center">
                <IconFlame size={16} color={GOLD} />
                <PanelLabel color={GOLD}>Coach's Tip</PanelLabel>
              </Group>
              <Text fz={13} c={DIM} lh={1.6}>
                High-effort posts catch a grader's eye. Detailed training scenes can earn a random
                bonus on top of your base points.
              </Text>
            </Stack>
          </Panel>
        </Stack>
      </Box>
    </Flex>
  );
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

const AVATAR_COLORS = ["red", "blue", "green", "grape", "teal", "orange", "cyan", "pink", "indigo", "lime"];

/** Deterministic avatar color so a player keeps the same square every render. */
function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const POINT_RULES: Array<{ what: string; pts: string; color: string }> = [
  { what: "Defeat a Pokemon", pts: "+1", color: CYAN },
  { what: "Your Pokemon survives", pts: "+1", color: CYAN },
  { what: "Win the battle", pts: "+3", color: GOLD },
  { what: "Beat the champion", pts: "+5", color: GOLD },
  { what: "Upset, per rank gap", pts: "+0.4", color: PURPLE },
  { what: "Tournament win", pts: "+10", color: RED },
];

/** Textual movement arrow, colored by direction. */
function MoveArrow({ value }: { value?: number }) {
  const up = (value ?? 0) > 0;
  const down = (value ?? 0) < 0;
  const ch = up ? "▲" : down ? "▼" : "–";
  const color = up ? CYAN : down ? RED : FAINT;
  const label = up ? "Moved up" : down ? "Moved down" : "No change";
  return (
    <Text component="span" fz={12} c={color} aria-label={label}>
      {ch}
    </Text>
  );
}

function StandingsTable({
  rows,
  showWL,
  showStreak,
}: {
  rows: RankingRow[];
  showWL: boolean;
  showStreak: boolean;
}) {
  const cols = ["70px", "minmax(160px, 1fr)"];
  if (showWL) cols.push("90px");
  if (showStreak) cols.push("80px");
  cols.push("80px");
  const template = cols.join(" ");
  const minW = 70 + 160 + (showWL ? 90 : 0) + (showStreak ? 80 : 0) + 80 + 60;

  const headers: Array<{ key: string; label: string; right?: boolean }> = [
    { key: "rank", label: "#" },
    { key: "player", label: "PLAYER" },
    ...(showWL ? [{ key: "wl", label: "W-L" }] : []),
    ...(showStreak ? [{ key: "streak", label: "STREAK" }] : []),
    { key: "pts", label: "PTS", right: true },
  ];

  return (
    <Box style={{ overflowX: "auto" }}>
      <Box role="table" aria-label="Competitive standings" style={{ minWidth: minW }}>
        <Box
          role="row"
          style={{
            display: "grid",
            gridTemplateColumns: template,
            gap: 10,
            padding: "16px 24px",
            borderBottom: "1px solid #232028",
          }}
        >
          {headers.map((h) => (
            <Text
              key={h.key}
              role="columnheader"
              fz={12}
              fw={700}
              c={FAINT}
              tt="uppercase"
              ta={h.right ? "right" : "left"}
              style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.18em" }}
            >
              {h.label}
            </Text>
          ))}
        </Box>

        {rows.map((row, i) => {
          const rankColor = i === 0 ? GOLD : i < 3 ? GOLD_DEEP : FAINT;
          const win = row.streak?.[0]?.toUpperCase() === "W";
          return (
            <Box
              role="row"
              key={row.id}
              className="dc-row-hover"
              style={{
                display: "grid",
                gridTemplateColumns: template,
                gap: 10,
                alignItems: "center",
                padding: "15px 24px",
                borderBottom: "1px solid #1c1a22",
                background: i === 0 ? "#1c1526" : "transparent",
              }}
            >
              <Group role="cell" gap={8} wrap="nowrap">
                <Text fz={18} fw={700} c={rankColor} style={{ fontFamily: FONT_DISPLAY }}>
                  {i + 1}
                </Text>
                <MoveArrow value={row.movement} />
              </Group>
              <Group role="cell" gap={12} wrap="nowrap" style={{ minWidth: 0 }}>
                <Box
                  style={{
                    flex: "none",
                    width: 30,
                    height: 30,
                    background: `var(--mantine-color-${avatarColor(row.id)}-6)`,
                    clipPath: AVATAR_CLIP,
                  }}
                />
                <Text fz={15} fw={700} c="white" lineClamp={1}>
                  {row.username || row.id}
                </Text>
              </Group>
              {showWL && (
                <Text role="cell" fz={14} c={DIM}>
                  {row.wins ?? 0}-{row.losses ?? 0}
                </Text>
              )}
              {showStreak && (
                <Text
                  role="cell"
                  fz={12}
                  fw={700}
                  c={win ? CYAN : RED}
                  style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.06em" }}
                >
                  {row.streak ?? "–"}
                </Text>
              )}
              <Text
                role="cell"
                fz={18}
                fw={700}
                c={GOLD}
                ta="right"
                style={{ fontFamily: FONT_DISPLAY }}
              >
                {row.points ?? 0}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function PointsPanel() {
  return (
    <Panel bg={ASIDE_BG} clip={ASIDE_CLIP} padding="22px 24px">
      <Stack gap={14}>
        <PanelLabel>How Points Work</PanelLabel>
        {POINT_RULES.map((p) => (
          <Group
            key={p.what}
            justify="space-between"
            wrap="nowrap"
            gap={12}
            pb={12}
            style={{ borderBottom: "1px solid #232028" }}
          >
            <Text fz={14} c={DIM}>
              {p.what}
            </Text>
            <Text fz={14} fw={700} c={p.color} style={{ fontFamily: FONT_DISPLAY }}>
              {p.pts}
            </Text>
          </Group>
        ))}
        <Text fz={13} c={FAINT} lh={1.5}>
          Points are entered by admins from reported battles, no self-scoring.
        </Text>
      </Stack>
    </Panel>
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
    <Flex direction={{ base: "column", md: "row" }} gap="lg" align="stretch">
      <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
        <Panel padding="0">
          {isPending ? (
            <Box p="md">
              <SectionLoader />
            </Box>
          ) : !rows.length ? (
            <Text fz={14} c={DIM} p="md">
              No ranked players yet. Battle results will populate the ladder.
            </Text>
          ) : (
            <StandingsTable rows={rows} showWL={showWL} showStreak={showStreak} />
          )}
        </Panel>
      </Box>

      <Box style={{ flex: "1 1 0%", minWidth: 0, width: "100%", maxWidth: 340 }}>
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
    <Panel style={{ position: "relative", overflow: "hidden" }}>
      <IconTrophy
        size={110}
        color="#ffffff"
        style={{ position: "absolute", top: 10, right: -10, opacity: 0.06, pointerEvents: "none" }}
      />
      <Stack gap={16} style={{ position: "relative" }}>
        <Group gap={14} wrap="nowrap" align="center">
          <Box
            style={{
              flex: "none",
              width: 44,
              height: 44,
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`,
              clipPath: "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconTrophy size={22} color="#1a1b1e" />
          </Box>
          <Box style={{ minWidth: 0 }}>
            <Text
              fz={20}
              fw={700}
              c="white"
              tt="uppercase"
              lineClamp={1}
              style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.02em" }}
            >
              {entry.tournament_name}
            </Text>
            <Text fz={13} fw={700} c={GOLD} lineClamp={1}>
              {entry.year != null ? `${entry.year} Champion` : "Champion"} . {entry.winner || "Unknown"}
            </Text>
          </Box>
        </Group>

        <Stack gap={8}>
          <PanelLabel color={FAINT} fz={11}>
            Champion's Team
          </PanelLabel>
          <Group gap={8}>
            {team.length ? (
              team.map((slug, i) => (
                <Box
                  key={`${slug}-${i}`}
                  style={{
                    width: 52,
                    height: 52,
                    background: WELL_BG,
                    border: `1px solid ${CARD_BORDER}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PokemonHoverCard species={{ slug }}>
                    <Image
                      src={getPokemonImageURL(slug)}
                      alt={slug}
                      w={38}
                      h={38}
                      fit="contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </PokemonHoverCard>
                </Box>
              ))
            ) : (
              <Text fz={14} c={DIM}>
                Team roster not recorded.
              </Text>
            )}
          </Group>
        </Stack>
      </Stack>
    </Panel>
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
      <Text fz={14} c={DIM} py={24}>
        No champions recorded yet. Tournament winners will be enshrined here.
      </Text>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16}>
      {entries.map((entry) => (
        <ChampionCard key={entry.id} entry={entry} />
      ))}
    </SimpleGrid>
  );
}

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  upcoming: "UPCOMING",
  open_signup: "OPEN SIGNUP",
  running: "RUNNING",
  complete: "COMPLETE",
};

const PRIZE_LABEL: Record<string, string> = {
  "1st": "1ST PLACE",
  "2nd": "2ND PLACE",
  "3rd": "3RD PLACE",
  participation: "ENTRY",
};
const PRIZE_COLOR: Record<string, string> = {
  "1st": GOLD,
  "2nd": DIM,
  "3rd": "#E58E26",
  participation: PURPLE,
};

/** Whole days until a start timestamp, 0 if already started, null if unset. */
function daysUntil(ts?: { seconds: number }): number | null {
  if (!ts?.seconds) return null;
  const ms = ts.seconds * 1000 - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/** A stat pair inside the signup banner. */
function BannerStat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <Stack gap={0}>
      <Text fz={28} fw={700} c={color ?? "white"} style={{ fontFamily: FONT_DISPLAY }}>
        {value}
      </Text>
      <Text
        fz={11}
        fw={700}
        c={FAINT}
        tt="uppercase"
        style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.22em" }}
      >
        {label}
      </Text>
    </Stack>
  );
}

function RulesCard({ html }: { html: string }) {
  return (
    <Panel clip={RULES_CLIP}>
      <Stack gap={12}>
        <PanelLabel spacing="0.28em" fz={14}>
          Rules
        </PanelLabel>
        <Box
          fz={14}
          sx={{
            "& ul": {
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            },
            "& li": { position: "relative", paddingLeft: 26, lineHeight: 1.6, color: DIM },
            "& li::before": {
              content: '""',
              position: "absolute",
              left: 0,
              top: 9,
              width: 14,
              height: 3,
              background: RED,
            },
          }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
        />
      </Stack>
    </Panel>
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
    <Panel bg={ASIDE_BG} clip={ASIDE_CLIP} padding="22px 24px">
      <Stack gap={12}>
        <PanelLabel color={GOLD}>Prizes</PanelLabel>
        {keys.map((k) => (
          <Group
            key={k}
            gap={12}
            wrap="nowrap"
            align="flex-start"
            pb={12}
            style={{ borderBottom: "1px solid #232028" }}
          >
            <Text
              fz={13}
              fw={700}
              c={PRIZE_COLOR[k] ?? DIM}
              style={{ flex: "none", minWidth: 80, fontFamily: FONT_DISPLAY, letterSpacing: "0.06em" }}
            >
              {PRIZE_LABEL[k] ?? k.toUpperCase()}
            </Text>
            <Text fz={13} c={DIM} lh={1.5}>
              {(prizes[k] ?? []).join(" . ")}
            </Text>
          </Group>
        ))}
      </Stack>
    </Panel>
  );
}

/** Full-dex options for the free-pick battle team (Switch play, not the dashboard). */
const BATTLE_TEAM_OPTIONS = pokemonData.map((p) => ({ value: p.slug, label: p.name }));

function RegisterCard({ t, signups }: { t: Tournament; signups: TournamentSignup[] }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const [friendCode, setFriendCode] = React.useState("");
  const [teamPokemon, setTeamPokemon] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState("");

  // A friend code saved in Settings prefills the form; registering keeps it in
  // sync so the member only ever types it once.
  const { data: savedFriendCode } = useQuery({
    queryKey: ["friend-code", uid],
    queryFn: () => getMyFriendCode(uid as string),
    enabled: !!uid,
  });

  const mine = signups.find((s) => s.id === uid);

  React.useEffect(() => {
    if (mine) {
      setFriendCode(mine.friendCode ?? "");
      setTeamPokemon(mine.teamPokemon ?? []);
    }
  }, [mine?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!mine && savedFriendCode) setFriendCode((prev) => prev || savedFriendCode);
  }, [savedFriendCode, mine]);

  const registerMutation = useMutation({
    mutationFn: async () => {
      await registerForTournament({
        tournamentId: t.id,
        uid: uid as string,
        username: user?.username,
        friendCode: friendCode.trim(),
        teamPokemon,
      });
      if (friendCode.trim() && friendCode.trim() !== savedFriendCode) {
        await saveFriendCode(uid as string, friendCode).catch(() => undefined);
      }
    },
    onSuccess: () => {
      setStatus(mine ? "Registration updated." : "You are registered. Good luck!");
      queryClient.invalidateQueries({ queryKey: ["tournament-signups", t.id] });
      queryClient.invalidateQueries({ queryKey: ["friend-code", uid] });
    },
    onError: () => setStatus("Could not register. Please try again."),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => withdrawFromTournament(t.id, uid as string),
    onSuccess: () => {
      setStatus("You have withdrawn.");
      setFriendCode(savedFriendCode ?? "");
      setTeamPokemon([]);
      queryClient.invalidateQueries({ queryKey: ["tournament-signups", t.id] });
    },
    onError: () => setStatus("Could not withdraw. Please try again."),
  });

  const closed = t.status === "complete" || t.status === "running";
  const canRegister = !!friendCode.trim() && teamPokemon.length > 0;
  const inputStyles = { input: { background: CARD_BG, borderColor: WELL_BORDER } };

  return (
    <Panel bg="#1c1526" border="#7E2C75" clip={ASIDE_CLIP} padding="22px 24px">
      <Stack gap={14}>
        <PanelLabel>Register</PanelLabel>
        {!uid ? (
          <Text fz={14} c={DIM}>
            Sign in to register for this tournament.
          </Text>
        ) : closed ? (
          <Text fz={14} c={DIM}>
            Sign-ups for this event are closed.
          </Text>
        ) : (
          <>
            {mine && (
              <Badge color="teal" variant="filled" leftSection={<IconCheck size={12} />}>
                Registered
              </Badge>
            )}
            <TextInput
              label="Friend code"
              placeholder="SW-0000-0000-0000"
              description="Saved to your Settings so it prefills next time."
              value={friendCode}
              onChange={(e) => setFriendCode(e.currentTarget.value)}
              styles={inputStyles}
            />
            <MultiSelect
              label="Battle team"
              placeholder={teamPokemon.length >= 6 ? "" : "Pick up to 6 Pokemon"}
              description="This team is for the Switch battle, so pick any Pokemon (owned or not)."
              data={BATTLE_TEAM_OPTIONS}
              value={teamPokemon}
              onChange={setTeamPokemon}
              maxValues={6}
              limit={50}
              searchable
              nothingFoundMessage="No Pokemon matches that search"
              styles={inputStyles}
            />
            <Button
              onClick={() => registerMutation.mutate()}
              loading={registerMutation.isPending}
              disabled={!canRegister}
              fullWidth
              tt="uppercase"
              style={{
                background: GRAD,
                border: "none",
                clipPath: CTA_CLIP,
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                letterSpacing: "0.12em",
              }}
            >
              {mine ? "Update Registration" : "Register for the Cup"}
            </Button>
            {mine && (
              <ConfirmPopover
                message="Withdraw your signup from this tournament?"
                confirmLabel="Withdraw"
                loading={withdrawMutation.isPending}
                onConfirm={() => withdrawMutation.mutate()}
                target={(open) => (
                  <Button
                    variant="subtle"
                    color="red"
                    size="compact-sm"
                    onClick={open}
                    loading={withdrawMutation.isPending}
                  >
                    Withdraw
                  </Button>
                )}
              />
            )}
            {status && (
              <Text fz={13} fw={700} c={PURPLE} role="status" aria-live="polite">
                {status}
              </Text>
            )}
          </>
        )}
      </Stack>
    </Panel>
  );
}

/** One entrant slot inside a bracket match. Winner slot is highlighted. */
function BracketSlot({
  name,
  score,
  won,
  decided,
}: {
  name?: string;
  score?: number;
  won: boolean;
  decided: boolean;
}) {
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      px={10}
      py={7}
      gap={8}
      style={{
        background: won ? "rgba(126, 44, 117, 0.28)" : WELL_BG,
        borderLeft: `3px solid ${won ? "#c79bd6" : "transparent"}`,
      }}
    >
      <Text fz={14} fw={won ? 700 : 500} c={name ? (won || !decided ? "white" : "dimmed") : "dimmed"} lineClamp={1}>
        {name || "TBD"}
      </Text>
      {score != null && (
        <Text fz={14} fw={700} c={won ? PURPLE : "dimmed"} style={{ fontVariantNumeric: "tabular-nums" }}>
          {score}
        </Text>
      )}
    </Group>
  );
}

/**
 * Read-only bracket view for a running or complete tournament. Rounds lay out
 * as columns that scroll horizontally on narrow screens. Renders nothing when
 * there is no bracket data.
 */
function BracketCard({ bracket }: { bracket: BracketRound[] }) {
  if (!bracket.length) return null;
  return (
    <Panel>
      <Stack gap={12}>
        <PanelLabel color="white" spacing="0.1em">
          Bracket
        </PanelLabel>
        <Box style={{ overflowX: "auto" }}>
          <Flex gap="md" align="flex-start" style={{ minWidth: "min-content" }}>
            {bracket.map((round) => (
              <Stack key={round.name} gap="sm" style={{ minWidth: 190, flexShrink: 0 }}>
                <Text fz={14} fw={700} c={PURPLE} tt="uppercase" style={{ letterSpacing: 1 }}>
                  {round.name}
                </Text>
                <Stack gap="sm" justify="center" style={{ flex: 1 }}>
                  {round.matches.map((m, i) => {
                    const decided = m.winner != null;
                    return (
                      <Box key={i} style={{ overflow: "hidden", border: `1px solid ${CARD_BORDER}` }}>
                        <BracketSlot name={m.a} score={m.scoreA} won={m.winner === "a"} decided={decided} />
                        <Box style={{ height: 1, background: CARD_BORDER }} />
                        <BracketSlot name={m.b} score={m.scoreB} won={m.winner === "b"} decided={decided} />
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            ))}
          </Flex>
        </Box>
      </Stack>
    </Panel>
  );
}

function FeaturedTournament({ t }: { t: Tournament }) {
  const { data: signups } = useQuery({
    queryKey: ["tournament-signups", t.id],
    queryFn: () => getTournamentSignups(t.id),
  });
  const registered = signups?.length ?? 0;
  const days = daysUntil(t.start_date);
  const isOpen = t.status === "open_signup";

  return (
    <Flex direction={{ base: "column", md: "row" }} gap="lg" align="stretch">
      <Box style={{ flex: "1 1 0%", minWidth: 0 }}>
        <Stack gap="lg">
          <Box
            style={{
              position: "relative",
              overflow: "hidden",
              background: "linear-gradient(120deg, #2c2352, #1c2a4a)",
              border: `1px solid ${WELL_BORDER}`,
              clipPath: BANNER_CLIP,
              padding: "28px 32px",
            }}
          >
            <Box
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(120deg, rgba(255,255,255,.03) 0 2px, transparent 2px 14px)",
              }}
            />
            <Stack gap={12} style={{ position: "relative" }}>
              <Group gap={12} wrap="wrap" align="center">
                {t.status && (
                  <Text
                    fz={11}
                    fw={700}
                    c={isOpen ? "#0e0d11" : "white"}
                    tt="uppercase"
                    style={{
                      background: isOpen ? CYAN : "#3a3550",
                      padding: "5px 14px",
                      clipPath: CHIP_CLIP,
                      fontFamily: FONT_DISPLAY,
                      letterSpacing: "0.16em",
                    }}
                  >
                    {STATUS_LABEL[t.status] ?? t.status.replace(/_/g, " ").toUpperCase()}
                  </Text>
                )}
                {t.game_generation && (
                  <Text
                    fz={12}
                    fw={700}
                    c={DIM}
                    tt="uppercase"
                    style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.2em" }}
                  >
                    {t.game_generation}
                  </Text>
                )}
              </Group>
              <Title
                order={2}
                fz={{ base: 26, sm: 32 }}
                fw={700}
                c="white"
                tt="uppercase"
                style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.02em" }}
              >
                {t.name}
              </Title>
              {t.format && (
                <Text fz={14} c={DIM}>
                  {t.format}
                </Text>
              )}
              <Group gap={28} wrap="wrap" mt={4}>
                {days != null && (
                  <BannerStat
                    value={days === 0 ? "Starts soon" : `${days} ${days === 1 ? "day" : "days"}`}
                    label="Until Start"
                    color={GOLD}
                  />
                )}
                <BannerStat value={`${registered} / ${t.capacity ?? "-"}`} label="Registered" />
              </Group>
            </Stack>
          </Box>

          {t.rules && <RulesCard html={t.rules} />}
          {t.bracket && t.bracket.length > 0 && <BracketCard bracket={t.bracket} />}
        </Stack>
      </Box>

      <Box style={{ flex: "1 1 0%", minWidth: 0, width: "100%", maxWidth: 380 }}>
        <Stack gap="lg">
          {t.prizes && <PrizesCard prizes={t.prizes} />}
          <RegisterCard t={t} signups={signups ?? []} />
        </Stack>
      </Box>
    </Flex>
  );
}

function CompactTournament({ t }: { t: Tournament }) {
  const days = daysUntil(t.start_date);
  const isOpen = t.status === "open_signup";
  return (
    <Panel padding="18px 24px">
      <Group justify="space-between" wrap="nowrap" mb={6}>
        <Text fz={20} fw={700} c="white" lineClamp={1} style={{ fontFamily: FONT_DISPLAY }}>
          {t.name}
        </Text>
        {t.status && (
          <Text
            fz={11}
            fw={700}
            c={isOpen ? "#0e0d11" : "white"}
            tt="uppercase"
            style={{
              background: isOpen ? CYAN : "#3a3550",
              padding: "5px 12px",
              clipPath: CHIP_CLIP,
              fontFamily: FONT_DISPLAY,
              letterSpacing: "0.12em",
              flexShrink: 0,
            }}
          >
            {STATUS_LABEL[t.status] ?? t.status.replace(/_/g, " ").toUpperCase()}
          </Text>
        )}
      </Group>
      <Group gap="md" wrap="wrap">
        {t.game_generation && (
          <Text fz={14} c={DIM}>
            {t.game_generation}
          </Text>
        )}
        {t.format && (
          <Text fz={14} c={DIM}>
            {t.format}
          </Text>
        )}
        {days != null && (
          <Text fz={14} c={DIM}>
            {days === 0 ? "Started" : `Starts in ${days}d`}
          </Text>
        )}
      </Group>
    </Panel>
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
      <Text fz={14} c={DIM} py={24}>
        No tournaments scheduled right now. Check back for the next bracket event.
      </Text>
    );
  }

  const [featured, ...rest] = tournaments;

  return (
    <Stack gap="xl">
      <FeaturedTournament t={featured} />
      {rest.length > 0 && (
        <Stack gap="md">
          <PanelLabel color="white" spacing="0.1em" fz={14}>
            More Events
          </PanelLabel>
          {rest.map((t) => (
            <CompactTournament key={t.id} t={t} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Page shell + segmented tabs
// ---------------------------------------------------------------------------

type TabKey = "training" | "rankings" | "hall" | "tournaments";

const TAB_DEFS: Array<{ value: TabKey; label: string }> = [
  { value: "training", label: "Training Room" },
  { value: "rankings", label: "Rankings" },
  { value: "hall", label: "Hall of Fame" },
  { value: "tournaments", label: "Tournaments" },
];

export default function Colosseum() {
  const [tab, setTab] = React.useState<TabKey>("training");

  const { data: rankings } = useQuery({
    queryKey: ["colosseum-rankings"],
    queryFn: getRankings,
  });
  const { data: tournaments } = useQuery({
    queryKey: ["colosseum-tournaments"],
    queryFn: getTournaments,
  });

  const rankedCount = rankings?.length ?? 0;
  const openCup = (tournaments ?? []).some((t) => t.status === "open_signup");

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
      <Seo page="/Colosseum" />
      <PageHero
        eyebrow={
          <Group gap={8}>
            <Badge color="red" variant="filled" radius="sm">
              LIVE
            </Badge>
            <Text
              fz={14}
              fw={700}
              c={GOLD}
              tt="uppercase"
              style={{ letterSpacing: "0.3em", fontFamily: FONT_DISPLAY }}
            >
              Season 4 . Week 9
            </Text>
          </Group>
        }
        title="The Colosseum"
        subtitle="Train. Battle. Climb the ladder. Every post, every match, every point counts toward the top of the standings."
        aside={
          <Group gap="sm" wrap="wrap">
            <HeroStatChip value={String(rankedCount)} label="Ranked Players" />
            {openCup ? (
              <HeroStatChip value="OPEN" label="Paldea Cup Signup" color={CYAN} />
            ) : (
              <HeroStatChip value={daysToCup} label="To Paldea Cup" />
            )}
          </Group>
        }
      />

      <Group gap={10} wrap="wrap" mb={22} role="tablist" aria-label="Colosseum sections">
        {TAB_DEFS.map((t) => {
          const on = tab === t.value;
          return (
            <UnstyledButton
              key={t.value}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.value)}
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "11px 24px",
                border: `1px solid ${on ? "#7E2C75" : CARD_BORDER}`,
                background: on ? GRAD : ASIDE_BG,
                color: on ? "#fff" : DIM,
                clipPath: TAB_CLIP,
              }}
            >
              {t.label}
            </UnstyledButton>
          );
        })}
      </Group>

      {tab === "training" && <TrainingRoomTab />}
      {tab === "rankings" && <RankingsTab />}
      {tab === "hall" && <HallOfFameTab />}
      {tab === "tournaments" && <TournamentsTab />}
    </Container>
  );
}
