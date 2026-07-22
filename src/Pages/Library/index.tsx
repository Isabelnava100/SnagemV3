import {
  Box,
  Button,
  Container,
  Flex,
  Group,
  Image,
  Modal,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import { SnagIcon, SnagIconName } from "../../icons/SnagIcon";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useAuth } from "../../context/AuthContext";
import { itemData } from "../../data/item";
import { pokemonData } from "../../data/pokemon";
import { getItemImageURL, getPokemonImageURL, POKEMON_SPRITE_FALLBACK } from "../../helpers";
import { actorFrom, logAuditEvent } from "../../lib/auditLog";
import { postsToBeatStar, starForDex } from "../../lib/encounterStars";
import { ALL_TYPES, typesForDex } from "../../lib/typeChart";
import { GEN_NAMES, generationOf } from "../../lib/generations";
import { eggGroupsForDex } from "../../lib/eggGroups";
import { isAdmin } from "../../lib/permissions";
import { resolveListSlugs } from "../forum/queries";
import { getPokemonLists, getStarOverrides, setStarOverride } from "../../queries/admin";
import { getOwnedPokemons } from "../../queries/dashboard";
import Seo from "../../components/common/Seo";
import { textFromNode, truncate } from "../../lib/seo/text";
import FaqTab, { FAQ } from "./faq";
import ShadowGuideTab from "./shadow";
import LoreTab from "./lore";
import MovesTab from "./moves";
import BattleGuideTab from "./battle";
import ForumGuideTab from "./forums";

/**
 * Public data library. Any visitor (signed in or not) can browse the system's
 * reference data: the full Pokedex, the item catalog, and the public encounter
 * lists hosts build threads around. Read-only, so it never touches the admin
 * tools. Big lists are searched and capped to keep the page light.
 *
 * Redesign (July 2026): cinematic game-site language. Flat angular panels
 * (#17151c on #2a2637, no radius), inner wells (#141318 / #0e0d11), a mono
 * call-number system, gold star tags and the Quantico display face. The
 * directory is a sticky rail on desktop and a horizontal-scroll pill row on
 * mobile. Behavior (wing state, searches, filters, collection tracker, star
 * editor) is unchanged; only the presentation moved onto the new system.
 */

const PAGE_BG = "#0d0a14";
const PANEL = "#17151c";
const PANEL_BORDER = "#2a2637";
const WELL = "#141318";
const WELL_BORDER = "#232028";
const INK = "#0e0d11";
const GOLD = "#FFD074";
const CYAN = "#12B7B6";
const RED = "#E54156";
const PURPLE = "#772976";
const DIM = "#b6b1bc";
const ON_GOLD = "#1A1B1E";
const DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const MONO = "ui-monospace, Menlo, monospace";
const CLIP_CTA = "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)";

const panelStyle: React.CSSProperties = { background: PANEL, border: `1px solid ${PANEL_BORDER}` };
const inputStyles = {
  input: { background: INK, border: `1px solid ${PANEL_BORDER}`, color: "#fff" },
} as const;

/** Lift + gold top-border on the Reading Room wing cards (hover / keyboard focus). */
function cardLift(el: HTMLElement, on: boolean) {
  el.style.borderTopColor = on ? GOLD : "transparent";
  el.style.transform = on ? "translateY(-3px)" : "none";
}

const PAGE_SIZE = 60;

function ResultCount(props: { shown: number; total: number; noun: string }) {
  return (
    <Text fz={14} c={DIM}>
      {props.total <= props.shown
        ? `${props.total} ${props.noun}`
        : `Showing ${props.shown} of ${props.total} ${props.noun}`}
    </Text>
  );
}

/** Reveal a long list in pages, resetting to the first page whenever `deps`
 * change (a new search or filter). Load More grows the window until all show. */
function usePagedList<T>(items: T[], deps: React.DependencyList) {
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  React.useEffect(() => {
    setLimit(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return {
    shown: items.slice(0, limit),
    hasMore: items.length > limit,
    loadMore: () => setLimit((n) => n + PAGE_SIZE),
  };
}

/** Angular outline "LOAD MORE" button (redesign CTA). */
function LoadMore(props: { hasMore: boolean; onClick: () => void }) {
  if (!props.hasMore) return null;
  return (
    <Box style={{ textAlign: "center", marginTop: 8 }}>
      <UnstyledButton
        onClick={props.onClick}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.12)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "2px solid rgba(255,255,255,.5)",
          color: "#fff",
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "14px 34px",
          cursor: "pointer",
          clipPath: CLIP_CTA,
        }}
      >
        Load more
      </UnstyledButton>
    </Box>
  );
}

