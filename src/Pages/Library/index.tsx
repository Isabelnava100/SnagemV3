import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Image,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { PageHero } from "../../components/common/PageHero";
import { useAuth } from "../../context/AuthContext";
import { itemData } from "../../data/item";
import { pokemonData } from "../../data/pokemon";
import { getItemImageURL, getPokemonImageURL, POKEMON_SPRITE_FALLBACK } from "../../helpers";
import { actorFrom, logAuditEvent } from "../../lib/auditLog";
import { postsToBeatStar, starForDex } from "../../lib/encounterStars";
import { typesForDex } from "../../lib/typeChart";
import { eggGroupsForDex } from "../../lib/eggGroups";
import { isAdmin } from "../../lib/permissions";
import { resolveListSlugs } from "../forum/queries";
import { getPokemonLists, getStarOverrides, setStarOverride } from "../../queries/admin";
import FaqTab, { faqForJsonLd } from "./faq";
import { Seo } from "../../components/common/Seo";
import { INDEXABLE_ROUTES, SITE_URL, faqJsonLd, webPageJsonLd } from "../../lib/seo";
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
 */

const PAGE_SIZE = 60;

function ResultCount(props: { shown: number; total: number; noun: string }) {
  return (
    <Text fz={14} c="dimmed">
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

function LoadMore(props: { hasMore: boolean; onClick: () => void }) {
  if (!props.hasMore) return null;
  return (
    <Group justify="center" mt={4}>
      <Button variant="light" color="grape" radius="xl" onClick={props.onClick}>
        Load more
      </Button>
    </Group>
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
      radius={12}
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
            <Text fz={14} c="dimmed">
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
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
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
  const { user } = useAuth();
  const admin = isAdmin(user);
  const [search, setSearch] = React.useState("");
  const [shiny, setShiny] = React.useState(false);
  const [editing, setEditing] = React.useState<PokedexEntry | null>(null);
  const q = search.trim().toLowerCase();
  const matches = React.useMemo(() => {
    if (!q) return pokemonData;
    return pokemonData.filter(
      (p) => p.name.toLowerCase().includes(q) || p.idx.includes(q)
    );
  }, [q]);
  const { shown, hasMore, loadMore } = usePagedList(matches, [q]);

  // Star overrides need a signed-in read (rules); visitors see the defaults.
  const { data: overrides } = useQuery({
    queryKey: ["star-overrides"],
    queryFn: getStarOverrides,
    enabled: !!user,
  });
  const starOf = (p: PokedexEntry) => overrides?.[String(Number(p.idx))] ?? starForDex(p.idx);

  return (
    <Stack gap={12}>
      <Group gap={16} align="center" wrap="wrap">
        <TextInput
          placeholder="Search by name or Pokedex number"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          maw={320}
          w="100%"
          radius="xl"
          styles={{ input: { background: "#2E2D2E" }, root: { flex: "1 1 220px" } }}
        />
        <Switch
          checked={shiny}
          onChange={(e) => setShiny(e.currentTarget.checked)}
          label="View shiny"
          color="grape"
          aria-label="View shiny sprites"
        />
      </Group>
      <ResultCount shown={shown.length} total={matches.length} noun="Pokemon" />
      {admin && (
        <Text fz={14} c="dimmed">
          Admin: select any Pokemon to change its star rating (posts to beat in
          encounters).
        </Text>
      )}
      <SimpleGrid cols={{ base: 3, xs: 4, sm: 6 }} spacing="xs">
        {shown.map((p) => {
          const star = starOf(p);
          const overridden = !!overrides && String(Number(p.idx)) in overrides;
          const body = (
            <Stack gap={2} align="center">
              <Image
                src={getPokemonImageURL(p.slug, shiny)}
                fallbackSrc={POKEMON_SPRITE_FALLBACK}
                alt={shiny ? `Shiny ${p.name}` : p.name}
                w={56}
                h={56}
                fit="contain"
                loading="lazy"
              />
              <Text fz={14} c="dimmed">
                #{p.idx}
              </Text>
              <Text fz={14} c="white" ta="center" lineClamp={1}>
                {p.name}
              </Text>
              <Text fz={14} c="gold.1" fw={700}>
                {star}★{overridden ? " (set)" : ""}
              </Text>
              <Text fz={12} c="dimmed" ta="center" lineClamp={1}>
                {typesForDex(p.idx).join("/")}
              </Text>
              <Text fz={12} c="dimmed" ta="center" lineClamp={1}>
                Egg: {eggGroupsForDex(p.idx).join("/")}
              </Text>
            </Stack>
          );
          return admin ? (
            <UnstyledButton
              key={p.idx}
              onClick={() => setEditing(p)}
              aria-label={`Edit star rating for ${p.name}, currently ${star} star`}
              style={{ display: "block" }}
            >
              <Card bg="#2b2a2b" radius="md" p={8} withBorder h="100%">
                {body}
              </Card>
            </UnstyledButton>
          ) : (
            <Card key={p.idx} bg="#2b2a2b" radius="md" p={8} withBorder>
              {body}
            </Card>
          );
        })}
      </SimpleGrid>
      {!shown.length && (
        <Text fz={14} c="dimmed" ta="center" py={20}>
          No Pokemon match that search.
        </Text>
      )}
      <LoadMore hasMore={hasMore} onClick={loadMore} />
      {admin && (
        <StarEditorModal
          entry={editing}
          overrides={overrides ?? {}}
          onClose={() => setEditing(null)}
        />
      )}
    </Stack>
  );
}

/** Distinct item categories, formatted for a Select (title-cased labels). */
const ITEM_CATEGORIES = Array.from(new Set(itemData.map((i) => i.category)))
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b))
  .map((c) => ({
    value: c,
    label: c.replace(/(^|\s)\S/g, (ch) => ch.toUpperCase()),
  }));

function ItemsTab() {
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
    <Stack gap={12}>
      <Group gap={12} align="flex-end" wrap="wrap">
        <TextInput
          label="Search"
          placeholder="Search by item name"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          maw={320}
          w="100%"
          radius="xl"
          styles={{ input: { background: "#2E2D2E" }, root: { flex: "1 1 220px" } }}
        />
        <Select
          label="Category"
          placeholder="All categories"
          data={ITEM_CATEGORIES}
          value={category}
          onChange={setCategory}
          clearable
          searchable
          radius="xl"
          maw={260}
          w="100%"
          styles={{ input: { background: "#2E2D2E" }, root: { flex: "1 1 200px" } }}
        />
      </Group>
      <ResultCount shown={shown.length} total={matches.length} noun="items" />
      <SimpleGrid cols={{ base: 2, xs: 3, sm: 4 }} spacing="xs">
        {shown.map((item) => (
          <Card key={item.id} bg="#2b2a2b" radius="md" p={10} withBorder>
            <Group gap={8} wrap="nowrap">
              <Image
                src={getItemImageURL(item.filePath)}
                alt={item.name}
                w={34}
                h={34}
                fit="contain"
                loading="lazy"
              />
              <Box style={{ minWidth: 0 }}>
                <Text fz={14} c="white" lineClamp={1}>
                  {item.name}
                </Text>
                <Text fz={14} c="dimmed" tt="capitalize" lineClamp={1}>
                  {item.category}
                </Text>
              </Box>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
      {!shown.length && (
        <Text fz={14} c="dimmed" ta="center" py={20}>
          No items match that search.
        </Text>
      )}
      <LoadMore hasMore={hasMore} onClick={loadMore} />
    </Stack>
  );
}

/** Safari Contest zones (admin/safari_config), shown as read-only registers. */
function SafariZonesSection() {
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
      <Title order={3} c="white" size={22} fw={600}>
        Safari Contest zones
      </Title>
      <Text fz={14} c="dimmed">
        The star-tiered pools staff can launch as a Safari Contest. Higher stars are
        rarer rolls.
      </Text>
      {zones.map((zone) => (
        <Card key={zone.id} bg="#2b2a2b" radius="md" p={14} withBorder>
          <Text fz={16} c="white" fw={600} mb={8}>
            {zone.name}
          </Text>
          <Stack gap={8}>
            {zone.tiers.map((tier, i) => (
              <Group key={i} gap={8} wrap="wrap" align="center">
                <Badge variant="filled" color="gold.0" w={70}>
                  {"★".repeat(Math.max(1, Math.min(5, tier.star ?? i + 1)))}
                </Badge>
                {(tier.pokemons ?? []).slice(0, 16).map((slug) => (
                  <Image
                    key={slug}
                    src={getPokemonImageURL(slug)}
                    fallbackSrc={POKEMON_SPRITE_FALLBACK}
                    alt={slug}
                    w={32}
                    h={32}
                    fit="contain"
                    loading="lazy"
                  />
                ))}
                {(tier.pokemons ?? []).length > 16 && (
                  <Text fz={14} c="dimmed">
                    +{(tier.pokemons ?? []).length - 16} more
                  </Text>
                )}
              </Group>
            ))}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function ListsTab() {
  const { data, isPending } = useQuery({
    queryKey: ["public-pokemon-lists"],
    queryFn: getPokemonLists,
  });
  // Only manually curated host lists show here; seeded mission-default pools
  // are attached by pickUpMission and stay out of the registers.
  const publicLists = (data?.formattedData ?? []).filter((l) => l.public && !l.missionDefault);

  if (isPending) {
    return (
      <Text fz={14} c="dimmed" py={20}>
        Loading lists...
      </Text>
    );
  }

  if (!publicLists.length) {
    return (
      <Stack gap={8} py={20}>
        <Text fz={14} c="dimmed">
          There are no public encounter lists to show yet.
        </Text>
        <SafariZonesSection />
      </Stack>
    );
  }

  return (
    <Stack gap={16}>
      <Text fz={14} c="dimmed">
        These are the shared encounter lists hosts can attach to a roleplay.
      </Text>
      {publicLists.map((list) => {
        const slugs = resolveListSlugs(list);
        const preview = slugs.slice(0, 24);
        return (
          <Card key={list.id} bg="#2b2a2b" radius="md" p={14} withBorder>
            <Group justify="space-between" mb={8} wrap="nowrap">
              <Text fz={16} c="white" fw={600} lineClamp={1}>
                {list.name || "Untitled list"}
              </Text>
              <Badge variant="filled" color="grape">
                {slugs.length} Pokemon
              </Badge>
            </Group>
            <Group gap={6}>
              {preview.map((slug) => (
                <Image
                  key={slug}
                  src={getPokemonImageURL(slug)}
                  fallbackSrc={POKEMON_SPRITE_FALLBACK}
                  alt={slug}
                  w={38}
                  h={38}
                  fit="contain"
                />
              ))}
              {slugs.length > preview.length && (
                <Text fz={14} c="dimmed">
                  +{slugs.length - preview.length} more
                </Text>
              )}
            </Group>
          </Card>
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
const BG = "#0d0a14";
const PANEL = "#171022";
const PANEL_BORDER = "#271e38";

type Wing = {
  value: string;
  name: string;
  callNo: string;
  meta: string;
  blurb: string;
  accent: string;
  content: React.ReactNode;
};

const WINGS: Wing[] = [
  {
    value: "pokedex",
    name: "The Pokédex",
    callNo: "QL · 700",
    meta: `${pokemonData.length.toLocaleString()} species`,
    blurb: "Every catalogued species, searchable by name or number.",
    accent: "#f472b6",
    content: <PokedexTab />,
  },
  {
    value: "items",
    name: "The Artifact Vault",
    callNo: "TS · 200",
    meta: `${itemData.length.toLocaleString()} items`,
    blurb: "The full item catalog: balls, berries, and rare relics.",
    accent: "#F5C842",
    content: <ItemsTab />,
  },
  {
    value: "battle",
    name: "The War Room",
    callNo: "GN · 030",
    meta: "Battle guide",
    blurb: "Stars, health, damage, run-away and type effectiveness: how posting fights work.",
    accent: "#E54156",
    content: <BattleGuideTab />,
  },
  {
    value: "shadow",
    name: "Growth & Shadow",
    callNo: "GN · 040",
    meta: "Stats guide",
    blurb: "Experience, friendship, shadow and purification, and how to cure a shadowed pokemon.",
    accent: "#9775fa",
    content: <ShadowGuideTab />,
  },
  {
    value: "moves",
    name: "The Shadow Codex",
    callNo: "GN · 050",
    meta: "Shadow Moves",
    blurb: "Shadow Moves by class, and the rules that govern them.",
    accent: "#b197fc",
    content: <MovesTab />,
  },
  {
    value: "lists",
    name: "Field Registers",
    callNo: "GB · 400",
    meta: "Encounter lists",
    blurb: "Shared encounter lists hosts can attach to a roleplay.",
    accent: "#5eead4",
    content: <ListsTab />,
  },
  {
    value: "forums",
    name: "The Charter",
    callNo: "GN · 020",
    meta: "Forum guide",
    blurb: "What each forum is for, who can create threads, and where gated things start.",
    accent: "#4049C9",
    content: <ForumGuideTab />,
  },
  {
    value: "lore",
    name: "The Archives",
    callNo: "PZ · 900",
    meta: "Guild canon",
    blurb: "Bound volumes of the guild's canon and mythologies.",
    accent: "#e879f9",
    content: <LoreTab />,
  },
  {
    value: "faq",
    name: "The Help Desk",
    callNo: "REF · 001",
    meta: "Common Q&A",
    blurb: "Answers to the questions new members ask most.",
    accent: "#74c0fc",
    content: <FaqTab />,
  },
];

const READING_ROOM = "reading-room";

/** One row in the left directory. Real button, so it is keyboard-operable. */
function DirectoryItem(props: {
  title: string;
  subtitle: string;
  callNo?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      onClick={props.onClick}
      aria-current={props.active ? "true" : undefined}
      style={{
        display: "block",
        width: "100%",
        padding: "12px 14px",
        borderRadius: 12,
        background: props.active ? "#1c1430" : "transparent",
        borderLeft: `3px solid ${props.active ? "#F5C842" : "transparent"}`,
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap={8}>
        <Text fz={20} fw={700} c="white" lineClamp={1}>
          {props.title}
        </Text>
        {props.callNo && (
          <Text fz={14} c="dimmed" ff="monospace" style={{ letterSpacing: 1, flexShrink: 0 }}>
            {props.callNo}
          </Text>
        )}
      </Group>
      <Text fz={14} c={props.active ? "#F5C842" : "dimmed"} mt={2}>
        {props.subtitle}
      </Text>
    </UnstyledButton>
  );
}

/** The landing: a welcome plus one card per wing. */
function ReadingRoom(props: { onOpen: (value: string) => void }) {
  return (
    <Stack gap="lg">
      <Box>
        <Text component="h2" fz={{ base: 34, sm: 44 }} fw={700} c="#f4efe3" style={{ lineHeight: 1.1 }}>
          Welcome, reader.
        </Text>
        <Text fz={16} c="gray.4" mt={8} maw={720}>
          Six wings hold everything the guild has recorded. Pick one from the directory on the left,
          or open a wing below.
        </Text>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {WINGS.map((w) => (
          <UnstyledButton
            key={w.value}
            onClick={() => props.onOpen(w.value)}
            aria-label={`Open ${w.name}`}
            style={{
              display: "block",
              textAlign: "left",
              borderRadius: 16,
              background: PANEL,
              border: `1px solid ${PANEL_BORDER}`,
              borderTop: `2px solid ${w.accent}`,
              padding: 20,
              height: "100%",
            }}
          >
            <Text fz={14} c="dimmed" ff="monospace" mb={10} style={{ letterSpacing: 2 }}>
              {w.callNo}
            </Text>
            <Text fz={26} fw={700} c="white" mb={8}>
              {w.name}
            </Text>
            <Text fz={16} c="gray.5" mb={16}>
              {w.blurb}
            </Text>
            <Group justify="space-between" align="center">
              <Text fz={14} fw={700} c={w.accent} ff="monospace">
                {w.meta}
              </Text>
              <Group gap={4} wrap="nowrap">
                <Text fz={16} fw={700} c={w.accent}>
                  Open
                </Text>
                <IconArrowRight size={16} color={w.accent} />
              </Group>
            </Group>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

export default function Library() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const active = WINGS.some((w) => w.value === requested) ? (requested as string) : READING_ROOM;

  const open = (value: string) => setSearchParams({ tab: value }, { replace: true });
  const openWing = WINGS.find((w) => w.value === active);

  // SEO: wing-aware titles, but the canonical always points at the clean
  // /Library URL (tab views are query-parameter variants, owner QA rule).
  // The Help Desk wing publishes its Q&A as FAQPage structured data.
  const libraryEntry = INDEXABLE_ROUTES.find((r) => r.path === "/Library");
  const seoTitle = openWing
    ? `${openWing.name.replace(/^The /, "")}: ${openWing.meta}`
    : (libraryEntry?.title ?? "The Library");
  const seoJsonLd: object[] = [
    webPageJsonLd(seoTitle, openWing?.blurb ?? libraryEntry?.description ?? "", `${SITE_URL}/Library`),
  ];
  if (active === "faq") seoJsonLd.push(faqJsonLd(faqForJsonLd()));

  return (
    <Box style={{ background: BG, minHeight: "100%" }}>
      <Seo
        title={seoTitle}
        description={openWing?.blurb ?? libraryEntry?.description ?? ""}
        canonical={`${SITE_URL}/Library`}
        jsonLd={seoJsonLd}
      />
      <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
        <PageHero
          eyebrow="The Great Snagem Library &middot; Est. 2022"
          eyebrowColor="#c9a94a"
          title="The Library"
          subtitle="The guild's public reference. Choose a wing from the directory, then browse or search its holdings."
          mb={28}
        />

        <Flex gap={{ base: 20, md: 36 }} direction={{ base: "column", md: "row" }} align="flex-start">
          {/* Directory */}
          <Box style={{ flex: "0 0 260px", width: "100%", maxWidth: 320 }}>
            <Text fz={14} fw={700} c="dimmed" tt="uppercase" mb={10} px={14} style={{ letterSpacing: 2 }}>
              Directory
            </Text>
            <Stack gap={2}>
              <DirectoryItem
                title="Reading Room"
                subtitle={active === READING_ROOM ? "Start here" : "Back to the landing"}
                active={active === READING_ROOM}
                onClick={() => open(READING_ROOM)}
              />
              {WINGS.map((w) => (
                <DirectoryItem
                  key={w.value}
                  title={w.name.replace(/^The /, "")}
                  subtitle={w.meta}
                  callNo={w.callNo.replace(" · ", " ")}
                  active={active === w.value}
                  onClick={() => open(w.value)}
                />
              ))}
            </Stack>
          </Box>

          {/* Wing content */}
          <Box style={{ flex: 1, minWidth: 0, width: "100%" }}>
            {openWing ? (
              <Stack gap="lg">
                <Box>
                  <Text fz={14} c="dimmed" ff="monospace" mb={4} style={{ letterSpacing: 2 }}>
                    {openWing.callNo}
                  </Text>
                  <Text component="h2" fz={{ base: 30, sm: 36 }} fw={700} c="#f4efe3" style={{ lineHeight: 1.1 }}>
                    {openWing.name}
                  </Text>
                  <Text fz={16} c="gray.5" mt={4}>
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
