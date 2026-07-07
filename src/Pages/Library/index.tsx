import {
  Badge,
  Box,
  Card,
  Container,
  Group,
  Image,
  SimpleGrid,
  Stack,
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

const PAGE_CAP = 60;

function ResultCount(props: { shown: number; total: number; noun: string }) {
  if (props.total <= props.shown) {
    return (
      <Text fz={12} c="dimmed">
        {props.total} {props.noun}
      </Text>
    );
  }
  return (
    <Text fz={12} c="dimmed">
      Showing {props.shown} of {props.total} {props.noun}. Refine your search to see more.
    </Text>
  );
}

function PokedexTab() {
  const [search, setSearch] = React.useState("");
  const q = search.trim().toLowerCase();
  const matches = React.useMemo(() => {
    if (!q) return pokemonData;
    return pokemonData.filter(
      (p) => p.name.toLowerCase().includes(q) || p.idx.includes(q)
    );
  }, [q]);
  const shown = matches.slice(0, PAGE_CAP);

  return (
    <Stack gap={12}>
      <TextInput
        placeholder="Search by name or Pokedex number"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        maw={320}
        w="100%"
        radius="xl"
        styles={{ input: { background: "#2E2D2E" } }}
      />
      <ResultCount shown={shown.length} total={matches.length} noun="Pokemon" />
      <SimpleGrid cols={{ base: 3, xs: 4, sm: 6 }} spacing="xs">
        {shown.map((p) => (
          <Card key={p.idx} bg="#2b2a2b" radius="md" p={8} withBorder>
            <Stack gap={2} align="center">
              <Image
                src={getPokemonImageURL(p.slug)}
                fallbackSrc={POKEMON_SPRITE_FALLBACK}
                alt={p.name}
                w={56}
                h={56}
                fit="contain"
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
    </Stack>
  );
}

function ItemsTab() {
  const [search, setSearch] = React.useState("");
  const q = search.trim().toLowerCase();
  const matches = React.useMemo(() => {
    if (!q) return itemData;
    return itemData.filter(
      (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    );
  }, [q]);
  const shown = matches.slice(0, PAGE_CAP);

  return (
    <Stack gap={12}>
      <TextInput
        placeholder="Search by item name or category"
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        maw={320}
        w="100%"
        radius="xl"
        styles={{ input: { background: "#2E2D2E" } }}
      />
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
  { value: "pokedex", label: "Pokedex", content: <PokedexTab /> },
  { value: "items", label: "Items", content: <ItemsTab /> },
  { value: "moves", label: "Moves", content: <MovesTab /> },
  { value: "lists", label: "Encounter Lists", content: <ListsTab /> },
  { value: "lore", label: "Lore", content: <LoreTab /> },
  { value: "faq", label: "FAQ", content: <FaqTab /> },
];

export default function Library() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const active = TABS.some((t) => t.value === requested) ? requested : "pokedex";

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
