import {
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  MultiSelect,
  NumberInput,
  Popover,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconArrowsExchange, IconChartBar } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmPopover } from "../../components/common/ConfirmPopover";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { PokemonHoverCard } from "../../components/pokemon/PokemonHoverCard";
import { SectionLoader } from "../../components/navigation/loading";
import { useAuth } from "../../context/AuthContext";
import { getPokemonImageURL } from "../../helpers";
import useMediaQuery from "../../hooks/useMediaQuery";
import { clickable } from "../../lib/a11y";
import { ALL_TYPES, typesForDex } from "../../lib/typeChart";
import { levelProgress } from "../../lib/leveling";
import { starForDex } from "../../lib/encounterStars";
import { NATURE_GROUPS, natureOf } from "../../lib/natures";
import { eggGroupsForDex } from "../../lib/eggGroups";
import { pokemonData } from "../../data/pokemon";
import { getCharacters, getOwnedPokemons, getTeamsRaw } from "../../queries/dashboard";
import { assignPokemonCharacter } from "../../queries/evolution";
import {
  ThreadLockEntry,
  TradeListing,
  TradeSnapshot,
  TradeWants,
  callCancelTradeListing,
  callCreateTradeListing,
  callMakeTradeOffer,
  callRespondTradeOffer,
  getThreadLocks,
  getTradeListings,
} from "../../queries/game";
import { OwnedPokemon } from "../../components/types/typesUsed";

/**
 * The Trading Post: a public board of listings. Put one pokemon up with what
 * you would accept in return, or scan the board and make an offer on someone
 * else's listing. All swaps run through Cloud Functions; a pokemon on a
 * locked team in an open battle thread cannot be traded until that thread
 * closes (greyed with a tooltip link to the thread). Members can also move
 * pokemon between their OWN characters here, since ownership is
 * character-level, not account-level.
 *
 * The "what you'd accept" criteria and the pokemon previews are data-driven
 * (MUSTHAVE_OPTIONS + the server snapshot fields): new game mechanics extend
 * those lists and this UI follows automatically.
 */

/* ------------------------------ Design tokens ------------------------------ */

const FONT_D = "var(--font-display, 'Quantico', sans-serif)";
const GRAD_PR = "linear-gradient(90deg, #7E2C75, #E54156)";

// Angled clip-paths from the mockup (bottom-right cut panels, chevron pills).
const CLIP_PANEL_16 = "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)";
const CLIP_PANEL_12 = "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)";
const CLIP_SELF = "polygon(0 0, 100% 0, 100% 100%, 22px 100%, 0 calc(100% - 22px))";
const CLIP_TOGGLE = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";
const CLIP_CHIP = "polygon(7px 0, 100% 0, calc(100% - 7px) 100%, 0 100%)";
const CLIP_CTA = "polygon(14px 0, 100% 0, calc(100% - 14px) 100%, 0 100%)";
const CLIP_CTA_S = "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)";
const CLIP_CTA_XS = "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)";
const CLIP_PULL = "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)";

// Shared dark input skin for the Mantine form controls (matches #141318 wells).
const INPUT_STYLES = {
  input: { background: "#141318", borderColor: "#3a3550", color: "#fff" },
  label: { color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 4 },
  description: { color: "#6f6a78" },
} as const;

const GENDER_COLOR = (g?: string) => (g === "F" ? "pink.3" : "blue.3");

const EMPTY_WANTS: TradeWants = {
  species: [],
  types: [],
  shiny: false,
  minLevel: 0,
  minStar: 0,
  nature: "",
  gender: "",
  note: "",
};

/** A short colored rule + Quantico uppercase label used atop each panel. */
function PanelKicker(props: { color: string; children: React.ReactNode }) {
  return (
    <Text
      fz={12}
      fw={700}
      c={props.color}
      tt="uppercase"
      style={{ fontFamily: FONT_D, letterSpacing: "0.26em" }}
    >
      {props.children}
    </Text>
  );
}

/** Panel heading (Quantico, uppercase-ish, white). */
function PanelTitle(props: { children: React.ReactNode }) {
  return (
    <Text
      component="h2"
      fz={20}
      fw={700}
      c="white"
      m={0}
      style={{ fontFamily: FONT_D, letterSpacing: "0.02em" }}
    >
      {props.children}
    </Text>
  );
}

