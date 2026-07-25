import { Box, Button, Container, Group, Image, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HERO_CLIP, HERO_GRADIENT, HERO_STRIPES } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { getPokemonImageURL } from "../../helpers";
import { PokemonHoverCard } from "../../components/pokemon/PokemonHoverCard";
import useMediaQuery from "../../hooks/useMediaQuery";
import { pokemonData } from "../../data/pokemon";
import { postsToBeatStar, starForDex } from "../../lib/encounterStars";
import { withSuffix } from "../../lib/seo/site";
import { stripHtml, truncate } from "../../lib/seo/text";
import { Mission, getMission, pickUpMission } from "../../queries/missions";
import { getStarOverrides } from "../../queries/admin";

/**
 * Full-page mission brief (behind a Mission Vault card). A striped hero and a
 * two-column body (Briefing + Objective/Opposition + Pokemon Rules + possible
 * encounters on the left, Rewards + Bonus + pick-up on the right). "Pick Up
 * Mission" calls the pickUpMission Cloud Function, which creates the Quests
 * thread with the briefing preloaded; closing that thread later files the run
 * for grading automatically, so there is no separate submit form here.
 */

const FONT_DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const HEADER_GRADIENT = "linear-gradient(90deg, #762B77 7%, #17F1F0 66%)";

// Type badge (STORY purple, STANDARD cyan, plus Master/Exceptional variants).
const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  Story: { bg: "#772976", text: "#fff" },
  Standard: { bg: "#12B7B6", text: "#06302f" },
  Master: { bg: "#4D14C4", text: "#fff" },
  Exceptional: { bg: "#FFD074", text: "#1A1B1E" },
};
const typeBadge = (tier?: string) => TYPE_BADGE[tier ?? ""] ?? { bg: "#12B7B6", text: "#06302f" };

const REWARD_LABEL: Record<string, string> = {
  snag: "Snag a Pokemon",
  catch: "Catch a Pokemon",
  recruit: "Recruit a Pokemon",
  egg: "Pokemon Egg",
};

