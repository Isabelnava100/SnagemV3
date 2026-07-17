import {
  Avatar,
  Box,
  Button,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconRocket } from "@tabler/icons-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { SectionLoader } from "../../../../components/navigation/loading";
import { pokemonData } from "../../../../data/pokemon";
import { useAuth } from "../../../../context/AuthContext";
import { getPokemonImageURL } from "../../../../helpers";
import { actorFrom, logAuditEvent } from "../../../../lib/auditLog";
import { hasCapability, isAdmin } from "../../../../lib/permissions";
import { Capability } from "../../../../components/types/typesUsed";
import {
  DEFAULT_SAFARI_RATES,
  SAFARI_STARS,
  SafariConfig,
  SafariStar,
  SafariTier,
  defaultSafariConfig,
} from "../../../../lib/safari";
import { getSafariConfig, saveSafariConfig } from "../../../../queries/safari";

const inputStyles = { input: { background: "#2E2D2E" }, label: { color: "white" } } as const;

const POKEMON_OPTIONS = pokemonData.map((p) => ({
  value: p.slug,
  label: p.name,
  image: getPokemonImageURL(p.slug),
}));

interface PokemonItemProps extends React.ComponentPropsWithoutRef<"div"> {
  image: string;
  label: string;
}
const PokemonOption = React.forwardRef<HTMLDivElement, PokemonItemProps>(
  ({ image, label, ...others }, ref) => (
    <div ref={ref} {...others}>
      <Group wrap="nowrap" gap={8}>
        <Avatar size="sm" src={image} alt={label} />
        <Text c="white" fz={14}>
          {label}
        </Text>
      </Group>
    </div>
  )
);

function StarTierEditor(props: {
  tier: SafariTier;
  onChange: (tier: SafariTier) => void;
}) {
  const { tier, onChange } = props;
  return (
    <Box p="md" style={{ borderRadius: 12, background: "#1E1D20", border: "1px solid #2a2637" }}>
      <Group justify="space-between" mb={8} wrap="wrap">
        <Text fw={800} c="white" fz={16}>
          {"★".repeat(tier.star)}{" "}
          <Text span c="dimmed" fz={13} fw={500}>
            {tier.star} Star
          </Text>
        </Text>
        <Group gap={12} wrap="wrap">
          <Group gap={6}>
            <Text fz={12} c="white">
              Encounter rate
            </Text>
            <NumberInput
              value={tier.rate}
              onChange={(v) => onChange({ ...tier, rate: Math.max(0, Number(v) || 0) })}
              min={0}
              max={100}
              w={80}
              size="xs"
              suffix="%"
              styles={inputStyles}
              aria-label={`${tier.star} star encounter rate`}
            />
          </Group>
          <Group gap={6}>
            <Text fz={12} c="white">
              Posts to defeat
            </Text>
            <NumberInput
              value={tier.postsToDefeat}
              onChange={(v) => onChange({ ...tier, postsToDefeat: Math.max(3, Number(v) || 3) })}
              min={3}
              max={51}
              step={2}
              w={80}
              size="xs"
              styles={inputStyles}
              aria-label={`${tier.star} star posts to defeat`}
            />
          </Group>
        </Group>
      </Group>
      <MultiSelect
        label={`${tier.star} star pool (${tier.pokemons.length})`}
        data={POKEMON_OPTIONS}
        renderOption={({ option }) => (
          <PokemonOption image={(option as any).image} label={option.label} />
        )}
        value={tier.pokemons}
        onChange={(pokemons) => onChange({ ...tier, pokemons })}
        searchable
        clearable
        limit={20}
        maxDropdownHeight={320}
        nothingFoundMessage="No pokemon found"
        placeholder="Search to add pokemon to this star"
        styles={inputStyles}
      />
      {tier.pokemons.length > 0 && (
        <Group gap={6} mt={8}>
          {tier.pokemons.map((slug) => (
            <Avatar key={slug} size="sm" src={getPokemonImageURL(slug)} alt={`${slug} sprite`} />
          ))}
        </Group>
      )}
    </Box>
  );
}