/** Angled segmented button used for the two page tabs and the board filters. */
function SegButton(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  leftSection?: React.ReactNode;
  small?: boolean;
  first?: boolean;
  fullWidth?: boolean;
  clip?: string;
}) {
  return (
    <UnstyledButton
      onClick={props.onClick}
      aria-pressed={props.active}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: props.fullWidth ? "flex-start" : "center",
        gap: 8,
        width: props.fullWidth ? "100%" : undefined,
        fontFamily: FONT_D,
        fontSize: props.small ? 12 : 13,
        fontWeight: 700,
        letterSpacing: props.small ? "0.1em" : "0.08em",
        textTransform: "uppercase",
        padding: props.small ? "9px 20px" : "12px 24px",
        marginLeft: props.first || props.fullWidth ? 0 : -2,
        cursor: "pointer",
        border: `1px solid ${props.active ? "#7E2C75" : "#3a3550"}`,
        background: props.active ? GRAD_PR : "#17151c",
        color: props.active ? "#fff" : "#b6b1bc",
        clipPath: props.clip ?? CLIP_TOGGLE,
      }}
    >
      {props.leftSection}
      {props.children}
    </UnstyledButton>
  );
}

/** Human chips for a wants object's must-have criteria (shared by the summary
 * popover and the create form). */
function mustHaveChips(w: TradeWants): string[] {
  const chips: string[] = [];
  if (w.shiny) chips.push("Shiny");
  if (w.minLevel > 0) chips.push(`Lv ${w.minLevel}+`);
  if (w.minStar > 0) chips.push(`${w.minStar}★+`);
  if (w.nature) chips.push(`${w.nature} nature`);
  if (w.gender) chips.push(w.gender === "F" ? "Female" : "Male");
  return chips;
}

function timeAgo(seconds?: number): string {
  if (!seconds) return "";
  const diff = Math.max(0, Date.now() / 1000 - seconds);
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  return `${Math.round(diff / 86400)}d ago`;
}

/** Compact info line for a snapshot; renders whatever fields are present so
 * future snapshot additions (from the server) show up without UI changes. */
function SnapshotChips(props: { p: TradeSnapshot; ta?: "left" | "center" }) {
  const { p } = props;
  const chips: string[] = [];
  if (p.level) chips.push(`Lv ${p.level}`);
  if (p.types?.length) chips.push(p.types.join("/"));
  if (p.star) chips.push(`${p.star}★`);
  if (p.nature) chips.push(p.nature);
  if (p.eggGroups?.length) chips.push(`Egg: ${p.eggGroups.join("/")}`);
  return (
    <Text fz={12} c="#b6b1bc" ta={props.ta ?? "center"}>
      {chips.join(" · ")}
    </Text>
  );
}

/**
 * Advisory check of a pokemon against a listing's wants; the owner still
 * decides, so a mismatch only warns (or filters), it never blocks an offer.
 */
function wantsMismatch(p: OwnedPokemon | undefined, w: TradeWants): string[] {
  if (!p) return [];
  const idx = Number(p.pokedex) || 0;
  const problems: string[] = [];
  if (w.species.length && !w.species.includes(String(p.image_slug ?? ""))) {
    problems.push("not a requested species");
  }
  if (w.types.length && !typesForDex(idx).some((t) => w.types.includes(t))) {
    problems.push("not a requested type");
  }
  if (w.shiny && !p.shiny) problems.push("not shiny");
  if (w.minLevel > 0 && levelProgress(Number(p.experience) || 0).level < w.minLevel) {
    problems.push(`below level ${w.minLevel}`);
  }
  if (w.minStar > 0 && starForDex(idx) < w.minStar) problems.push(`below ${w.minStar}★`);
  if (w.nature && natureOf(p) !== w.nature) problems.push(`not ${w.nature} nature`);
  if (w.gender && p.gender !== w.gender) {
    problems.push(w.gender === "F" ? "not female" : "not male");
  }
  return problems;
}

/** Short wants summary: at most two chips + a popover with the full list, so
 * long wish lists never break the card layout. */
function WantsSummary(props: { wants: TradeWants; align?: "center" | "left" }) {
  const w = props.wants;
  const align = props.align ?? "center";
  const chips: string[] = [];
  w.species.forEach((slug) => {
    const s = pokemonData.find((p) => p.slug === slug);
    chips.push(s?.name ?? slug);
  });
  w.types.forEach((t) => chips.push(`Any ${t}-type`));
  mustHaveChips(w).forEach((c) => chips.push(c));
  if (!chips.length) chips.push("Open to offers");
  const shown = chips.slice(0, 2);
  const extra = chips.length - shown.length;
  return (
    <Group gap={6} justify={align === "left" ? "flex-start" : "center"} wrap="wrap">
      {shown.map((c) => (
        <Badge key={c} variant="light" color="grape" size="sm" radius={0}>
          {c}
        </Badge>
      ))}
      {extra > 0 && (
        <Popover width={260} position="bottom" withArrow shadow="md">
          <Popover.Target>
            <Badge
              variant="outline"
              color="gray"
              size="sm"
              radius={0}
              style={{ cursor: "pointer" }}
              tabIndex={0}
              aria-label="View the full wish list"
            >
              +{extra} more
            </Badge>
          </Popover.Target>
          <Popover.Dropdown bg="#17151c" style={{ borderColor: "#2a2637" }}>
            <Text fz={13} fw={700} c="white" mb={6}>
              Full wish list
            </Text>
            <Stack gap={4}>
              {chips.map((c) => (
                <Text key={c} fz={13} c="dimmed">
                  · {c}
                </Text>
              ))}
              {w.note && (
                <Text fz={13} c="dimmed" fs="italic" mt={4}>
                  &quot;{w.note}&quot;
                </Text>
              )}
            </Stack>
          </Popover.Dropdown>
        </Popover>
      )}
      {w.note && extra <= 0 && (
        <Text fz={12} c="dimmed" ta={align} lineClamp={1} w="100%">
          {w.note}
        </Text>
      )}
    </Group>
  );
}