function toLines(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/* --------------------------------- Pieces ---------------------------------- */

/** Angular panel with a full-width purple-to-cyan gradient header bar. */
function GradientPanel(props: { title: string; bodyPad: string; bodyGap: number; children: React.ReactNode }) {
  return (
    <Box style={{ overflow: "hidden", border: "1px solid #2a2637" }}>
      <Box px={26} py={15} style={{ background: HEADER_GRADIENT }}>
        <Text
          component="h2"
          fw={700}
          c="white"
          fz={16}
          tt="uppercase"
          m={0}
          style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.14em" }}
        >
          {props.title}
        </Text>
      </Box>
      <Box
        p={props.bodyPad}
        style={{ background: "#17151c", display: "flex", flexDirection: "column", gap: props.bodyGap }}
      >
        {props.children}
      </Box>
    </Box>
  );
}

/** Dark inner well with an uppercase kicker + arrowed lines. */
function LineWell(props: { label: string; color: string; lines: string[] }) {
  if (!props.lines.length) return null;
  return (
    <Box style={{ background: "#0e0d11", border: "1px solid #232028" }} p="22px 24px">
      <Text fz={14} fw={700} tt="uppercase" c={props.color} mb={12} style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.12em" }}>
        {props.label}
      </Text>
      <Stack gap={8}>
        {props.lines.map((line, i) => (
          <Group key={i} gap={12} wrap="nowrap" align="flex-start">
            <IconArrowRight size={16} color={props.color} style={{ marginTop: 3, flexShrink: 0 }} />
            <Text fz={16} c="#d7d2de" style={{ lineHeight: 1.55 }}>
              {line}
            </Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}

function RewardRow(props: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Group gap={16} wrap="nowrap" p="16px 18px" style={{ background: "#0e0d11", border: "1px solid #232028" }}>
      {props.icon}
      <Box style={{ minWidth: 0 }}>
        <Text fz={16} fw={700} c="white" lineClamp={1}>
          {props.title}
        </Text>
        <Text fz={14} c="#8f8a99" lineClamp={1}>
          {props.sub}
        </Text>
      </Box>
    </Group>
  );
}

function RewardGlyph(props: { bg: string; text?: string; glyph?: string }) {
  return (
    <Box
      style={{
        flex: "none",
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: props.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {props.glyph && (
        <Text fz={15} fw={800} c={props.text ?? "#1A1B1E"}>
          {props.glyph}
        </Text>
      )}
    </Box>
  );
}

/* ------------------------------- Encounters -------------------------------- */

const pokemonNameBySlug = new Map(pokemonData.map((p) => [p.slug, p.name]));
const pokemonIdxBySlug = new Map(pokemonData.map((p) => [p.slug, Number(p.idx)]));
// Admin star overrides apply here too, so the brief's threat/post math matches
// what rollEncounter actually serves (same source as the composer + Pokedex).
const starOfSlug = (slug: string, overrides?: Record<string, number>) => {
  const idx = pokemonIdxBySlug.get(slug) ?? 0;
  return overrides?.[String(idx)] ?? starForDex(idx);
};

/**
 * The mission's default encounter pool so members know what they can run into
 * before picking the job up. Required foes (from the briefing) are flagged;
 * they are the minimum to beat for the grade, everything else is optional.
 */
function EncountersWell({
  mission,
  starOverrides,
}: {
  mission: Mission;
  starOverrides?: Record<string, number>;
}) {
  const pool = mission.encounters ?? [];
  if (!pool.length) return null;
  const required = new Set(mission.requiredEncounters ?? []);
  const sorted = [...pool].sort((a, b) => Number(required.has(b)) - Number(required.has(a)));

  return (
    <Box style={{ background: "#0e0d11", border: "1px solid #232028" }} p="24px 26px">
      <Text fz={14} fw={700} tt="uppercase" c="#12B7B6" mb={10} style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.12em" }}>
        Possible Encounters
      </Text>
      <Text fz={14} c="#8f8a99" mb={20} maw={640} style={{ lineHeight: 1.55 }}>
        You choose when to take on each opponent inside your thread.
        {required.size > 0 &&
          " The ones marked Required come from the briefing; beating them is the minimum to clear the mission."}
      </Text>
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
          gap: 16,
        }}
      >
        {sorted.map((slug) => (
          <Stack key={slug} gap={6} align="center" style={{ textAlign: "center" }}>
            <Box
              style={{
                width: "100%",
                aspectRatio: "1",
                background: "#0a090d",
                border: `1px solid ${required.has(slug) ? "#E8843F" : "#232028"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PokemonHoverCard species={{ slug }}>
                <Image
                  src={getPokemonImageURL(slug)}
                  alt={pokemonNameBySlug.get(slug) ?? slug}
                  w="60%"
                  h="60%"
                  fit="contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </PokemonHoverCard>
            </Box>
            <Text fz={14} c="#fff" lineClamp={1} w="100%">
              {pokemonNameBySlug.get(slug) ?? slug}
            </Text>
            <Text fz={14} c="#FFD074" fw={700}>
              {starOfSlug(slug, starOverrides)}★ ·{" "}
              {postsToBeatStar(starOfSlug(slug, starOverrides))} posts
            </Text>
            {required.has(slug) && (
              <Text
                component="span"
                fz={14}
                fw={700}
                c="#1A1B1E"
                px={8}
                style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.06em", background: "#FFD074" }}
              >
                REQUIRED
              </Text>
            )}
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

/* ---------------------------------- Page ----------------------------------- */

export default function MissionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOverMd } = useMediaQuery();
  const [pickUpError, setPickUpError] = React.useState("");
  const { data: mission, isPending } = useQuery({
    queryKey: ["mission", id],
    queryFn: () => getMission(id!),
    enabled: !!id,
  });
  const { data: starOverrides } = useQuery({
    queryKey: ["star-overrides"],
    queryFn: getStarOverrides,
    enabled: !!user,
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
          <Box style={{ background: "#17151c", border: "1px solid #2a2637" }} p="lg">
            <Text c="white" fw={800} fz={28} mb={8}>
              Mission not found
            </Text>
            <Text c="dimmed" fz={16}>
              This mission may have been retired or the link is out of date. Head back to the Vault
              to pick another job.
            </Text>
          </Box>
        </Stack>
      </Container>
    );
  }

  const objectives = toLines(mission.objective);
  const oppositions = toLines(mission.opposition);
  const rewardLabel = mission.pokemon_reward ? REWARD_LABEL[mission.pokemon_reward.kind] : undefined;
  const tb = typeBadge(mission.tier);
  // Threat reading from the encounter pool: the toughest star on the job and
  // the minimum battle posts to clear every required foe.
  const requiredSlugs = mission.requiredEncounters ?? [];
  const poolSlugs = mission.encounters ?? [];
  const threatStar = poolSlugs.length
    ? Math.max(...poolSlugs.map((s) => starOfSlug(s, starOverrides)))
    : 0;
  const requiredPosts = requiredSlugs.reduce(
    (sum, s) => sum + postsToBeatStar(starOfSlug(s, starOverrides)),
    0
  );
  const seoDescription = truncate(
    stripHtml(mission.story || "") || [...objectives, ...oppositions].join(" "),
    160
  );

  return (
    <Box>
      <Seo
        title={withSuffix(mission.title)}
        description={seoDescription || undefined}
        canonicalPath={`/Missions/${id}`}
        schema={{
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://snagemguild.com/" },
            { "@type": "ListItem", position: 2, name: "The Mission Vault", item: "https://snagemguild.com/Missions" },
            { "@type": "ListItem", position: 3, name: mission.title },
          ],
        }}
      />
      <Container size="lg" pt={{ base: 20, sm: 28 }} pb={{ base: 24, sm: 48 }} px={{ base: 16, sm: 24 }}>
        {/* Striped hero */}
        <Box
          p={{ base: 24, sm: 40 }}
          style={{
            position: "relative",
            overflow: "hidden",
            clipPath: HERO_CLIP,
            background: `${HERO_STRIPES}, ${HERO_GRADIENT}`,
            border: "1px solid #3a3550",
          }}
        >
          <Group gap={14} align="center" wrap="wrap" mb={22}>
            <UnstyledButton
              component={Link}
              to="/Missions"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.12em",
                color: "#fff",
                padding: "12px 20px",
                background: "rgba(0,0,0,0.28)",
                border: "1px solid rgba(255,255,255,0.3)",
                clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
                "&:hover": { borderColor: "#E54156", color: "#E54156" },
              }}
            >
              <IconArrowLeft size={16} />
              ALL MISSIONS
            </UnstyledButton>
            {mission.tier && (
              <Text
                component="span"
                fz={14}
                fw={700}
                tt="uppercase"
                px={14}
                py={6}
                style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.12em", color: tb.text, background: tb.bg }}
              >
                {mission.tier}
              </Text>
            )}
          </Group>

          <Text
            component="h1"
            c="white"
            fw={700}
            fz={{ base: 34, sm: 54 }}
            m={0}
            style={{ fontFamily: FONT_DISPLAY, lineHeight: 1, letterSpacing: "0.01em" }}
          >
            {mission.title}
          </Text>

          <Group gap={8} align="center" mt={16} mb={24} wrap="wrap">
            {mission.location && (
              <>
                <Text component="span" c="#E54156" fz={17}>
                  ●
                </Text>
                <Text fz={17} c="#cfc9d6">
                  {mission.location}
                </Text>
              </>
            )}
            {mission.location && mission.times_taken != null && (
              <Text c="#6f6a78" fz={17}>
                ·
              </Text>
            )}
            {mission.times_taken != null && (
              <Text fz={17} c="#cfc9d6">
                Taken {mission.times_taken}&times; guild-wide
              </Text>
            )}
          </Group>

          {(threatStar > 0 || requiredSlugs.length > 0) && (
            <Group gap={16} wrap="wrap">
              {threatStar > 0 && (
                <Box
                  p="16px 22px"
                  style={{
                    background: "rgba(10,8,14,0.5)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderLeft: "3px solid #FFD074",
                    minWidth: 200,
                  }}
                >
                  <Text fz={14} fw={700} c="#b6b1bc" tt="uppercase" mb={8} style={{ letterSpacing: "0.16em" }}>
                    Threat level
                  </Text>
                  <Text fz={22} fw={800} c="#FFD074">
                    {"★".repeat(threatStar)}{" "}
                    <Text component="span" c="white" fz={20}>
                      up to {threatStar}★
                    </Text>
                  </Text>
                </Box>
              )}
              {requiredSlugs.length > 0 && (
                <Box
                  p="16px 22px"
                  style={{
                    background: "rgba(10,8,14,0.5)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderLeft: "3px solid #E54156",
                    minWidth: 200,
                  }}
                >
                  <Text fz={14} fw={700} c="#b6b1bc" tt="uppercase" mb={8} style={{ letterSpacing: "0.16em" }}>
                    Set foes
                  </Text>
                  <Text fz={20} fw={800} c="white">
                    {requiredSlugs.length} to beat · about {requiredPosts} battle posts
                  </Text>
                </Box>
              )}
            </Group>
          )}
        </Box>

        {/* Two-column body: briefing (left) + rewards/bonus/pick-up (right) */}
        <Box
          mt={24}
          style={{
            display: "grid",
            gridTemplateColumns: isOverMd ? "1.6fr 1fr" : "1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <GradientPanel title="Briefing" bodyPad="28px 30px" bodyGap={22}>
            {mission.story && (
              <Box
                fz={17}
                c="#d7d2de"
                p="22px 24px"
                style={{ background: "#0e0d11", border: "1px solid #232028", lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mission.story) }}
              />
            )}

            {(objectives.length > 0 || oppositions.length > 0) && (
              <Box
                style={{
                  display: "grid",
                  gridTemplateColumns: isOverMd ? "1fr 1fr" : "1fr",
                  gap: 18,
                }}
              >
                <LineWell label="Objective" color="#12B7B6" lines={objectives} />
                <LineWell label="Opposition" color="#E54156" lines={oppositions} />
              </Box>
            )}

            {mission.pokemon_note && (
              <Box style={{ background: "#0e0d11", border: "1px solid #232028" }} p="22px 24px">
                <Text fz={14} fw={700} tt="uppercase" c="#b06fce" mb={12} style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.12em" }}>
                  Pokemon Rules
                </Text>
                <Text fz={16} c="#d7d2de" style={{ lineHeight: 1.55 }}>
                  {mission.pokemon_note}
                </Text>
              </Box>
            )}

            <EncountersWell mission={mission} starOverrides={starOverrides} />
          </GradientPanel>

          {/* Right column */}
          <Box style={{ position: isOverMd ? "sticky" : "static", top: 24 }}>
            <Stack gap={18}>
              <GradientPanel title="Rewards" bodyPad="20px" bodyGap={14}>
                {!!mission.coins && (
                  <RewardRow
                    icon={<RewardGlyph bg="#FFD074" glyph="C" />}
                    title={`${mission.coins} Snag Coins`}
                    sub="base payout"
                  />
                )}
                {rewardLabel && (
                  <RewardRow
                    icon={<RewardGlyph bg="#e6e2ec" />}
                    title={rewardLabel}
                    sub={mission.pokemon_reward?.note || "mission reward"}
                  />
                )}
                {mission.special_item && (
                  <RewardRow icon={<RewardGlyph bg="#346CFD" />} title={mission.special_item} sub="special item" />
                )}
                {mission.emblem_eligible && (
                  <RewardRow icon={<RewardGlyph bg="#FFD074" />} title="Snag Emblem Piece" sub="if eligible" />
                )}
                {!mission.coins && !rewardLabel && !mission.special_item && !mission.emblem_eligible && (
                  <Text fz={14} c="#8f8a99">
                    Rewards set by the grader.
                  </Text>
                )}
                <Text fz={12} c="#8f8a99" style={{ lineHeight: 1.55 }}>
                  Rewards are granted by an admin when your closed run is graded. Pokemon rewards are
                  earned in the thread itself (catch what you defeat) or granted at review.
                </Text>
              </GradientPanel>

              <Box
                p="22px 24px"
                style={{ background: "#17151c", border: "1px solid #2a2637", borderLeft: "3px solid #FFD074" }}
              >
                <Group gap={10} align="center" mb={12}>
                  <Text component="span" c="#FFD074" fz={16}>
                    ✦
                  </Text>
                  <Text fz={14} fw={700} c="#FFD074" tt="uppercase" style={{ fontFamily: FONT_DISPLAY, letterSpacing: "0.16em" }}>
                    Bonus
                  </Text>
                </Group>
                <Text fz={16} c="#d7d2de" style={{ lineHeight: 1.6 }}>
                  {mission.bonus || "Write it well, make it fun to read, and the grader tips extra."}
                </Text>
              </Box>

              {mission.tier === "Master" && (
                <Text fz={14} c="#FFD074" ta="center">
                  Master mission: you need a character with master clearance. Request it from the{" "}
                  <Link to="/Research" style={{ color: "#c79bd6" }}>
                    Research page
                  </Link>
                  .
                </Text>
              )}

              <Button
                radius={0}
                size="lg"
                fullWidth
                loading={pickUpMutation.isPending}
                disabled={!user}
                onClick={() => {
                  setPickUpError("");
                  pickUpMutation.mutate();
                }}
                styles={{
                  root: {
                    background: "#E54156",
                    color: "#fff",
                    border: "none",
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 16,
                    letterSpacing: "0.14em",
                    height: "auto",
                    padding: "19px 0",
                    clipPath: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)",
                  },
                }}
              >
                PICK UP MISSION
              </Button>
              {pickUpError && (
                <Text fz={14} c="#E54156" ta="center" role="status" aria-live="polite">
                  {pickUpError}
                </Text>
              )}
              <Text fz={14} c="#6f6a78" ta="center" px={8} style={{ lineHeight: 1.55 }}>
                {user
                  ? "Creates your roleplay thread in the Quests forum with this briefing preloaded. Play it out, then close the thread and it goes straight to the admins for grading."
                  : "Sign in to pick up this mission."}
              </Text>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
