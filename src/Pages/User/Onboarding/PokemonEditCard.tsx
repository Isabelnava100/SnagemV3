import {
  ActionIcon,
  Anchor,
  Avatar,
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import React from "react";
import { PokemonHoverCard } from "../../../components/pokemon/PokemonHoverCard";
import { getPokemonImageURL, POKEMON_SPRITE_FALLBACK } from "../../../helpers";
import { MAX_LEVEL } from "../../../lib/leveling";
import { ImportPokemon } from "../../../queries/imports";

/** Dark, square-cornered field look shared with the Onboarding page. */
const FIELD_SX = {
  "& label": { color: "#fff", fontWeight: 700, fontSize: 14, marginBottom: 6 },
  "& input": { background: "#0e0d11", border: "1px solid #2a2637", borderRadius: 0, color: "#fff" },
  "& input:focus, & input:focus-within": { borderColor: "#c79bd6" },
  "& input::placeholder": { color: "#8f8a99" },
} as const;

export const UNASSIGNED = "";

/** One editable pokemon tile in the draft: nickname, gender, level, and the
 * character it belongs to up front, stat fields behind an Edit stats toggle. */
export default function PokemonEditCard(props: {
  p: ImportPokemon;
  onChange: (patch: Partial<ImportPokemon>) => void;
  onRemove: () => void;
  /** Character names the pokemon can be assigned to; empty hides the select. */
  characterOptions?: string[];
}) {
  const { p, onChange, onRemove, characterOptions = [] } = props;
  const [statsOpen, setStatsOpen] = React.useState(false);
  const num = (
    label: string,
    key: "level" | "friendship" | "shadow" | "purification",
    min: number,
    max: number
  ) => (
    <NumberInput
      label={label}
      min={min}
      max={max}
      value={p[key]}
      onChange={(v) => onChange({ [key]: Math.max(min, Math.min(max, Number(v) || min)) })}
      size="xs"
      radius={0}
      sx={FIELD_SX}
    />
  );
  return (
    <Stack gap={10} p={12} style={{ background: "#0e0d11", border: "1px solid #232028" }}>
      <Group wrap="nowrap" align="center" gap={10}>
        <PokemonHoverCard species={{ slug: p.slug }}>
          <Avatar
            src={getPokemonImageURL(p.slug)}
            alt={p.species}
            size={36}
            radius={0}
            imageProps={{ style: { imageRendering: "pixelated" } }}
          >
            <img src={POKEMON_SPRITE_FALLBACK} alt="" width={20} height={20} />
          </Avatar>
        </PokemonHoverCard>
        <Text fz={14} fw={700} c="white" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
          {p.name?.trim() || p.species}
          {p.shiny ? " (Shiny)" : ""}
        </Text>
        <ActionIcon
          size="sm"
          color="red"
          variant="subtle"
          aria-label={`Remove ${p.species}`}
          onClick={onRemove}
        >
          <IconTrash size={14} />
        </ActionIcon>
      </Group>
      <TextInput
        label="Name"
        placeholder={p.species}
        value={p.name ?? ""}
        onChange={(e) => onChange({ name: e.currentTarget.value })}
        size="xs"
        radius={0}
        sx={FIELD_SX}
      />
      <SimpleGrid cols={2} spacing={8}>
        <Select
          label="Gender"
          data={[
            { value: "M", label: "Male" },
            { value: "F", label: "Female" },
          ]}
          value={p.gender}
          onChange={(v) => onChange({ gender: (v as "M" | "F") ?? "M" })}
          size="xs"
          radius={0}
          sx={FIELD_SX}
        />
        {num("Level", "level", 1, MAX_LEVEL)}
      </SimpleGrid>
      {characterOptions.length > 0 && (
        <Select
          label="Character"
          data={[
            { value: UNASSIGNED, label: "Unassigned" },
            ...characterOptions.map((name) => ({ value: name, label: name })),
          ]}
          value={p.character ?? UNASSIGNED}
          onChange={(v) => onChange({ character: v || UNASSIGNED })}
          size="xs"
          radius={0}
          sx={FIELD_SX}
        />
      )}
      <Anchor
        component="button"
        type="button"
        fz={13}
        c="grape.3"
        ta="left"
        aria-expanded={statsOpen}
        onClick={() => setStatsOpen((o) => !o)}
      >
        {statsOpen ? "Hide stats" : "Edit stats"}
      </Anchor>
      {statsOpen && (
        <SimpleGrid cols={2} spacing={8}>
          {num("Friendship", "friendship", 0, 255)}
          {num("Shadow", "shadow", 0, 100)}
          {num("Purification", "purification", 0, 100)}
          <Checkbox
            label="Shiny"
            checked={p.shiny}
            onChange={(e) => onChange({ shiny: e.currentTarget.checked })}
            mt={22}
            sx={{ "& label": { color: "#fff" } }}
          />
        </SimpleGrid>
      )}
    </Stack>
  );
}