export default function SafariContest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [config, setConfig] = React.useState<SafariConfig | null>(null);
  const [message, setMessage] = React.useState("");

  const canLaunch = isAdmin(user) || hasCapability(user, Capability.HostEvents);

  const { data, isPending } = useQuery({
    queryKey: ["safari-config"],
    queryFn: getSafariConfig,
  });
  React.useEffect(() => {
    if (data && !config) setConfig(data);
  }, [data, config]);

  const saveMutation = useMutation({
    mutationFn: async (next: SafariConfig) => {
      await saveSafariConfig(next);
      await logAuditEvent({
        action: "safari.config",
        ...actorFrom(user),
        targetPath: "admin/safari_config",
        details: { name: next.name, tiers: next.tiers.map((t) => t.pokemons.length) },
      });
    },
    onSuccess: () => {
      setMessage("Saved. The confirmed encounter lists are ready to launch.");
      queryClient.invalidateQueries({ queryKey: ["safari-config"] });
    },
    onError: () => setMessage("Could not save. Try again."),
  });

  if (isPending || !config) return <SectionLoader />;

  const setTier = (star: SafariStar, tier: SafariTier) =>
    setConfig({ ...config, tiers: config.tiers.map((t) => (t.star === star ? tier : t)) });

  const totalRate = config.tiers.reduce((s, t) => s + (t.rate || 0), 0);
  const emptyTiers = config.tiers.filter((t) => t.rate > 0 && !t.pokemons.length);

  return (
    <Stack gap={18}>
      <Text fz={13} c="dimmed">
        Set the encounter list for each star, confirm the rates, then launch. Launching opens the
        thread composer so you post the opening scene as your own character and team. Rates are
        relative weights: a 1 star at 40 and a 5 star at 5 makes the 5 star roughly eight times
        rarer.
      </Text>

      <Group gap={12} align="end" wrap="wrap">
        <TextInput
          label="Contest name"
          value={config.name}
          onChange={(e) => setConfig({ ...config, name: e.currentTarget.value })}
          styles={inputStyles}
          w={320}
          maw="100%"
        />
      </Group>
      <Textarea
        label="Opening blurb"
        description="Shown in the first post and to players when they roll."
        value={config.blurb}
        onChange={(e) => setConfig({ ...config, blurb: e.currentTarget.value })}
        autosize
        minRows={2}
        styles={inputStyles}
      />

      <Divider color="#2a2637" label="Star tiers" labelPosition="left" />
      {config.tiers.map((tier) => (
        <StarTierEditor key={tier.star} tier={tier} onChange={(t) => setTier(tier.star as SafariStar, t)} />
      ))}
      <Text fz={12} c={totalRate > 0 ? "dimmed" : "red.4"}>
        Total weight: {totalRate}
        {SAFARI_STARS.map(
          (s) =>
            ` · ${s}★ ${
              totalRate > 0
                ? Math.round(((config.tiers.find((t) => t.star === s)?.rate ?? 0) / totalRate) * 100)
                : DEFAULT_SAFARI_RATES[s]
            }%`
        )}
      </Text>
      {emptyTiers.length > 0 && (
        <Text fz={12} c="orange.4" role="status" aria-live="polite">
          {emptyTiers.map((t) => `${t.star}★`).join(", ")} {emptyTiers.length === 1 ? "has" : "have"} a
          rate but no pokemon. Add pokemon or set the rate to 0.
        </Text>
      )}

      <Divider color="#2a2637" label="Rules" labelPosition="left" />
      <Group gap={16} wrap="wrap">
        <NumberInput
          label="Run-away chance"
          description="Per fight/feed turn"
          value={config.runAwayChance}
          onChange={(v) => setConfig({ ...config, runAwayChance: Math.max(0, Number(v) || 0) })}
          min={0}
          max={100}
          suffix="%"
          w={150}
          styles={inputStyles}
        />
        <NumberInput
          label="Berry bonus"
          description="Catch % per berry fed"
          value={config.berryBonus}
          onChange={(v) => setConfig({ ...config, berryBonus: Math.max(0, Number(v) || 0) })}
          min={0}
          max={100}
          suffix="%"
          w={150}
          styles={inputStyles}
        />
        <NumberInput
          label="Berry bonus cap"
          description="Max total from berries"
          value={config.berryBonusCap}
          onChange={(v) => setConfig({ ...config, berryBonusCap: Math.max(0, Number(v) || 0) })}
          min={0}
          max={100}
          suffix="%"
          w={150}
          styles={inputStyles}
        />
        <NumberInput
          label="Encounters per player"
          value={config.encountersPerPlayer}
          onChange={(v) => setConfig({ ...config, encountersPerPlayer: Math.max(1, Number(v) || 1) })}
          min={1}
          max={50}
          w={170}
          styles={inputStyles}
        />
      </Group>

      <Divider color="#2a2637" label="Prizes (Snag Coins)" labelPosition="left" />
      <Group gap={16} wrap="wrap">
        {(["1st", "2nd", "3rd"] as const).map((label, i) => (
          <NumberInput
            key={label}
            label={`${label} place`}
            value={config.prizeCoins[i] ?? 0}
            onChange={(v) => {
              const prizeCoins = [...config.prizeCoins] as [number, number, number];
              prizeCoins[i] = Math.max(0, Number(v) || 0);
              setConfig({ ...config, prizeCoins });
            }}
            min={0}
            w={120}
            styles={inputStyles}
          />
        ))}
        <NumberInput
          label="Consolation (all others)"
          value={config.consolationCoins}
          onChange={(v) => setConfig({ ...config, consolationCoins: Math.max(0, Number(v) || 0) })}
          min={0}
          w={190}
          styles={inputStyles}
        />
      </Group>

      {message && (
        <Text fz={13} c="green.4" role="status" aria-live="polite">
          {message}
        </Text>
      )}

      <Group justify="space-between" wrap="wrap" gap={12}>
        <Button
          variant="light"
          color="gray"
          radius="xl"
          onClick={() => setConfig(defaultSafariConfig())}
        >
          Reset to Meadow Zone
        </Button>
        <Group gap={10}>
          <Button
            variant="default"
            radius="xl"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutateAsync(config).catch(() => undefined)}
          >
            Save
          </Button>
          <Button
            radius="xl"
            color="grape"
            leftSection={<IconRocket size={16} />}
            disabled={!canLaunch || totalRate <= 0 || emptyTiers.length > 0}
            onClick={async () => {
              await saveMutation.mutateAsync(config).catch(() => undefined);
              navigate("/Forum/Events/new?safari=1");
            }}
          >
            Save & Launch
          </Button>
        </Group>
      </Group>
      {!canLaunch && (
        <Text fz={12} c="dimmed">
          You can edit the encounter lists, but launching a contest needs the Host Events capability.
        </Text>
      )}
    </Stack>
  );
}