/** The open battle thread pinning this pokemon's team, if any. */
function lockFor(
  pokemonId: string,
  teams: Array<{ id: string; pokemon_ids?: string[] }> | undefined,
  locks: Record<string, ThreadLockEntry> | undefined
): ThreadLockEntry | null {
  if (!teams || !locks) return null;
  for (const lock of Object.values(locks)) {
    for (const teamId of lock.teamIds ?? []) {
      const team = teams.find((t) => t.id === teamId);
      if (team?.pokemon_ids?.includes(pokemonId)) return lock;
    }
  }
  return null;
}

/** One-line stat summary for an owned pokemon (level, types, star, nature). */
function ownedInfoLine(p: OwnedPokemon): string {
  const idx = Number(p.pokedex) || 0;
  return [
    `Lv ${levelProgress(Number(p.experience) || 0).level}`,
    typesForDex(idx).join("/"),
    `${starForDex(idx)}★`,
    natureOf(p),
    p.shiny ? "Shiny" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Full confirmation well for the pokemon about to be traded away or offered,
 * so members with several of the same species can tell exactly which one they
 * picked before committing.
 */
function OwnedDetailCard(props: { pokemon: OwnedPokemon; heading: string }) {
  const p = props.pokemon;
  const idx = Number(p.pokedex) || 0;
  return (
    <Box
      mt={12}
      p={16}
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        background: "rgba(62,207,142,.05)",
        border: "1px solid #1f7a4d",
      }}
    >
      <PokemonHoverCard pokemon={p}>
        <Avatar
          src={getPokemonImageURL(p.image_slug, p.shiny)}
          size={56}
          radius="xl"
          style={{ flex: "none" }}
        />
      </PokemonHoverCard>
      <Box style={{ minWidth: 0 }}>
        <Text fz={11} fw={700} c="#3ecf8e" tt="uppercase" style={{ fontFamily: FONT_D, letterSpacing: "0.2em" }}>
          {props.heading}
        </Text>
        <Text fz={16} fw={700} c="white">
          {p.name || p.species}{" "}
          <Text span c={GENDER_COLOR(p.gender)} fw={700}>
            {p.gender ?? ""}
          </Text>
          {p.name && p.name !== p.species && (
            <Text span fz={14} c="dimmed">
              {" "}
              ({p.species})
            </Text>
          )}
          {p.shiny && (
            <Badge ml={6} size="xs" color="gold.1" variant="filled" c="#1a1626" radius={0}>
              Shiny
            </Badge>
          )}
        </Text>
        <Text fz={13} c="#b6b1bc">
          {ownedInfoLine(p)}
        </Text>
        <Text fz={13} c="dimmed">
          Egg group: {eggGroupsForDex(idx).join("/") || "Unknown"}
        </Text>
      </Box>
    </Box>
  );
}

/** One selectable pokemon tile in the green "You give" picker. */
function OwnPokemonCard(props: {
  pokemon: OwnedPokemon;
  selected: boolean;
  lock: ThreadLockEntry | null;
  onPick: () => void;
}) {
  const { pokemon: p, selected, lock } = props;
  const navigate = useNavigate();
  const cardInner = (
    <Box
      className={lock ? undefined : "dc-card-tile"}
      style={{
        background: selected ? "rgba(62,207,142,.08)" : "#141318",
        border: `1px solid ${selected ? "#3ecf8e" : "#2a2637"}`,
        padding: "14px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        opacity: lock ? 0.4 : 1,
        filter: lock ? "grayscale(1)" : undefined,
      }}
      {...clickable(() =>
        lock ? navigate(`/Forum/${lock.forum}/thread/${lock.threadId}`) : props.onPick()
      )}
      aria-label={
        lock
          ? `${p.name || p.species} is battling on ${lock.title || "a thread"}; open that thread`
          : `Pick ${p.name || p.species}`
      }
    >
      <Avatar src={getPokemonImageURL(p.image_slug, p.shiny)} size={44} radius="xl" />
      <Text fz={12} fw={700} c="white" lineClamp={1} ta="center">
        {p.name || p.species}{" "}
        <Text span c={GENDER_COLOR(p.gender)} fw={700}>
          {p.gender ?? ""}
        </Text>
      </Text>
    </Box>
  );
  if (!lock) {
    // Hover shows the full stat line so twins of the same species are
    // tellable apart before picking one.
    return (
      <Tooltip label={ownedInfoLine(p)} withArrow openDelay={200}>
        {cardInner}
      </Tooltip>
    );
  }
  return (
    <Tooltip
      label={`Battling on "${lock.title || "an open thread"}". That thread must close before this pokemon can be traded. Click to open the thread.`}
      multiline
      w={240}
    >
      {cardInner}
    </Tooltip>
  );
}

