import {
  Avatar,
  Box,
  Button,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  Select,
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
import { PokemonHoverCard } from "../../../../components/pokemon/PokemonHoverCard";
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
import {
  deleteSafariZone,
  getSafariZones,
  newSafariZoneId,
  saveSafariZone,
} from "../../../../queries/safari";

const inputStyles = { input: { background: "#2E2D2E" }, label: { color: "white" } } as const;
const NEW_ZONE = "__new__";

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
        <Text c="white" fz={16}>
          {label}
        </Text>
      </Group>
    </div>
  )
);

function StarTierEditor(props: { tier: SafariTier; onChange: (tier: SafariTier) => void }) {
  const { tier, onChange } = props;
  return (
    <Box p="md" style={{ borderRadius: 12, background: "#1E1D20", border: "1px solid #2a2637" }}>
      <Group justify="space-between" mb={8} wrap="wrap">
        <Text fw={800} c="white" fz={20}>
          {"★".repeat(tier.star)}{" "}
          <Text span c="dimmed" fz={14} fw={500}>
            {tier.star} Star
          </Text>
        </Text>
        <Group gap={12} wrap="wrap">
          <Group gap={6}>
            <Text fz={14} c="white">
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
            <Text fz={14} c="white">
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
            <PokemonHoverCard key={slug} species={{ slug }}>
              <Avatar size="sm" src={getPokemonImageURL(slug)} alt={`${slug} sprite`} />
            </PokemonHoverCard>
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
  // The zone currently loaded in the editor, and the picker's pending choice.
  const [loadedId, setLoadedId] = React.useState<string | null>(null);
  const [pickedId, setPickedId] = React.useState<string | null>(null);
  // Where Save writes: an existing zone id, or NEW_ZONE (uses the name field).
  const [saveTarget, setSaveTarget] = React.useState<string>(NEW_ZONE);
  const [message, setMessage] = React.useState("");

  const canLaunch = isAdmin(user) || hasCapability(user, Capability.HostEvents);

  const { data: zones, isPending } = useQuery({ queryKey: ["safari-zones"], queryFn: getSafariZones });

  // Load the first saved zone on the first render so the editor is never empty.
  React.useEffect(() => {
    if (zones && zones.length && !config) {
      setConfig(zones[0].config);
      setLoadedId(zones[0].id);
      setPickedId(zones[0].id);
      setSaveTarget(zones[0].id);
    }
  }, [zones, config]);

  const zoneOptions = (zones ?? []).map((z) => ({ value: z.id, label: z.config.name || "Untitled zone" }));

  const loadZone = (id: string | null) => {
    const zone = (zones ?? []).find((z) => z.id === id);
    if (!zone) return;
    setConfig({ ...zone.config, tiers: zone.config.tiers.map((t) => ({ ...t })) });
    setLoadedId(zone.id);
    setPickedId(zone.id);
    setSaveTarget(zone.id);
    setMessage(`Loaded "${zone.config.name}".`);
  };

  const startNewZone = () => {
    const fresh = defaultSafariConfig();
    fresh.name = "New Safari Zone";
    setConfig(fresh);
    setLoadedId(null);
    setSaveTarget(NEW_ZONE);
    setMessage("Started a new zone. Set a name, then Save.");
  };

  const writeZone = async (cfg: SafariConfig): Promise<string> => {
    const id = saveTarget === NEW_ZONE ? newSafariZoneId() : saveTarget;
    await saveSafariZone(id, cfg);
    await logAuditEvent({
      action: "safari.zone_save",
      ...actorFrom(user),
      targetPath: "admin/safari_config",
      details: { zone: cfg.name, tiers: cfg.tiers.map((t) => t.pokemons.length) },
    });
    setLoadedId(id);
    setSaveTarget(id);
    setPickedId(id);
    await queryClient.invalidateQueries({ queryKey: ["safari-zones"] });
    return id;
  };

  const saveMutation = useMutation({
    mutationFn: (cfg: SafariConfig) => writeZone(cfg),
    onSuccess: () => setMessage("Zone saved to the library."),
    onError: () => setMessage("Could not save. Try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteSafariZone(id);
      await queryClient.invalidateQueries({ queryKey: ["safari-zones"] });
    },
    onSuccess: () => {
      setConfig(null);
      setLoadedId(null);
      setMessage("Zone deleted.");
    },
  });

  if (isPending || !config) return <SectionLoader />;

  const setTier = (star: SafariStar, tier: SafariTier) =>
    setConfig({ ...config, tiers: config.tiers.map((t) => (t.star === star ? tier : t)) });

  const totalRate = config.tiers.reduce((s, t) => s + (t.rate || 0), 0);
  const emptyTiers = config.tiers.filter((t) => t.rate > 0 && !t.pokemons.length);
  const nameMissing = !config.name.trim();
  const launchBlocked = !canLaunch || totalRate <= 0 || emptyTiers.length > 0 || nameMissing;

  const saveTargetOptions = [
    ...zoneOptions.map((o) => ({ value: o.value, label: `Update: ${o.label}` })),
    { value: NEW_ZONE, label: "New zone (uses the name below)" },
  ];

  return (
    <Stack gap={18}>
      <Text fz={14} c="dimmed">
        Zones are saved encounter lists you can reuse. Load one from the dropdown, edit it, then save
        it back to that zone or as a brand new one, and launch it into an Event thread.
      </Text>

      {/* Zone library: pick a saved zone and load it, or start a new one. */}
      <Box p="md" style={{ borderRadius: 12, background: "#17151c", border: "1px solid #232028" }}>
        <Group gap={12} align="end" wrap="wrap">
          <Select
            label="Saved zones"
            placeholder="Pick a zone"
            data={zoneOptions}
            value={pickedId}
            onChange={setPickedId}
            w={280}
            maw="100%"
            styles={inputStyles}
          />
          <Button
            variant="default"
            radius="xl"
            disabled={!pickedId || pickedId === loadedId}
            onClick={() => loadZone(pickedId)}
          >
            Load zone
          </Button>
          <Button variant="light" color="grape" radius="xl" onClick={startNewZone}>
            New zone
          </Button>
          {loadedId && (zones?.length ?? 0) > 1 && (
            <Button
              variant="subtle"
              color="red"
              radius="xl"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm(`Delete the zone "${config.name}"?`)) {
                  deleteMutation.mutateAsync(loadedId).catch(() => undefined);
                }
              }}
            >
              Delete zone
            </Button>
          )}
        </Group>
        <Text fz={14} c="dimmed" mt={8}>
          {loadedId ? `Editing saved zone: ${config.name}` : "Editing a new, unsaved zone."}
        </Text>
      </Box>

      <TextInput
        label="Zone / contest name"
        description="Shown in the zone list, the first post and to players."
        value={config.name}
        onChange={(e) => setConfig({ ...config, name: e.currentTarget.value })}
        error={nameMissing ? "Give the zone a name." : undefined}
        styles={inputStyles}
        w={360}
        maw="100%"
      />
      <Textarea
        label="Opening blurb"
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
      <Text fz={14} c={totalRate > 0 ? "dimmed" : "red.4"}>
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
        <Text fz={14} c="gold.1" role="status" aria-live="polite">
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
        <Text fz={14} c="green.4" role="status" aria-live="polite">
          {message}
        </Text>
      )}

      <Divider color="#2a2637" label="Save & launch" labelPosition="left" />
      <Group gap={12} align="end" wrap="wrap">
        <Select
          label="Save to"
          data={saveTargetOptions}
          value={saveTarget}
          onChange={(v) => setSaveTarget(v ?? NEW_ZONE)}
          w={280}
          maw="100%"
          styles={inputStyles}
        />
        <Button
          variant="default"
          radius="xl"
          loading={saveMutation.isPending}
          disabled={nameMissing}
          onClick={() => saveMutation.mutateAsync(config).catch(() => undefined)}
        >
          Save zone
        </Button>
        <Button
          radius="xl"
          color="grape"
          leftSection={<IconRocket size={16} />}
          disabled={launchBlocked}
          onClick={async () => {
            const id = await writeZone(config).catch(() => null);
            if (id) {
              await logAuditEvent({
                action: "event.host",
                ...actorFrom(user),
                targetPath: `admin/safari_config`,
                details: { zone: config.name },
              });
              navigate(`/Forum/Events/new?safari=1&zone=${id}`);
            }
          }}
        >
          Save & Launch
        </Button>
      </Group>
      {!canLaunch && (
        <Text fz={14} c="dimmed">
          You can edit and save zones, but launching a contest needs the Host Events capability.
        </Text>
      )}
    </Stack>
  );
}
