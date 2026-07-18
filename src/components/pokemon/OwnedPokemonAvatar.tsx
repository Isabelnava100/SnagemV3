import { Avatar, Badge, Group, HoverCard, Stack, Text } from "@mantine/core";
import { Link } from "react-router-dom";
import { OwnedPokemon } from "../types/typesUsed";
import { getPokemonImageURL } from "../../helpers";
import { SHADOW_GUIDE_LINK, STAT_MAX, isShadowed } from "../../lib/shadow";
import { LevelBar } from "./EvolveButton";

/**
 * An owned-pokemon sprite that reads its Shadow status (black square + badge
 * when shadowed) and reveals a compact info card on hover: species, gender,
 * level and the four growth stats. Drop it anywhere an OwnedPokemon is shown.
 */
export default function OwnedPokemonAvatar(props: {
  pokemon: OwnedPokemon;
  size?: number;
  /** Non-shadowed corner radius (shadowed is always a 4px square). */
  radius?: number | string;
}) {
  const { pokemon, size = 48 } = props;
  const shadowed = isShadowed(pokemon);
  const name = pokemon.species || pokemon.name || "Pokemon";

  return (
    <HoverCard width={244} shadow="md" openDelay={100} closeDelay={80} withArrow position="top">
      <HoverCard.Target>
        <Avatar
          src={getPokemonImageURL(pokemon.image_slug, pokemon.shiny)}
          alt={`${name} sprite`}
          w={size}
          h={size}
          radius={shadowed ? 4 : (props.radius ?? "md")}
          bg={shadowed ? "#000" : "#3C3A3C"}
          sx={{ border: shadowed ? "1px solid #5a3fb0" : undefined, cursor: "help" }}
        />
      </HoverCard.Target>
      <HoverCard.Dropdown bg="#1a1622" style={{ border: "1px solid #2a2637" }}>
        <Stack gap={6}>
          <Group gap={6} wrap="wrap">
            <Text c="white" fw={700} fz={16}>
              {name}
              {pokemon.gender ? ` (${pokemon.gender})` : ""}
            </Text>
            {pokemon.shiny && (
              <Badge size="xs" color="gold.1">
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
          <LevelBar experience={pokemon.experience} />
          <Stack gap={2}>
            <Text fz={14} c="gray.4">
              Experience: {pokemon.experience ?? 0}
            </Text>
            <Text fz={14} c="gray.4">
              Friendship: {pokemon.friendship ?? 0} / {STAT_MAX}
            </Text>
            <Text fz={14} c="gray.4">
              Purification: {pokemon.purification ?? 0} / {STAT_MAX}
            </Text>
            <Text fz={14} c="gray.4">
              Shadow: {pokemon.shadow ?? 0} / {STAT_MAX}
            </Text>
          </Stack>
        </Stack>
      </HoverCard.Dropdown>
    </HoverCard>
  );
}