/* ----------------------------- Create a listing ---------------------------- */

function CreateListing(props: {
  owned: OwnedPokemon[];
  teams: Array<{ id: string; pokemon_ids?: string[] }> | undefined;
  locks: Record<string, ThreadLockEntry> | undefined;
  onCreated: () => void;
}) {
  const [pokemonId, setPokemonId] = React.useState<string | null>(null);
  const [wants, setWants] = React.useState<TradeWants>(EMPTY_WANTS);
  const [message, setMessage] = React.useState("");

  const create = useMutation({
    mutationFn: () => callCreateTradeListing(pokemonId!, wants),
    onSuccess: () => {
      setMessage("Your listing is up on the board!");
      setPokemonId(null);
      setWants(EMPTY_WANTS);
      props.onCreated();
    },
    onError: (e) => setMessage((e as Error).message || "Could not create the listing."),
  });

  const speciesOptions = React.useMemo(
    () => pokemonData.map((p) => ({ value: p.slug, label: p.name })),
    []
  );
  const picked = pokemonId ? props.owned.find((p) => p.id === pokemonId) : undefined;

  return (
    <Stack gap={18}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={18}>
        {/* YOU GIVE (green) */}
        <Box
          p={24}
          style={{
            background: "#14251c",
            border: "1px solid #1f7a4d",
            clipPath: CLIP_PANEL_16,
            minWidth: 0,
          }}
        >
          <Stack gap={12}>
            <PanelKicker color="#3ecf8e">You give</PanelKicker>
            <PanelTitle>Pick the Pokemon to trade away</PanelTitle>
            <SimpleGrid cols={{ base: 3, xs: 4, sm: 6 }} spacing={10}>
              {props.owned.map((p) => (
                <OwnPokemonCard
                  key={p.id}
                  pokemon={p}
                  selected={pokemonId === p.id}
                  lock={lockFor(p.id, props.teams, props.locks)}
                  onPick={() => setPokemonId(pokemonId === p.id ? null : p.id)}
                />
              ))}
            </SimpleGrid>
            {picked && <OwnedDetailCard pokemon={picked} heading="You are trading away" />}
          </Stack>
        </Box>

        {/* YOU'RE LOOKING FOR (purple) */}
        <Box
          p={24}
          style={{
            background: "#1c1526",
            border: "1px solid #7E2C75",
            clipPath: CLIP_PANEL_16,
            minWidth: 0,
          }}
        >
          <Stack gap={12}>
            <PanelKicker color="#c79bd6">You&apos;re looking for</PanelKicker>
            <PanelTitle>Describe what you&apos;d accept</PanelTitle>

            <MultiSelect
              label="Types you would accept"
              placeholder={wants.types.length ? undefined : "Any type"}
              searchable
              data={ALL_TYPES.map((t) => ({ value: t, label: t }))}
              value={wants.types}
              onChange={(types) => setWants((w) => ({ ...w, types }))}
              aria-label="Types you would accept"
              styles={INPUT_STYLES}
            />
            <MultiSelect
              label="Or specific species"
              placeholder={wants.species.length ? undefined : "Pick as many as you like"}
              searchable
              data={speciesOptions}
              value={wants.species}
              onChange={(species) => setWants((w) => ({ ...w, species }))}
              limit={20}
              aria-label="Specific species you would accept"
              styles={INPUT_STYLES}
            />

            <Text fz={13} fw={700} c="#c79bd6" tt="uppercase" style={{ letterSpacing: "0.14em" }}>
              Must-haves (leave empty for no requirement)
            </Text>
            <Group gap={10} align="end" wrap="wrap">
              <NumberInput
                label="Min level"
                description="0 = any"
                value={wants.minLevel}
                onChange={(v) =>
                  setWants((w) => ({
                    ...w,
                    minLevel: Math.max(0, Math.min(100, Math.trunc(Number(v) || 0))),
                  }))
                }
                min={0}
                max={100}
                size="xs"
                w={110}
                styles={INPUT_STYLES}
              />
              <Select
                label="Min star"
                data={[
                  { value: "0", label: "Any" },
                  ...[1, 2, 3, 4, 5, 6, 7].map((s) => ({ value: String(s), label: `${s}★ or higher` })),
                ]}
                value={String(wants.minStar)}
                onChange={(v) => setWants((w) => ({ ...w, minStar: Number(v) || 0 }))}
                allowDeselect={false}
                size="xs"
                w={130}
                styles={INPUT_STYLES}
              />
              <Select
                label="Nature"
                data={[
                  { value: "", label: "Any" },
                  ...Object.keys(NATURE_GROUPS).map((n) => ({ value: n, label: n })),
                ]}
                value={wants.nature}
                onChange={(v) => setWants((w) => ({ ...w, nature: v ?? "" }))}
                allowDeselect={false}
                searchable
                size="xs"
                w={130}
                styles={INPUT_STYLES}
              />
              <Select
                label="Gender"
                data={[
                  { value: "", label: "Any" },
                  { value: "M", label: "Male" },
                  { value: "F", label: "Female" },
                ]}
                value={wants.gender}
                onChange={(v) =>
                  setWants((w) => ({ ...w, gender: v === "M" || v === "F" ? v : "" }))
                }
                allowDeselect={false}
                size="xs"
                w={110}
                styles={INPUT_STYLES}
              />
              <Checkbox
                label="Shiny only"
                color="grape"
                checked={wants.shiny}
                onChange={(e) => setWants((w) => ({ ...w, shiny: e.currentTarget.checked }))}
                styles={{ label: { color: "white" } }}
              />
            </Group>

            <Textarea
              label="Trade note"
              placeholder="Anything else offers should know."
              value={wants.note}
              onChange={(e) => setWants((w) => ({ ...w, note: e.currentTarget.value }))}
              autosize
              minRows={2}
              maxLength={300}
              styles={INPUT_STYLES}
            />
          </Stack>
        </Box>
      </SimpleGrid>

      <ConfirmPopover
        message="List this pokemon for trade? Members can browse it and send offers."
        confirmLabel="List it"
        color="grape"
        position="top"
        loading={create.isPending}
        onConfirm={() => {
          setMessage("");
          create.mutate();
        }}
        target={(open) => (
          <Button
            fullWidth
            variant="gradient"
            gradient={{ from: "#7E2C75", to: "#E54156", deg: 90 }}
            disabled={!pokemonId}
            loading={create.isPending}
            h={54}
            style={{
              clipPath: CLIP_CTA,
              fontFamily: FONT_D,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.14em",
            }}
            onClick={open}
          >
            {pokemonId ? "PUT IT ON THE BOARD →" : "PICK A POKEMON TO OFFER FIRST"}
          </Button>
        )}
      />
      {message && (
        <Text
          fz={13}
          fw={700}
          c="#12B7B6"
          role="status"
          aria-live="polite"
          style={{ fontFamily: FONT_D, letterSpacing: "0.1em" }}
        >
          {message}
        </Text>
      )}
    </Stack>
  );
}

