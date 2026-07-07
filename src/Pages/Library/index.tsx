import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Image,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { itemData } from "../../data/item";
import { pokemonData } from "../../data/pokemon";
import { getItemImageURL, getPokemonImageURL, POKEMON_SPRITE_FALLBACK } from "../../helpers";
import { resolveListSlugs } from "../forum/queries";
import { getPokemonLists } from "../../queries/admin";
import FaqTab from "./faq";
import LoreTab from "./lore";
import MovesTab from "./moves";

/**
 * Public data library. Any visitor (signed in or not) can browse the system's
 * reference data: the full Pokedex, the item catalog, and the public encounter
 * lists hosts build threads around. Read-only, so it never touches the admin
 * tools. Big lists are searched and capped to keep the page light.
 */

const PAGE_SIZE = 60;

function ResultCount(props: { shown: number; total: number; noun: string }) {
  return (
    <Text fz={12} c="dimmed">
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

function PokedexTab() {
  const [search, setSearch] = React.useState("");
  const [shiny, setShiny] = React.useState(false);
  const q = search.trim().toLowerCase();
  const matches = React.useMemo(() => {
    if (!q) return pokemonData;
    return pokemonData.filter(
      (p) => p.name.toLowerCase().includes(q) || p.idx.includes(q)
    );
  }, [q]);
  const { shown, hasMore, loadMore } = usePagedList(matches, [q]);

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
      <SimpleGrid cols={{ base: 3, xs: 4, sm: 6 }} spacing="xs">
        {shown.map((p) => (
          <Card key={p.idx} bg="#2b2a2b" radius="md" p={8} withBorder>
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
              <Text fz={10} c="dimmed">
                #{p.idx}
              </Text>
              <Text fz={11} c="white" ta="center" lineClamp={1}>
                {p.name}
              </Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
      {!shown.length && (
        <Text fz={13} c="dimmed" ta="center" py={20}>
          No Pokemon match that search.
        </Text>
      )}
      <LoadMore hasMore={hasMore} onClick={loadMore} />
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
                <Text fz={12} c="white" lineClamp={1}>
                  {item.name}
                </Text>
                <Text fz={10} c="dimmed" tt="capitalize" lineClamp={1}>
                  {item.category}
                </Text>
              </Box>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
      {!shown.length && (
        <Text fz={13} c="dimmed" ta="center" py={20}>
          No items match that search.
        </Text>
      )}
      <LoadMore hasMore={hasMore} onClick={loadMore} />
    </Stack>
  );
}

function ListsTab() {
  const { data, isPending } = useQuery({
    queryKey: ["public-pokemon-lists"],
    queryFn: getPokemonLists,
  });
  const publicLists = (data?.formattedData ?? []).filter((l) => l.public);

  if (isPending) {
    return (
      <Text fz={13} c="dimmed" py={20}>
        Loading lists...
      </Text>
    );
  }

  if (!publicLists.length) {
    return (
      <Text fz={13} c="dimmed" py={20}>
        There are no public encounter lists to show yet.
      </Text>
    );
  }

  return (
    <Stack gap={16}>
      <Text fz={13} c="dimmed">
        These are the shared encounter lists hosts can attach to a roleplay.
      </Text>
      {publicLists.map((list) => {
        const slugs = resolveListSlugs(list);
        const preview = slugs.slice(0, 24);
        return (
          <Card key={list.id} bg="#2b2a2b" radius="md" p={14} withBorder>
            <Group justify="space-between" mb={8} wrap="nowrap">
              <Text fz={15} c="white" fw={600} lineClamp={1}>
                {list.name || "Untitled list"}
              </Text>
              <Badge variant="light" color="grape">
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
                <Text fz={12} c="dimmed">
                  +{slugs.length - preview.length} more
                </Text>
              )}
            </Group>
          </Card>
        );
      })}
    </Stack>
  );
}

const TABS = [
  { value: "faq", label: "FAQ", content: <FaqTab /> },
  { value: "pokedex", label: "Pokedex", content: <PokedexTab /> },
  { value: "items", label: "Items", content: <ItemsTab /> },
  { value: "moves", label: "Shadow Moves", content: <MovesTab /> },
  { value: "lists", label: "Encounter Lists", content: <ListsTab /> },
  { value: "lore", label: "Lore", content: <LoreTab /> },
];

export default function Library() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const active = TABS.some((t) => t.value === requested) ? requested : "faq";

  return (
    <Container size="lg" py={{ base: 24, sm: 40 }} px={{ base: 16, sm: 24 }}>
      <Stack gap={6} mb={20}>
        <Title order={1} c="white" size={30} fw={600}>
          Library
        </Title>
        <Text fz={13} c="dimmed">
          Browse the system's reference data: every Pokemon, the item catalog,
          and the public encounter lists used in roleplays.
        </Text>
      </Stack>

      <Tabs
        value={active}
        onChange={(value) => {
          if (value) setSearchParams({ tab: value }, { replace: true });
        }}
        variant="pills"
        color="grape"
        keepMounted={false}
      >
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
