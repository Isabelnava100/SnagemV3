import { Badge, Group, HoverCard, Stack, Text } from "@mantine/core";
import { ReactElement } from "react";
import { Link } from "react-router-dom";
import { OwnedPokemon } from "../types/typesUsed";
import { pokemonData } from "../../data/pokemon";
import { starForDex } from "../../lib/encounterStars";
import { typesForDex } from "../../lib/typeChart";
import { eggGroupsForDex } from "../../lib/eggGroups";
import { natureOf, NATURE_GROUPS, NATURE_GROUP_LABEL } from "../../lib/natures";
import { levelProgress } from "../../lib/leveling";
import { SHADOW_GUIDE_LINK, STAT_MAX, isShadowed } from "../../lib/shadow";

/** A species reference for sprites that aren't a fully-owned pokemon. */
export interface SpeciesRef {
  slug?: string;
  name?: string;
  /** National dex number, if known (skips the slug lookup). */
  dex?: number | string;
  /** Rolled traits for a wild-encounter sprite, shown with the species info. */
  gender?: "M" | "F";
  shiny?: boolean;
  /** Override the computed species star (Safari rarity tier / admin override). */
  star?: number;
  /** Wild encounters have no nature until caught: show a note saying so. */
  natureOnCatch?: boolean;
}

function dexFromSlug(slug?: string): string | undefined {
  if (!slug) return undefined;
  return pokemonData.find((p) => p.slug === slug)?.idx;
}

function nameFromSlug(slug?: string): string | undefined {
  if (!slug) return undefined;
  return pokemonData.find((p) => p.slug === slug)?.name;
}

/**
 * Wraps any pokemon sprite in a hover info card. Pass an owned `pokemon` for the
 * full card (level, nature, growth stats, shiny/shadow) or a `species` ref
 * (slug/name/dex) for a species card (star, types, egg groups). The card
 * inherits the theme's viewport-safe overlay defaults, so it never renders off
 * screen.
 *
 * `children` must be a single element that accepts a ref (Avatar, Image, Box).
 */
export function PokemonHoverCard(props: {
  pokemon?: OwnedPokemon;
  species?: SpeciesRef;
  children: ReactElement;
  width?: number;
}) {
  const { pokemon, species, children, width = 250 } = props;

  // Resolve display name + dex from whichever source we were given.
  const dex = pokemon?.pokedex ?? species?.dex ?? dexFromSlug(species?.slug);
  const name =
    pokemon?.species ||
    pokemon?.name ||
    species?.name ||
    nameFromSlug(species?.slug) ||
    "Pokemon";

  const star = species?.star ?? (dex != null ? starForDex(dex) : undefined);
  const types = dex != null ? typesForDex(dex) : [];
  // Rolled traits (owned pokemon carry their own; encounters pass them in).
  const gender = pokemon?.gender ?? species?.gender;
  const shiny = pokemon?.shiny ?? species?.shiny;
  // OwnedPokemon carries its own stored types; prefer those when present.
  const ownedTypes = pokemon
    ? [pokemon.type1, pokemon.type2].filter(Boolean)
    : [];
  const typeLine = (ownedTypes.length ? ownedTypes : types).join(" / ");

  const shadowed = pokemon ? isShadowed(pokemon) : false;
  const lvl = pokemon ? levelProgress(pokemon.experience ?? 0).level : undefined;
  const nature = pokemon ? natureOf(pokemon) : undefined;
  const natureGroup = nature ? NATURE_GROUPS[nature] : undefined;

  return (
    <HoverCard width={width} shadow="md" openDelay={100} closeDelay={80} withArrow position="top">
      <HoverCard.Target>{children}</HoverCard.Target>
      <HoverCard.Dropdown bg="#1a1622" style={{ border: "1px solid #2a2637" }}>
        <Stack gap={6}>
          <Group gap={6} wrap="wrap">
            <Text c="white" fw={700} fz={16}>
              {name}
              {gender ? ` (${gender})` : ""}
            </Text>
            {typeof lvl === "number" && (
              <Badge size="xs" color="grape.2" variant="light">
                Lv {lvl}
              </Badge>
            )}
            {shiny && (
              <Badge size="xs" color="gold.0">
                Shiny
              </Badge>
            )}
            {shadowed && (
              <Badge
                component={Link}
                to={SHADOW_GUIDE_LINK}
                size="xs"
                c="grape.2"
                style={{ background: "#000", border: "1px solid #5a3fb0", cursor: "pointer" }}
              >
                Shadow&apos;ed
              </Badge>
            )}
          </Group>

          <Stack gap={2}>
            {typeof star === "number" && (
              <Text fz={13} c="gray.4">
                Star: {"★".repeat(star)} ({star})
              </Text>
            )}
            {typeLine && (
              <Text fz={13} c="gray.4">
                Type: {typeLine}
              </Text>
            )}
            {nature && (
              <Text fz={13} c="gray.4">
                Nature: {nature}
                {natureGroup ? ` (${NATURE_GROUP_LABEL[natureGroup]})` : ""}
              </Text>
            )}
            {/* Species-only: show breeding egg groups. */}
            {!pokemon && dex != null && (
              <Text fz={13} c="gray.4">
                Egg group: {eggGroupsForDex(dex).join(", ")}
              </Text>
            )}
            {/* Wild encounter: nature is decided by the roll when you catch it. */}
            {!pokemon && species?.natureOnCatch && (
              <Text fz={13} c="gray.4">
                Nature: rolled when caught
              </Text>
            )}
            {/* Owned: growth stats. */}
            {pokemon && (
              <>
                <Text fz={13} c="gray.4">
                  Experience: {pokemon.experience ?? 0}
                </Text>
                <Text fz={13} c="gray.4">
                  Friendship: {pokemon.friendship ?? 0} / {STAT_MAX}
                </Text>
                <Text fz={13} c="gray.4">
                  Purification: {pokemon.purification ?? 0} / {STAT_MAX}
                </Text>
                <Text fz={13} c="gray.4">
                  Shadow: {pokemon.shadow ?? 0} / {STAT_MAX}
                </Text>
              </>
            )}
          </Stack>
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