/* ------------------------------ Browse the board --------------------------- */

function ListingCard(props: {
  listing: TradeListing;
  myUid: string;
  owned: OwnedPokemon[];
  teams: Array<{ id: string; pokemon_ids?: string[] }> | undefined;
  locks: Record<string, ThreadLockEntry> | undefined;
  onChanged: () => void;
}) {
  const { listing: l, myUid } = props;
  const mine = l.ownerUid === myUid;
  const [offerFor, setOfferFor] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const act = useMutation({
    mutationFn: (job: () => Promise<unknown>) => job(),
    onSuccess: () => {
      setMessage("Done!");
      setPicking(false);
      setOfferFor(null);
      props.onChanged();
    },
    onError: (e) => setMessage((e as Error).message || "That did not go through."),
  });

  const openOffers = Object.entries(l.offers ?? {}).filter(([, o]) => o.status === "open");
  const offerOptions = props.owned
    .filter((p) => !lockFor(p.id, props.teams, props.locks))
    .map((p) => ({
      value: p.id,
      label: `${p.name || p.species} (${p.gender ?? "?"}) · ${ownedInfoLine(p)}`,
    }));

  const offerProblems = offerFor
    ? wantsMismatch(props.owned.find((o) => o.id === offerFor), l.wants)
    : [];

  return (
    <Box
      className="dc-card-tile"
      p={20}
      style={{
        background: "#141318",
        border: `1px solid ${mine ? "#1f7a4d" : "#2a2637"}`,
        clipPath: CLIP_PANEL_12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Tag + age */}
      <Group justify="space-between" gap={10} wrap="nowrap">
        <Text
          fz={11}
          fw={700}
          c={mine ? "#3ecf8e" : "#c79bd6"}
          tt="uppercase"
          style={{ fontFamily: FONT_D, letterSpacing: "0.18em" }}
          lineClamp={1}
        >
          {mine ? "Your listing" : `From ${l.ownerName || "someone"}`}
        </Text>
        <Text fz={12} c="#6f6a78" style={{ flex: "none" }}>
          {timeAgo(l.createdAt?.seconds)}
        </Text>
      </Group>

      {/* What they give */}
      <Group gap={14} align="center" wrap="nowrap">
        <PokemonHoverCard species={{ slug: l.pokemon.slug, name: l.pokemon.species }}>
          <Avatar
            src={getPokemonImageURL(l.pokemon.slug, l.pokemon.shiny)}
            size={48}
            radius="xl"
            style={{ flex: "none" }}
          />
        </PokemonHoverCard>
        <Box style={{ minWidth: 0 }}>
          <Text fz={15} fw={700} c="white" lineClamp={1}>
            {l.pokemon.species}{" "}
            <Text span c={GENDER_COLOR(l.pokemon.gender)} fw={700}>
              {l.pokemon.gender}
            </Text>
            {l.pokemon.shiny && (
              <Badge ml={6} size="xs" color="gold.1" variant="filled" c="#1a1626" radius={0}>
                Shiny
              </Badge>
            )}
          </Text>
          <SnapshotChips p={l.pokemon} ta="left" />
        </Box>
      </Group>

      {/* Wants */}
      <Group
        align="flex-start"
        gap={10}
        wrap="nowrap"
        style={{ borderTop: "1px solid #232028", paddingTop: 10 }}
      >
        <Text
          fz={11}
          fw={700}
          c="#c79bd6"
          tt="uppercase"
          style={{ fontFamily: FONT_D, letterSpacing: "0.14em", flex: "none", marginTop: 2 }}
        >
          Wants
        </Text>
        <Box style={{ minWidth: 0 }}>
          <WantsSummary wants={l.wants} align="left" />
        </Box>
      </Group>

      {mine ? (
        <Stack gap={8}>
          {openOffers.length ? (
            openOffers.map(([offerId, o]) => (
              <Group key={offerId} justify="space-between" wrap="wrap" gap={8}>
                <Group gap={8} style={{ minWidth: 0 }}>
                  <PokemonHoverCard species={{ slug: o.pokemon.slug, name: o.pokemon.species }}>
                    <Avatar
                      src={getPokemonImageURL(o.pokemon.slug, o.pokemon.shiny)}
                      size={34}
                      radius="xl"
                    />
                  </PokemonHoverCard>
                  <Box style={{ minWidth: 0 }}>
                    <Text fz={14} c="white" lineClamp={1}>
                      {o.fromName} offers {o.pokemon.species} ({o.pokemon.gender})
                    </Text>
                    <SnapshotChips p={o.pokemon} ta="left" />
                  </Box>
                </Group>
                <Group gap={6}>
                  <ConfirmPopover
                    message={`Trade your ${l.pokemon.species} for ${o.fromName}'s ${o.pokemon.species}? This cannot be undone.`}
                    confirmLabel="Trade"
                    color="teal"
                    loading={act.isPending}
                    onConfirm={() => {
                      setMessage("");
                      act.mutate(() => callRespondTradeOffer(l.id, offerId, "accept"));
                    }}
                    target={(open) => (
                      <Button
                        size="compact-sm"
                        radius={0}
                        color="teal"
                        loading={act.isPending}
                        onClick={open}
                      >
                        Accept
                      </Button>
                    )}
                  />
                  <ConfirmPopover
                    message={`Decline ${o.fromName}'s offer?`}
                    confirmLabel="Decline"
                    loading={act.isPending}
                    onConfirm={() =>
                      act.mutate(() => callRespondTradeOffer(l.id, offerId, "decline"))
                    }
                    target={(open) => (
                      <Button
                        size="compact-sm"
                        radius={0}
                        variant="subtle"
                        color="pink"
                        onClick={open}
                      >
                        Decline
                      </Button>
                    )}
                  />
                </Group>
              </Group>
            ))
          ) : (
            <Text fz={13} c="dimmed">
              No offers yet. Your listing is visible to everyone.
            </Text>
          )}
          <ConfirmPopover
            message="Pull this listing? It stops being visible and any open offers are dropped."
            confirmLabel="Pull listing"
            position="top-start"
            loading={act.isPending}
            onConfirm={() => act.mutate(() => callCancelTradeListing(l.id))}
            target={(open) => (
              <UnstyledButton
                onClick={open}
                style={{
                  alignSelf: "flex-start",
                  background: "none",
                  border: "1px solid #3a3550",
                  color: "#b6b1bc",
                  fontFamily: FONT_D,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "9px 18px",
                  cursor: "pointer",
                  clipPath: CLIP_PULL,
                }}
              >
                Pull listing
              </UnstyledButton>
            )}
          />
        </Stack>
      ) : picking ? (
        <Stack gap={8}>
          {offerFor && props.owned.find((o) => o.id === offerFor) && (
            <OwnedDetailCard
              pokemon={props.owned.find((o) => o.id === offerFor)!}
              heading="You are offering"
            />
          )}
          <Group gap={8} align="flex-end" wrap="wrap">
            <Select
              label="Your offer"
              placeholder="Pick a pokemon"
              searchable
              data={offerOptions}
              value={offerFor}
              onChange={setOfferFor}
              size="xs"
              w={260}
              error={
                offerProblems.length
                  ? `Heads up: ${offerProblems.join(", ")}. You can still send it.`
                  : undefined
              }
              styles={INPUT_STYLES}
            />
            <ConfirmPopover
              message="Send this offer to the listing owner? Your pokemon is held on the offer until they respond or you cancel."
              confirmLabel="Send offer"
              color="grape"
              loading={act.isPending}
              onConfirm={() => {
                setMessage("");
                act.mutate(() => callMakeTradeOffer(l.id, offerFor!));
              }}
              target={(open) => (
                <Button
                  size="compact-md"
                  radius={0}
                  variant="gradient"
                  gradient={{ from: "#7E2C75", to: "#E54156", deg: 90 }}
                  disabled={!offerFor}
                  loading={act.isPending}
                  onClick={open}
                >
                  Send
                </Button>
              )}
            />
            <Button
              size="compact-md"
              radius={0}
              variant="subtle"
              color="gray"
              onClick={() => setPicking(false)}
            >
              Cancel
            </Button>
          </Group>
        </Stack>
      ) : (
        <Group justify="space-between" align="center" gap={10} wrap="nowrap">
          <UnstyledButton
            onClick={() => setPicking(true)}
            style={{
              alignSelf: "flex-start",
              background: GRAD_PR,
              color: "#fff",
              fontFamily: FONT_D,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "11px 22px",
              cursor: "pointer",
              clipPath: CLIP_CTA_XS,
            }}
          >
            Make an offer →
          </UnstyledButton>
          <Text fz={13} c="dimmed" style={{ flex: "none" }}>
            {openOffers.length
              ? `${openOffers.length} offer${openOffers.length === 1 ? "" : "s"}`
              : "0 offers"}
          </Text>
        </Group>
      )}
      {message && (
        <Text fz={13} c="gold.1" role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </Box>
  );
}

/* --------------------------- Between your characters ------------------------ */

function SelfTradeSection(props: { owned: OwnedPokemon[]; onChanged: () => void }) {
  const { user } = useAuth();
  const [pokemonId, setPokemonId] = React.useState<string | null>(null);
  const [characterId, setCharacterId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState("");
  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user,
  });
  const move = useMutation({
    mutationFn: () => assignPokemonCharacter(pokemonId!, characterId!),
    onSuccess: () => {
      setMessage("Moved! Ownership follows the new character.");
      setPokemonId(null);
      props.onChanged();
    },
    onError: (e) => setMessage((e as Error).message || "Could not move that pokemon."),
  });
  return (
    <Box
      mt={24}
      p={24}
      style={{
        background: "#14252a",
        border: "1px solid #1f6f7a",
        clipPath: CLIP_SELF,
      }}
    >
      <Stack gap={12}>
        <PanelKicker color="#12B7B6">Between your characters</PanelKicker>
        <PanelTitle>Trade freely with yourself</PanelTitle>
        <Text fz={14} c="#b6b1bc" lh={1.6}>
          Teams and pokemon belong to characters, not accounts, so you can hand a pokemon to
          another of your characters any time. No listing needed.
        </Text>
        <Group gap={14} align="flex-end" wrap="wrap">
          <Select
            label="Pokemon"
            placeholder="Pick one of yours"
            searchable
            data={props.owned.map((p) => ({
              value: p.id,
              label: `${p.name || p.species} (${p.gender ?? "?"})`,
            }))}
            value={pokemonId}
            onChange={setPokemonId}
            w={230}
            styles={INPUT_STYLES}
          />
          <Select
            label="Goes to"
            placeholder="Pick a character"
            data={(characters?.sortedData ?? []).map((c) => ({ value: c.id, label: c.name }))}
            value={characterId}
            onChange={setCharacterId}
            w={200}
            styles={INPUT_STYLES}
          />
          <ConfirmPopover
            message="Move this pokemon to the selected character?"
            confirmLabel="Move it"
            color="teal"
            position="top"
            loading={move.isPending}
            onConfirm={() => {
              setMessage("");
              move.mutate();
            }}
            target={(open) => (
              <Button
                variant="gradient"
                gradient={{ from: "#14e0de", to: "#12B7B6", deg: 90 }}
                radius={0}
                h={42}
                disabled={!pokemonId || !characterId}
                loading={move.isPending}
                style={{
                  clipPath: CLIP_CTA_S,
                  color: "#0e0d11",
                  fontFamily: FONT_D,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                }}
                onClick={open}
              >
                MOVE IT OVER →
              </Button>
            )}
          />
        </Group>
        {message && (
          <Text
            fz={13}
            fw={700}
            c="#12B7B6"
            role="status"
            aria-live="polite"
            style={{ fontFamily: FONT_D, letterSpacing: "0.1em" }}
          >
            {message}
          </Text>
        )}
      </Stack>
    </Box>
  );
}

/* ----------------------------------- Page ---------------------------------- */

export default function Trading() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOverXs } = useMediaQuery();
  const [tab, setTab] = React.useState<"create" | "browse">("browse");
  const [filter, setFilter] = React.useState("all");

  const { data: owned, isPending } = useQuery({
    queryKey: ["owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });
  const { data: teamsRaw } = useQuery({
    queryKey: ["teams-raw", user?.uid],
    queryFn: () => getTeamsRaw(user!.uid),
    enabled: !!user,
  });
  const { data: locks } = useQuery({
    queryKey: ["thread-locks", user?.uid],
    queryFn: () => getThreadLocks(user!.uid),
    enabled: !!user,
  });
  const { data: listings } = useQuery({
    queryKey: ["trade-listings"],
    queryFn: getTradeListings,
    enabled: !!user,
  });

  if (!user) return null;
  const box = owned?.sortedData ?? [];
  const open = listings ?? [];
  const mineCount = open.filter((l) => l.ownerUid === user.uid).length;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["trade-listings"] });
    queryClient.invalidateQueries({ queryKey: ["owned-pokemons", user.uid] });
  };

  // Board filters: the static views plus one chip per type seen in wants.
  const wantTypes = [...new Set(open.flatMap((l) => l.wants.types))].slice(0, 4);
  const filtered = open.filter((l) => {
    if (filter === "shiny") return !!l.pokemon.shiny;
    // "Wants what I have": a listing where at least one pokemon you own passes
    // the full wants criteria (species/type/shiny/level/star), same check the
    // offer picker warns with. Falls back to loose matching when the listing
    // asks for nothing specific.
    if (filter === "match")
      return box.some((p) => l.ownerUid !== user.uid && wantsMismatch(p, l.wants).length === 0);
    if (filter.startsWith("type:")) return l.wants.types.includes(filter.slice(5));
    return true;
  });

  const boardFilters = [
    { key: "all", label: "All" },
    { key: "shiny", label: "Shiny offers" },
    { key: "match", label: "Wants what I have" },
    ...wantTypes.map((t) => ({ key: `type:${t}`, label: t })),
  ];

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Seo noindex title="The Trading Post | Snagem Guild" />
      <PageHero
        eyebrow={`${open.length} open listings · ${mineCount} of yours`}
        title="The Trading Post"
        subtitle="Put a Pokemon up with what you want in return, or scan the board and make an offer on someone else's listing."
        mb={22}
      />

      {/* Page tabs */}
      <Group gap={isOverXs ? 0 : 6} mb={22} wrap="wrap">
        <SegButton
          active={tab === "create"}
          onClick={() => setTab("create")}
          first
          fullWidth={!isOverXs}
          leftSection={
            <IconArrowsExchange size={16} color={tab === "create" ? "#fff" : "#b6b1bc"} />
          }
        >
          Create a listing
        </SegButton>
        <SegButton
          active={tab === "browse"}
          onClick={() => setTab("browse")}
          fullWidth={!isOverXs}
          leftSection={<IconChartBar size={16} color={tab === "browse" ? "#fff" : "#b6b1bc"} />}
        >
          Browse the board
        </SegButton>
      </Group>

      {isPending ? (
        <SectionLoader />
      ) : tab === "create" ? (
        <CreateListing
          owned={box}
          teams={teamsRaw}
          locks={locks}
          onCreated={() => {
            refresh();
            setTab("browse");
          }}
        />
      ) : (
        <Stack gap={16}>
          <Group gap={8} wrap="wrap">
            {boardFilters.map((f) => (
              <SegButton
                key={f.key}
                active={filter === f.key}
                onClick={() => setFilter(f.key)}
                small
                first
                clip={CLIP_CHIP}
              >
                {f.label}
              </SegButton>
            ))}
          </Group>
          {!filtered.length ? (
            <Box
              p={44}
              style={{
                background: "#141318",
                border: "1px solid #2a2637",
                clipPath: CLIP_PANEL_16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                textAlign: "center",
              }}
            >
              <IconArrowsExchange size={36} color="#8a8399" style={{ opacity: 0.5 }} />
              <Text fz={18} fw={700} c="white" style={{ fontFamily: FONT_D, letterSpacing: "0.03em" }}>
                NOTHING HERE YET
              </Text>
              <Text fz={14} c="#b6b1bc">
                {filter === "all"
                  ? "Create a listing and get the first trade going."
                  : "Nothing on the board for that filter yet."}
              </Text>
            </Box>
          ) : (
            <Box
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))",
                gap: 14,
              }}
            >
              {filtered.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  myUid={user.uid}
                  owned={box}
                  teams={teamsRaw}
                  locks={locks}
                  onChanged={refresh}
                />
              ))}
            </Box>
          )}
        </Stack>
      )}

      <SelfTradeSection owned={box} onChanged={refresh} />
    </Container>
  );
}