type PokedexEntry = (typeof pokemonData)[number];

/**
 * Admin editor for one species' star rating. The star sets how many posts an
 * encounter of this species takes to beat in the forum game; overrides are
 * stored in admin/star_overrides and picked up by the server on the next roll.
 */
function StarEditorModal(props: {
  entry: PokedexEntry | null;
  overrides: Record<string, number>;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [value, setValue] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const entry = props.entry;
  const key = entry ? String(Number(entry.idx)) : "";
  const defaultStar = entry ? starForDex(entry.idx) : 3;
  const currentStar = entry ? props.overrides[key] ?? defaultStar : 3;

  React.useEffect(() => {
    setValue(null);
    setError("");
  }, [entry?.idx]);

  const mutation = useMutation({
    mutationFn: async (star: number | null) => {
      if (!entry || !user) return;
      await setStarOverride(entry.idx, star);
      await logAuditEvent({
        action: "stars.edit",
        ...actorFrom(user),
        targetPath: "admin/star_overrides",
        details: {
          species: entry.name,
          dex: key,
          star: star ?? `default (${defaultStar})`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["star-overrides"] });
      props.onClose();
    },
    onError: (e) => setError((e as Error).message || "Could not save the star. Try again."),
  });

  const picked = value !== null ? Number(value) : currentStar;

  return (
    <Modal
      opened={!!entry}
      onClose={props.onClose}
      title={<Text fw={700}>Star rating: {entry?.name}</Text>}
      centered
      radius={0}
    >
      {entry && (
        <Stack gap={12}>
          <Group gap={12} wrap="nowrap">
            <Image
              src={getPokemonImageURL(entry.slug)}
              fallbackSrc={POKEMON_SPRITE_FALLBACK}
              alt={entry.name}
              w={56}
              h={56}
              fit="contain"
            />
            <Text fz={14} c={DIM}>
              The star sets how many posts it takes to beat this species in an
              encounter. Default: {defaultStar} star ({postsToBeatStar(defaultStar)}{" "}
              posts), from its base stats.
            </Text>
          </Group>
          <Select
            label="Star rating"
            value={String(picked)}
            onChange={setValue}
            data={[1, 2, 3, 4, 5, 6, 7].map((s) => ({
              value: String(s),
              label: `${"★".repeat(s)} ${s} star (${postsToBeatStar(s)} posts to beat)${
                s === defaultStar ? " · default" : ""
              }`,
            }))}
            allowDeselect={false}
            radius={0}
            styles={{ input: inputStyles.input, label: { color: "white" } }}
          />
          {error && (
            <Text fz={14} c="red.4" role="status" aria-live="polite">
              {error}
            </Text>
          )}
          <Group justify="space-between">
            <Button
              variant="subtle"
              color="gray"
              radius="xl"
              disabled={!(key in props.overrides)}
              loading={mutation.isPending && mutation.variables === null}
              onClick={() => mutation.mutate(null)}
            >
              Reset to default
            </Button>
            <Button
              color="grape"
              radius="xl"
              loading={mutation.isPending && mutation.variables !== null}
              onClick={() => mutation.mutate(picked === defaultStar ? null : picked)}
            >
              Save
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}

function PokedexTab() {
  const { isOverSm } = useMediaQuery();
  const { user } = useAuth();
  const admin = isAdmin(user);
  const [search, setSearch] = React.useState("");
  const [shiny, setShiny] = React.useState(false);
  const [gens, setGens] = React.useState<string[]>([]);
  const [types, setTypes] = React.useState<string[]>([]);
  const [editing, setEditing] = React.useState<PokedexEntry | null>(null);
  const q = search.trim().toLowerCase();
  const matches = React.useMemo(() => {
    const genSet = new Set(gens);
    const typeSet = new Set(types);
    return pokemonData.filter((p) => {
      if (q && !(p.name.toLowerCase().includes(q) || p.idx.includes(q))) return false;
      if (genSet.size && !genSet.has(generationOf(p.idx))) return false;
      if (typeSet.size && !typesForDex(p.idx).some((t) => typeSet.has(t))) return false;
      return true;
    });
  }, [q, gens, types]);
  // Collection tracker: which species the member owns (any form counts its
  // dex number). Signed-in only; visitors just browse the dex.
  const { data: ownedPokemons } = useQuery({
    queryKey: ["get-owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });
  const ownedDex = React.useMemo(() => {
    const set = new Set<number>();
    (ownedPokemons?.sortedData ?? []).forEach((p) => {
      const n = Number(p.pokedex);
      if (n > 0) set.add(n);
    });
    return set;
  }, [ownedPokemons]);
  const [caughtOnly, setCaughtOnly] = React.useState(false);
  const visibleMatches = caughtOnly
    ? matches.filter((p) => ownedDex.has(Number(p.idx)))
    : matches;

  const { shown, hasMore, loadMore } = usePagedList(visibleMatches, [
    q,
    caughtOnly,
    gens.join(","),
    types.join(","),
  ]);

  // Star overrides need a signed-in read (rules); visitors see the defaults.
  const { data: overrides } = useQuery({
    queryKey: ["star-overrides"],
    queryFn: getStarOverrides,
    enabled: !!user,
  });
  const starOf = (p: PokedexEntry) => overrides?.[String(Number(p.idx))] ?? starForDex(p.idx);

  return (
    <Box style={{ ...panelStyle, padding: isOverSm ? "34px 36px" : "20px 16px" }}>
      <Stack gap={16}>
        <Group gap={12} align="center" wrap="wrap">
          <TextInput
            placeholder="Search by name or Pokedex number"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            radius={0}
            aria-label="Search the Pokedex"
            styles={{ input: inputStyles.input, root: { flex: "1 1 240px", maxWidth: 340 } }}
          />
          <MultiSelect
            placeholder={gens.length ? undefined : "Generation"}
            data={GEN_NAMES.map((g) => ({ value: g, label: `Gen ${g}` }))}
            value={gens}
            onChange={setGens}
            clearable
            radius={0}
            aria-label="Filter by generation"
            styles={{ input: inputStyles.input, root: { flex: "1 1 160px", maxWidth: 220 } }}
          />
          <MultiSelect
            placeholder={types.length ? undefined : "Type"}
            data={ALL_TYPES.map((t) => ({ value: t, label: t }))}
            value={types}
            onChange={setTypes}
            searchable
            clearable
            radius={0}
            aria-label="Filter by type"
            styles={{ input: inputStyles.input, root: { flex: "1 1 160px", maxWidth: 240 } }}
          />
          <Switch
            checked={shiny}
            onChange={(e) => setShiny(e.currentTarget.checked)}
            label="View shiny"
            color="grape"
            aria-label="View shiny sprites"
          />
          {user && (
            <Switch
              checked={caughtOnly}
              onChange={(e) => setCaughtOnly(e.currentTarget.checked)}
              label="Caught only"
              color="teal"
              aria-label="Show only species you own"
            />
          )}
        </Group>
        {user && (
          <Text fz={15} fw={700} c="#7CD992">
            Collection: {ownedDex.size} of {pokemonData.length} species caught (
            {Math.floor((ownedDex.size / Math.max(1, pokemonData.length)) * 100)}%). Uncaught
            species show as silhouettes.
          </Text>
        )}
        <ResultCount shown={shown.length} total={visibleMatches.length} noun="Pokemon" />
        {admin && (
          <Text fz={14} c={DIM}>
            Admin: select any Pokemon to change its star rating (posts to beat in
            encounters).
          </Text>
        )}
        <SimpleGrid cols={{ base: 3, xs: 4, sm: 6 }} spacing={isOverSm ? 14 : 10}>
          {shown.map((p) => {
            const star = starOf(p);
            const overridden = !!overrides && String(Number(p.idx)) in overrides;
            const caught = !user || ownedDex.has(Number(p.idx));
            const body = (
              <Stack gap={4} align="center">
                <Image
                  src={getPokemonImageURL(p.slug, shiny)}
                  fallbackSrc={POKEMON_SPRITE_FALLBACK}
                  alt={caught ? (shiny ? `Shiny ${p.name}` : p.name) : `${p.name} (not caught yet)`}
                  w={56}
                  h={56}
                  fit="contain"
                  loading="lazy"
                  style={{
                    imageRendering: "pixelated",
                    ...(caught ? {} : { filter: "brightness(0.25) grayscale(1)" }),
                  }}
                />
                <Text fz={13} c={DIM} ff={MONO}>
                  #{p.idx}
                </Text>
                <Text fz={14} c="#fff" fw={700} ta="center" lineClamp={1}>
                  {p.name}
                </Text>
                <Text fz={14} c={GOLD} fw={700} style={{ letterSpacing: "0.1em" }} ta="center">
                  {"★".repeat(star)}
                  {overridden ? <Text component="span" fz={11} c={DIM}> (set)</Text> : null}
                </Text>
                <Text fz={12} c={DIM} ta="center" lineClamp={1}>
                  {typesForDex(p.idx).join("/")}
                </Text>
                <Text fz={12} c={DIM} ta="center" lineClamp={1}>
                  Egg: {eggGroupsForDex(p.idx).join("/")}
                </Text>
              </Stack>
            );
            return admin ? (
              <UnstyledButton
                key={p.idx}
                onClick={() => setEditing(p)}
                aria-label={`Edit star rating for ${p.name}, currently ${star} star`}
                className="dc-card-tile"
                style={{ display: "block", padding: "16px 10px" }}
              >
                {body}
              </UnstyledButton>
            ) : (
              <Box key={p.idx} className="dc-card-tile" style={{ padding: "16px 10px" }}>
                {body}
              </Box>
            );
          })}
        </SimpleGrid>
        {!shown.length && (
          <Text fz={14} c={DIM} ta="center" py={20}>
            No Pokemon match that search.
          </Text>
        )}
        <LoadMore hasMore={hasMore} onClick={loadMore} />
      </Stack>
      {admin && (
        <StarEditorModal
          entry={editing}
          overrides={overrides ?? {}}
          onClose={() => setEditing(null)}
        />
      )}
    </Box>
  );
}

/** Distinct item categories, formatted for the chip row (title-cased labels). */
const ITEM_CATEGORIES = Array.from(new Set(itemData.map((i) => i.category)))
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b))
  .map((c) => ({
    value: c,
    label: c.replace(/(^|\s)\S/g, (ch) => ch.toUpperCase()),
  }));

/** One filter chip in the Artifact Vault category row. */
function VaultChip(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <UnstyledButton
      onClick={props.onClick}
      aria-pressed={props.active}
      style={{
        flex: "none",
        background: props.active ? PURPLE : WELL,
        border: `1px solid ${props.active ? PURPLE : PANEL_BORDER}`,
        color: props.active ? "#fff" : DIM,
        fontFamily: DISPLAY,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "9px 18px",
        cursor: "pointer",
      }}
    >
      {props.label}
    </UnstyledButton>
  );
}

function ItemsTab() {
  const { isOverSm } = useMediaQuery();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string | null>(null);
  const q = search.trim().toLowerCase();
  const matches = React.useMemo(() => {
    return itemData.filter((i) => {
      if (category && i.category !== category) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
    });
  }, [q, category]);
  const { shown, hasMore, loadMore } = usePagedList(matches, [q, category]);

  return (
    <Box style={{ ...panelStyle, padding: isOverSm ? "34px 36px" : "20px 16px" }}>
      <Stack gap={16}>
        <Group justify="space-between" align="center" gap={16} wrap="wrap">
          <Text ff={MONO} fz={14} c={CYAN} style={{ letterSpacing: "0.06em" }}>
            {itemData.length.toLocaleString()} ITEMS
          </Text>
          <TextInput
            placeholder="Search items"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            radius={0}
            aria-label="Search the Artifact Vault"
            styles={{ input: inputStyles.input, root: { flex: "1 1 220px", maxWidth: 300 } }}
          />
        </Group>
        <Group gap={8} wrap="wrap">
          <VaultChip label="All" active={!category} onClick={() => setCategory(null)} />
          {ITEM_CATEGORIES.map((c) => (
            <VaultChip
              key={c.value}
              label={c.label}
              active={category === c.value}
              onClick={() => setCategory(c.value)}
            />
          ))}
        </Group>
        <ResultCount shown={shown.length} total={matches.length} noun="items" />
        <SimpleGrid cols={{ base: 3, xs: 4, sm: 6 }} spacing={isOverSm ? 14 : 10}>
          {shown.map((item) => (
            <Box
              key={item.id}
              className="dc-card-tile"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 8,
                padding: "14px 8px",
                minHeight: 116,
              }}
            >
              <Image
                src={getItemImageURL(item.filePath)}
                alt={item.name}
                w={36}
                h={36}
                fit="contain"
                loading="lazy"
                style={{ opacity: 0.92 }}
              />
              <Text fz={13} c="#fff" fw={700} lineClamp={2} style={{ lineHeight: 1.25 }}>
                {item.name}
              </Text>
              <Text ff={MONO} fz={11} c={CYAN} tt="uppercase" style={{ letterSpacing: "0.06em" }} lineClamp={1}>
                {item.category}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
        {!shown.length && (
          <Text fz={14} c={DIM} ta="center" py={20}>
            No items match that search.
          </Text>
        )}
        <LoadMore hasMore={hasMore} onClick={loadMore} />
      </Stack>
    </Box>
  );
}

/** A sprite tile in a register / zone row (ink well, faded sprite). */
function MonCell(props: { slug: string; size?: number }) {
  const { isOverSm } = useMediaQuery();
  const box = props.size ?? (isOverSm ? 40 : 38);
  const sprite = box - 10;
  return (
    <Box
      style={{
        width: box,
        height: box,
        background: INK,
        border: `1px solid ${WELL_BORDER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Image
        src={getPokemonImageURL(props.slug)}
        fallbackSrc={POKEMON_SPRITE_FALLBACK}
        alt={props.slug}
        w={sprite}
        h={sprite}
        fit="contain"
        loading="lazy"
        style={{ opacity: 0.85, imageRendering: "pixelated" }}
      />
    </Box>
  );
}

/** Safari Contest zones (admin/safari_config), shown as read-only registers. */
function SafariZonesSection() {
  const { isOverSm } = useMediaQuery();
  const { user } = useAuth();
  const { data: zones } = useQuery({
    queryKey: ["safari-zones-public"],
    queryFn: async () => {
      const { getDoc, doc } = await import("firebase/firestore");
      const { db } = await import("../../context/firebase");
      const data = (await getDoc(doc(db, "admin", "safari_config"))).data() ?? {};
      const zoneMap = (data.zones ?? { default: data }) as Record<string, any>;
      return Object.entries(zoneMap)
        .map(([id, z]) => ({
          id,
          name: String(z?.name ?? id),
          tiers: (Array.isArray(z?.tiers) ? z.tiers : []) as Array<{
            star?: number;
            pokemons?: string[];
          }>,
        }))
        .filter((z) => z.tiers.some((t) => (t.pokemons ?? []).length));
    },
    enabled: !!user,
  });

  if (!zones?.length) return null;
  return (
    <Stack gap={12} mt={8}>
      <Title order={3} c="#fff" fz={isOverSm ? 20 : 17} fw={700} style={{ fontFamily: DISPLAY, letterSpacing: "0.04em" }} tt="uppercase">
        Safari Contest zones
      </Title>
      <Text fz={14} c={DIM} lh={1.6}>
        The star-tiered pools staff can launch as a Safari Contest. Higher stars are
        rarer rolls.
      </Text>
      {zones.map((zone) => (
        <Box key={zone.id} style={{ ...panelStyle, padding: isOverSm ? "26px 30px" : "18px 16px" }}>
          <Text fz={isOverSm ? 17 : 14} c="#fff" fw={700} mb={isOverSm ? 18 : 14} style={{ fontFamily: DISPLAY, letterSpacing: "0.03em" }} tt="uppercase">
            {zone.name}
          </Text>
          <Stack gap={isOverSm ? 14 : 12}>
            {zone.tiers.map((tier, i) => {
              const stars = "★".repeat(Math.max(1, Math.min(5, tier.star ?? i + 1)));
              return (
                <Box
                  key={i}
                  style={{
                    display: "flex",
                    flexDirection: isOverSm ? "row" : "column",
                    alignItems: isOverSm ? "center" : "flex-start",
                    gap: isOverSm ? 18 : 8,
                  }}
                >
                  <Box
                    style={{
                      flex: "none",
                      width: isOverSm ? 120 : "auto",
                      alignSelf: "flex-start",
                      background: GOLD,
                      color: ON_GOLD,
                      fontFamily: DISPLAY,
                      fontWeight: 700,
                      fontSize: isOverSm ? 14 : 12,
                      letterSpacing: "0.05em",
                      textAlign: "center",
                      padding: isOverSm ? "8px 0" : "5px 14px",
                    }}
                  >
                    {stars}
                  </Box>
                  <Box style={{ display: "flex", flexWrap: "wrap", gap: isOverSm ? 12 : 8, alignItems: "center" }}>
                    {(tier.pokemons ?? []).slice(0, 16).map((slug) => (
                      <MonCell key={slug} slug={slug} />
                    ))}
                    {(tier.pokemons ?? []).length > 16 && (
                      <Text fz={14} c={DIM}>
                        +{(tier.pokemons ?? []).length - 16} more
                      </Text>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

function ListsTab() {
  const { isOverSm } = useMediaQuery();
  const { data, isPending } = useQuery({
    queryKey: ["public-pokemon-lists"],
    queryFn: getPokemonLists,
  });
  // Only manually curated host lists show here; seeded mission-default pools
  // are attached by pickUpMission and stay out of the registers.
  const publicLists = (data?.formattedData ?? []).filter((l) => l.public && !l.missionDefault);

  if (isPending) {
    return (
      <Text fz={14} c={DIM} py={20}>
        Loading lists...
      </Text>
    );
  }

  if (!publicLists.length) {
    return (
      <Stack gap={8} py={20}>
        <Text fz={14} c={DIM}>
          There are no public encounter lists to show yet.
        </Text>
        <SafariZonesSection />
      </Stack>
    );
  }

  return (
    <Stack gap={16}>
      <Text fz={14} c={DIM} lh={1.6}>
        These are the shared encounter lists hosts can attach to a roleplay.
      </Text>
      {publicLists.map((list) => {
        const slugs = resolveListSlugs(list);
        const preview = slugs.slice(0, 24);
        return (
          <Box key={list.id} style={{ ...panelStyle, padding: isOverSm ? "26px 30px" : "18px 16px" }}>
            <Group justify="space-between" mb={12} wrap="nowrap" gap={12}>
              <Text fz={isOverSm ? 17 : 15} c="#fff" fw={700} lineClamp={1} style={{ fontFamily: DISPLAY, letterSpacing: "0.03em" }} tt="uppercase">
                {list.name || "Untitled list"}
              </Text>
              <Text ff={MONO} fz={13} c={CYAN} style={{ flexShrink: 0, letterSpacing: "0.06em" }}>
                {slugs.length} POKEMON
              </Text>
            </Group>
            <Box style={{ display: "flex", flexWrap: "wrap", gap: isOverSm ? 10 : 8 }}>
              {preview.map((slug) => (
                <MonCell key={slug} slug={slug} />
              ))}
              {slugs.length > preview.length && (
                <Text fz={14} c={DIM} style={{ alignSelf: "center" }}>
                  +{slugs.length - preview.length} more
                </Text>
              )}
            </Box>
          </Box>
        );
      })}
      <SafariZonesSection />
    </Stack>
  );
}

/**
 * The Library is organized as a set of "wings". A directory on the left opens
 * each wing; the Reading Room is the landing that introduces them all. The wing
 * `value`s double as the `?tab=` deep-link keys (kept stable from the old tabs).
 */
type Wing = {
  value: string;
  name: string;
  callNo: string;
  meta: string;
  blurb: string;
  accent: string;
  icon: SnagIconName;
  content: React.ReactNode;
};

const WINGS: Wing[] = [
  {
    value: "pokedex",
    name: "The Pokedex",
    callNo: "001.PKD",
    meta: `${pokemonData.length.toLocaleString()} species`,
    blurb: "Every catalogued species, searchable by name or number, with its encounter star rating.",
    accent: "#f472b6",
    icon: "pokeball",
    content: <PokedexTab />,
  },
  {
    value: "items",
    name: "The Artifact Vault",
    callNo: "002.AV",
    meta: `${itemData.length.toLocaleString()} items`,
    blurb: "The full item catalog: balls, medicine, berries, held items and rare relics.",
    accent: GOLD,
    icon: "bag",
    content: <ItemsTab />,
  },
  {
    value: "battle",
    name: "The War Room",
    callNo: "003.WR",
    meta: "Battle guide",
    blurb: "Stars, health, damage, run-away and type effectiveness: how posting fights work.",
    accent: RED,
    icon: "swords",
    content: <BattleGuideTab />,
  },
  {
    value: "shadow",
    name: "Growth & Shadow",
    callNo: "004.GS",
    meta: "Stats guide",
    blurb: "Experience, friendship, shadow and purification, and how to cure a shadowed pokemon.",
    accent: "#9775fa",
    icon: "ghost",
    content: <ShadowGuideTab />,
  },
  {
    value: "moves",
    name: "The Shadow Codex",
    callNo: "005.SC",
    meta: "Shadow Moves",
    blurb: "Shadow Moves by class, and the rules that govern them.",
    accent: "#b197fc",
    icon: "bolt",
    content: <MovesTab />,
  },
  {
    value: "lists",
    name: "Field Registers",
    callNo: "006.FR",
    meta: "Encounter lists",
    blurb: "Shared encounter lists and Safari zones hosts can attach to a roleplay.",
    accent: "#5eead4",
    icon: "map",
    content: <ListsTab />,
  },
  {
    value: "forums",
    name: "The Charter",
    callNo: "007.CH",
    meta: "Forum guide",
    blurb: "What each forum is for, who can create threads, and where gated things start.",
    accent: "#4049C9",
    icon: "shieldcheck",
    content: <ForumGuideTab />,
  },
  {
    value: "lore",
    name: "The Archives",
    callNo: "008.AR",
    meta: "Guild canon",
    blurb: "Bound volumes of the guild's canon and mythologies.",
    accent: "#e879f9",
    icon: "sparkle",
    content: <LoreTab />,
  },
  {
    value: "faq",
    name: "The Help Desk",
    callNo: "009.HD",
    meta: "Common Q&A",
    blurb: "Answers to the questions new members ask most.",
    accent: "#74c0fc",
    icon: "walkie",
    content: <FaqTab />,
  },
];

const READING_ROOM = "reading-room";
const READING_ROOM_CALL = "000.RR";

/** Directory entries (Reading Room first, then every wing). */
const DIRECTORY: { value: string; label: string; callNo: string }[] = [
  { value: READING_ROOM, label: "Reading Room", callNo: READING_ROOM_CALL },
  ...WINGS.map((w) => ({ value: w.value, label: w.name, callNo: w.callNo })),
];

/** The left directory: a sticky call-number rail on desktop, a horizontal
 * pill row on mobile. Both are real buttons, so they stay keyboard-operable. */
function Directory(props: {
  variant: "rail" | "pills";
  active: string;
  onOpen: (value: string) => void;
}) {
  if (props.variant === "pills") {
    return (
      <Box
        component="nav"
        aria-label="Library directory"
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 2,
          width: "100%",
          scrollbarWidth: "none",
        }}
      >
        {DIRECTORY.map((d) => {
          const active = props.active === d.value;
          return (
            <UnstyledButton
              key={d.value}
              onClick={() => props.onOpen(d.value)}
              aria-current={active ? "page" : undefined}
              style={{
                flex: "none",
                whiteSpace: "nowrap",
                border: `1px solid ${active ? RED : PANEL_BORDER}`,
                background: active
                  ? `linear-gradient(90deg, rgba(229,65,86,.25), ${PANEL})`
                  : PANEL,
                color: "#fff",
                fontFamily: DISPLAY,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "11px 16px",
                cursor: "pointer",
              }}
            >
              {d.label}
            </UnstyledButton>
          );
        })}
      </Box>
    );
  }

  return (
    <Box
      component="nav"
      aria-label="Library directory"
      style={{
        flex: "none",
        width: 300,
        position: "sticky",
        top: 24,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <Text
        fz={14}
        fw={700}
        c={GOLD}
        style={{ fontFamily: DISPLAY, letterSpacing: "0.26em", padding: "6px 4px 10px" }}
      >
        DIRECTORY
      </Text>
      {DIRECTORY.map((d) => {
        const active = props.active === d.value;
        return (
          <UnstyledButton
            key={d.value}
            onClick={() => props.onOpen(d.value)}
            aria-current={active ? "page" : undefined}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "#1c1a22";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = PANEL;
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textAlign: "left",
              border: `1px solid ${active ? RED : PANEL_BORDER}`,
              borderLeftWidth: active ? 3 : 1,
              background: active
                ? `linear-gradient(90deg, rgba(229,65,86,.18), ${PANEL})`
                : PANEL,
              color: "#fff",
              fontFamily: DISPLAY,
              fontSize: 14,
              fontWeight: 700,
              padding: "14px 16px",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: 13,
                color: CYAN,
                flex: "none",
                width: 56,
                textAlign: "left",
                letterSpacing: "0.02em",
              }}
            >
              {d.callNo}
            </span>
            <span style={{ lineHeight: 1.2 }}>{d.label}</span>
          </UnstyledButton>
        );
      })}
    </Box>
  );
}

/** The landing: a short heading plus one card per wing. */
function ReadingRoom(props: { onOpen: (value: string) => void }) {
  return (
    <Stack gap="lg">
      <Box>
        <Text
          component="h2"
          fz={{ base: 22, sm: 28 }}
          fw={700}
          c="#fff"
          tt="uppercase"
          style={{ fontFamily: DISPLAY, letterSpacing: "0.03em", lineHeight: 1.1 }}
        >
          The Reading Room
        </Text>
        <Text fz={{ base: 14, sm: 16 }} c={DIM} mt={8} maw={720} lh={1.55}>
          Every wing the guild keeps, one shelf at a time. Pick a wing from the directory, or open
          one below.
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
        {WINGS.map((w) => (
          <UnstyledButton
            key={w.value}
            onClick={() => props.onOpen(w.value)}
            aria-label={`Open ${w.name}`}
            onMouseEnter={(e) => cardLift(e.currentTarget, true)}
            onMouseLeave={(e) => cardLift(e.currentTarget, false)}
            onFocus={(e) => cardLift(e.currentTarget, true)}
            onBlur={(e) => cardLift(e.currentTarget, false)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              textAlign: "left",
              background: PANEL,
              border: `1px solid ${PANEL_BORDER}`,
              borderTop: "3px solid transparent",
              padding: 22,
              height: "100%",
              cursor: "pointer",
              transition: "border-color .2s ease, transform .15s ease",
            }}
          >
            <SnagIcon name={w.icon} size={30} color={w.accent} cut={PANEL} />
            <Text
              fz={{ base: 14, sm: 17 }}
              fw={700}
              c="#fff"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.03em", lineHeight: 1.15 }}
            >
              {w.name}
            </Text>
            <Text fz={{ base: 12, sm: 14 }} c={DIM} lh={1.55} style={{ flexGrow: 1 }}>
              {w.blurb}
            </Text>
            <Text ff={MONO} fz={{ base: 12, sm: 14 }} c={CYAN} style={{ letterSpacing: "0.04em" }}>
              {w.callNo}
            </Text>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export default function Library() {
  const { isOverMd, isOverSm } = useMediaQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const active = WINGS.some((w) => w.value === requested) ? (requested as string) : READING_ROOM;

  const open = (value: string) => setSearchParams({ tab: value }, { replace: true });
  const openWing = WINGS.find((w) => w.value === active);

  // Tab variants keep the base /Library canonical (query-param pages never
  // self-canonicalize) but get their own tab title, and the Help Desk wing
  // ships its Q&A as FAQPage structured data.
  const seoTitle = openWing ? `${openWing.name} | Snagem Library` : undefined;
  const seoDescription = openWing ? truncate(`${openWing.blurb} ${openWing.name} is part of the Snagem Guild's public Pokemon roleplay library.`, 160) : undefined;
  const faqSchema =
    active === "faq"
      ? {
          "@type": "FAQPage",
          // Lore-only entries (unbuilt mechanics) stay out of structured data
          // so search engines only index what the site actually does.
          mainEntity: FAQ.filter((item) => !item.unbuilt).map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: textFromNode(item.a) },
          })),
        }
      : undefined;

  return (
    <Box style={{ background: PAGE_BG, minHeight: "100%" }}>
      <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
        <Seo
          page="/Library"
          pageType="CollectionPage"
          title={seoTitle}
          description={seoDescription}
          schema={faqSchema}
        />
        <PageHero
          eyebrow="The Great Snagem Library · Est 2022"
          title="The Library"
          subtitle="Every guide, register, and archive the guild keeps: the Pokedex, battle rules, shadow lore, and the help desk. Choose a wing from the directory, then browse or search its holdings."
          mb={28}
        />

        <Flex
          gap={isOverMd ? 36 : 16}
          direction={isOverMd ? "row" : "column"}
          align="flex-start"
        >
          <Directory variant={isOverMd ? "rail" : "pills"} active={active} onOpen={open} />

          {/* Wing content */}
          <Box style={{ flex: 1, minWidth: 0, width: "100%" }}>
            {openWing ? (
              <Stack gap={isOverSm ? 24 : 16}>
                <Box>
                  <Group gap={10} align="center" mb={6}>
                    <Box style={{ width: 22, height: 3, background: openWing.accent }} aria-hidden />
                    <Text ff={MONO} fz={14} c={CYAN} style={{ letterSpacing: "0.08em" }}>
                      {openWing.callNo}
                    </Text>
                  </Group>
                  <Text
                    component="h2"
                    fz={{ base: 24, sm: 32 }}
                    fw={700}
                    c="#fff"
                    tt="uppercase"
                    style={{ fontFamily: DISPLAY, letterSpacing: "0.03em", lineHeight: 1.05 }}
                  >
                    {openWing.name}
                  </Text>
                  <Text fz={{ base: 14, sm: 16 }} c={DIM} mt={6} lh={1.6} maw={720}>
                    {openWing.blurb}
                  </Text>
                </Box>
                {openWing.content}
              </Stack>
            ) : (
              <ReadingRoom onOpen={open} />
            )}
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
