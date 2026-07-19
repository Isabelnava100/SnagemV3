import {
  Button,
  Group,
  MultiSelect,
  NumberInput,
  Progress,
  Radio,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "../../../../context/AuthContext";
import { pokemonData } from "../../../../data/pokemon";
import { getPokemonLists, getStarOverrides } from "../../../../queries/admin";
import { getCharacters, getItems } from "../../../../queries/dashboard";
import { currentWeekId } from "../../../../queries/activities";
import { DEFAULT_ENCOUNTERS_PER_USER } from "../../config";
import { callRollEncounter, callableMessage } from "../../functionsClient";
import { getEncounterLists, resolveListSlugs } from "../../queries";
import { EncounterBlock, EncounterConfig, ForumThread } from "../../types";
import { safariFightBonus } from "../../../../lib/safari";
import { starForDex } from "../../../../lib/encounterStars";
import { ForumPanel, ForumTextLink, GameResultText, PanelHint } from "../ui";

function YesNo(props: {
  label: string;
  noLabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Stack gap={4}>
      <Text fz={14} c="white">
        {props.label}
      </Text>
      <Radio.Group
        value={props.value ? "yes" : "no"}
        onChange={(v) => props.onChange(v === "yes")}
      >
        <Group gap={16}>
          <Radio value="yes" label="Yes" color="pink.0" size="xs" />
          <Radio value="no" label={props.noLabel ?? "No"} color="pink.0" size="xs" />
        </Group>
      </Radio.Group>
    </Stack>
  );
}

/**
 * Encounters setup panel, used in the new-thread composer and the host menu
 * ("may be edited later"). Lists come from the admin pokemon-list library.
 */
export function EncounterSetupPanel(props: {
  value: EncounterConfig | null;
  onChange: (config: EncounterConfig | null) => void;
  /** Host menu shows the turn-off switch (board annotation 17). */
  showDisableSwitch?: boolean;
}) {
  const { user } = useAuth();
  const { value, onChange } = props;
  const { data: lists } = useQuery({
    queryKey: ["forum-encounter-lists", user?.username],
    queryFn: () => getEncounterLists(user?.username),
    enabled: !!user,
  });

  const listOptions = (lists ?? []).map((list) => ({
    value: list.id,
    label: list.name || "Untitled",
  }));

  const enable = (enabled: boolean) => {
    if (!enabled) {
      onChange(null);
      return;
    }
    onChange({
      enabled: true,
      listId: "",
      listName: "",
      mode: "roll",
      perUserLimit: DEFAULT_ENCOUNTERS_PER_USER,
      nonCatchable: null,
    });
  };

  return (
    <ForumPanel title="Encounters">
      <Stack gap={12}>
        <YesNo
          label="Would you like to assign a set of encounters to this thread?"
          noLabel="No, encounters are not allowed on this thread."
          value={!!value}
          onChange={enable}
        />
        {value && (
          <>
            <Group gap={8} wrap="wrap">
              <Select
                placeholder="Select a List"
                data={listOptions}
                value={value.listId || null}
                onChange={(listId) => {
                  const list = (lists ?? []).find((l) => l.id === listId);
                  onChange({ ...value, listId: listId ?? "", listName: list?.name ?? "" });
                }}
                size="xs"
                w={220}
                styles={{ input: { background: "#2E2D2E" } }}
              />
              <Select
                data={[
                  { value: "roll", label: "Players roll from the list" },
                  { value: "choose", label: "Players choose from the list" },
                ]}
                value={value.mode}
                onChange={(mode) =>
                  onChange({ ...value, mode: (mode as "roll" | "choose") ?? "roll" })
                }
                size="xs"
                w={220}
                styles={{ input: { background: "#2E2D2E" } }}
              />
              <Group gap={6}>
                <Text fz={14} c="white">
                  Encounters per player:
                </Text>
                <NumberInput
                  value={value.perUserLimit}
                  onChange={(v) =>
                    onChange({ ...value, perUserLimit: Math.max(1, Number(v) || 1) })
                  }
                  min={1}
                  max={50}
                  w={70}
                  size="xs"
                  styles={{ input: { background: "#2E2D2E" } }}
                />
              </Group>
            </Group>

            <YesNo
              label="Would you like to add pokemon encounters that cannot be caught? This may be edited later."
              noLabel="No, there will not be any non-catchable encounters."
              value={!!value.nonCatchable}
              onChange={(yes) =>
                onChange({
                  ...value,
                  nonCatchable: yes ? { listId: "", listName: "" } : null,
                })
              }
            />
            {value.nonCatchable && (
              <Select
                placeholder="Select a List"
                data={listOptions}
                value={value.nonCatchable.listId || null}
                onChange={(listId) => {
                  const list = (lists ?? []).find((l) => l.id === listId);
                  onChange({
                    ...value,
                    nonCatchable: { listId: listId ?? "", listName: list?.name ?? "" },
                  });
                }}
                size="xs"
                w={220}
                styles={{ input: { background: "#2E2D2E" } }}
              />
            )}

            {props.showDisableSwitch && (
              <Switch
                label="Turn off encounters for new posts"
                color="pink.0"
                checked={!!value.disabled}
                onChange={(e) => onChange({ ...value, disabled: e.currentTarget.checked })}
                styles={{ label: { color: "white", fontSize: 14 } }}
              />
            )}
          </>
        )}
        <Group justify="flex-end">
          <ForumTextLink
            component="a"
            onClick={() => window.open("/Library?tab=lists", "_blank", "noopener")}
          >
            Open a new tab to view all lists here.
          </ForumTextLink>
        </Group>
      </Stack>
    </ForumPanel>
  );
}

/**
 * Encounters panel in the post composer. Which selector renders (roll button
 * vs search-the-list) depends on what the host selected (board 16); the
 * remaining allowance is displayed and enforced. Once rolled/chosen the
 * encounter locks (board 20/21).
 */
/**
 * The per-turn Safari controls: shows the wild Pokemon's remaining health and
 * lets the player pick this turn's action (fight it down, feed it a berry, or
 * throw a ball). The chosen action rides along to publishForumPost, which rolls
 * the capture, applies the berry bonus, or wears its health down.
 */
function SafariEncounterControls(props: {
  thread: ForumThread;
  value: EncounterBlock;
  action: "fight" | "berry" | "ball";
  onAction: (action: "fight" | "berry" | "ball") => void;
}) {
  const { thread, value, action, onAction } = props;
  const safari = thread.safariContest!;
  const postsToDefeat = Math.max(3, value.postsToDefeat ?? 3);
  const fightPosts = value.fightPosts ?? 0;
  const healthLeft = Math.max(0, postsToDefeat - fightPosts);
  const healthPct = Math.round((healthLeft / postsToDefeat) * 100);
  const fightBonus = safariFightBonus(fightPosts, postsToDefeat);
  const berryBonus = value.catchBonus ?? 0;

  return (
    <Stack gap={8}>
      <GameResultText>
        A {"★".repeat(value.star ?? 1)} {value.star ?? 1}-star {value.name} appeared!
      </GameResultText>
      <Stack gap={2}>
        <Progress value={healthPct} color="red.6" size="lg" radius="xl" striped animated />
        <Text fz={14} c="dimmed">
          Health: {healthLeft}/{postsToDefeat}. Knock it out and it is gone, so catch it first.
        </Text>
      </Stack>
      <Text fz={14} c="dimmed">
        Catch bonus so far: +{fightBonus + berryBonus}% (weakened +{fightBonus}%, berries +{berryBonus}
        %). Your ball sets the base rate.
      </Text>
      <Radio.Group
        label="What do you do this post?"
        value={action}
        onChange={(v) => onAction((v as "fight" | "berry" | "ball") ?? "fight")}
        styles={{ label: { color: "white", fontSize: 14, marginBottom: 4 } }}
      >
        <Stack gap={4}>
          <Radio value="fight" color="pink.0" size="xs" label="Fight it (wear its health down)" />
          <Radio value="berry" color="pink.0" size="xs" label="Feed a berry / food (add it in Items to raise the catch rate)" />
          <Radio value="ball" color="pink.0" size="xs" label="Throw a ball (add a ball in Items to attempt the catch)" />
        </Stack>
      </Radio.Group>
      <PanelHint>
        There is a {safari.runAwayChance}% chance it runs off on a fight or feed turn. A ball throw
        always resolves.
      </PanelHint>
    </Stack>
  );
}

export function EncounterPostPanel(props: {
  forum: string;
  thread: ForumThread;
  value: EncounterBlock | null;
  onChange: (encounter: EncounterBlock | null) => void;
  lockedEncounters?: EncounterBlock[];
  safariAction?: "fight" | "berry" | "ball";
  onSafariAction?: (action: "fight" | "berry" | "ball") => void;
}) {
  const { user } = useAuth();
  const { forum, thread, value, onChange } = props;
  const isSafari = !!thread.safariContest;
  const [wantsEncounter, setWantsEncounter] = React.useState(false);
  const [encounterError, setEncounterError] = React.useState("");
  const [forCharacterIds, setForCharacterIds] = React.useState<string[]>([]);
  const config = thread.encounterConfig;

  // The roller's characters, so the encounter can be captured for specific ones.
  const { data: characters } = useQuery({
    queryKey: ["get-characters", user?.uid],
    queryFn: () => getCharacters(user!.uid),
    enabled: !!user && !!config?.enabled,
  });

  // The server validates the list, allowance and mode, then binds the result
  // to this player's next post in the thread, no client-side rolling.
  const encounterMutation = useMutation({
    mutationFn: (chosenSlug?: string) =>
      callRollEncounter(forum, thread.id, chosenSlug, forCharacterIds),
    onSuccess: (result) => onChange(result),
    onError: (err) =>
      setEncounterError(callableMessage(err, "The encounter roll failed. Try again.")),
  });
  const fishingMutation = useMutation({
    mutationFn: () => callRollEncounter(forum, thread.id, undefined, forCharacterIds, true),
    onSuccess: (result) => onChange(result),
    onError: (err) =>
      setEncounterError(callableMessage(err, "The cast failed. Try again.")),
  });

  // The Fishing Pond thread: casting needs any rod from the Snag Mall; one
  // cast per week (the server re-checks both).
  const isPond = !!thread.fishingPond;
  const { data: bagItems } = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user!.uid),
    enabled: !!user && isPond,
  });
  // Best rod owned sets the bite odds (mirrors ROD_ODDS server-side):
  // Old 65/30/5, Good 60/30/10, Super 55/30/10 plus a 5% 4-star bite.
  const myRod = React.useMemo(() => {
    let best: { name: string; tier: number } | null = null;
    (bagItems ?? []).forEach((i) => {
      if (Number(i.quantity) <= 0) return;
      const key = i.name.toLowerCase().replace(/\s+/g, "-");
      const tier =
        key === "super-rod" ? 3 : key === "good-rod" ? 2 : key === "old-rod" || key === "fishing-rod" ? 1 : 0;
      if (tier > (best?.tier ?? 0)) best = { name: i.name, tier };
    });
    return best as { name: string; tier: number } | null;
  }, [bagItems]);
  const fishedThisWeek = !!user && thread.fishingClaims?.[user.uid] === currentWeekId();

  // Resolve the host's lists (all signed-in users can read the list library).
  const { data: allLists } = useQuery({
    queryKey: ["get-admin-pokemon-lists"],
    queryFn: getPokemonLists,
    enabled: !!user && !!config?.enabled,
  });

  // Admin star overrides so the picker's difficulty labels match the server.
  const { data: starOverrides } = useQuery({
    queryKey: ["star-overrides"],
    queryFn: getStarOverrides,
    enabled: !!user && !!config?.enabled && config.mode === "choose",
  });

  if (!config?.enabled) return null;

  const mainList = allLists?.formattedData.find((l) => l.id === config.listId);
  const nonCatchList = config.nonCatchable
    ? allLists?.formattedData.find((l) => l.id === config.nonCatchable?.listId)
    : undefined;
  const nonCatchSlugs = new Set(resolveListSlugs(nonCatchList));
  // Safari pools live on the thread's safariContest tiers, not the list library.
  const pool = isSafari
    ? [...new Set((thread.safariContest?.tiers ?? []).flatMap((t) => t.pokemons))]
    : [...new Set([...resolveListSlugs(mainList), ...nonCatchSlugs])];

  const claimed = (thread.encounterClaims ?? {})[user?.uid ?? ""] ?? 0;
  // The value being set means one claim was just consumed server-side.
  const remaining = Math.max(0, config.perUserLimit - claimed - (value ? 1 : 0));

  // A fully worn-down (beaten) normal encounter no longer blocks a new roll:
  // the player can skip the catch and pick their next target (the server
  // records the defeat the moment the bar fills).
  const valueBeaten =
    !!value &&
    value.postsToDefeat == null &&
    !!value.required &&
    (value.progress ?? 0) >= value.required;

  const rollSection = (
    <Stack gap={8}>
      <YesNo
        label={
          valueBeaten
            ? "Roll a new encounter instead? (This lets the beaten one go.)"
            : "Would you like to encounter a pokemon within this post?"
        }
        value={wantsEncounter}
        onChange={setWantsEncounter}
      />
      {wantsEncounter && (
        <>
          <Text fz={14} c="dimmed">
            You have {remaining} pokemon left to encounter on this thread.
          </Text>
          <MultiSelect
            label="Catch it for (optional)"
            description="Leave empty to catch it yourself; the caught Pokemon joins the chosen character's box."
            placeholder="Any of your characters"
            data={(characters?.sortedData ?? []).map((c) => ({ value: c.id, label: c.name }))}
            value={forCharacterIds}
            onChange={setForCharacterIds}
            clearable
            size="xs"
            styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
          />
          {config.mode === "roll" ? (
            <Button
              size="xs"
              radius="xl"
              color="cyan.0"
              w={160}
              disabled={!pool.length}
              loading={encounterMutation.isPending || fishingMutation.isPending}
              onClick={() => {
                setEncounterError("");
                encounterMutation.mutateAsync(undefined).catch(() => undefined);
              }}
            >
              Roll an Encounter
            </Button>
          ) : (
            <Select
              placeholder="Search for pokemon within the list"
              searchable
              data={pool.map((slug) => {
                const species = pokemonData.find((p) => p.slug === slug);
                const star = species
                  ? starOverrides?.[String(Number(species.idx))] ?? starForDex(species.idx)
                  : undefined;
                return {
                  value: slug,
                  label:
                    (species?.name ?? slug) +
                    (!isSafari && star ? ` (${star}★)` : "") +
                    (nonCatchSlugs.has(slug) ? " (cannot be caught)" : ""),
                };
              })}
              value={null}
              disabled={encounterMutation.isPending}
              onChange={(slug) => {
                if (!slug) return;
                setEncounterError("");
                encounterMutation.mutateAsync(slug).catch(() => undefined);
              }}
              size="xs"
              w={260}
              styles={{ input: { background: "#2E2D2E" } }}
            />
          )}
          {encounterError && <GameResultText>{encounterError}</GameResultText>}
        </>
      )}
    </Stack>
  );

  return (
    <ForumPanel title="Encounters">
      <PanelHint>In this thread, the list of possible encounters has been set by the host.</PanelHint>
      {(props.lockedEncounters ?? []).map((enc, i) => (
        <GameResultText key={i}>
          {enc.mode === "roll" ? "You've rolled an encounter..." : "You've chosen an encounter..."}{" "}
          {enc.name}!
        </GameResultText>
      ))}

      {config.disabled ? (
        <Text fz={14} c="dimmed">
          The host has turned off new encounters in this thread.
        </Text>
      ) : value && isSafari && value.star ? (
        <SafariEncounterControls
          thread={thread}
          value={value}
          action={props.safariAction ?? "fight"}
          onAction={props.onSafariAction ?? (() => undefined)}
        />
      ) : value ? (
        <Stack gap={6}>
          <GameResultText>
            {value.method === "fishing"
              ? "You cast your line and reeled in..."
              : value.mode === "roll"
                ? "You've rolled an encounter..."
                : "You've chosen an encounter..."}{" "}
            {value.star ? `a ${"★".repeat(Math.min(7, value.star))} ${value.star}-star ` : ""}
            {value.name}!{value.shiny && " It's SHINY!"}
            {value.gender ? ` (${value.gender === "F" ? "Female" : "Male"})` : ""}
            {!value.catchable && " (It cannot be caught.)"}
          </GameResultText>
          {value.catchable && !!value.required && (
            <Stack gap={4}>
              <Progress
                value={Math.max(
                  0,
                  Math.round(
                    ((value.required - Math.min(value.progress ?? 0, value.required)) /
                      value.required) *
                      100
                  )
                )}
                color="red.6"
                size="lg"
                radius="xl"
              />
              <Text fz={14} c="dimmed">
                {(value.progress ?? 0) >= value.required
                  ? "It's beaten. Use a Poke Ball in this post to catch it, or roll a new encounter to move on."
                  : `Health: ${
                      Math.round(
                        (value.required - Math.min(value.progress ?? 0, value.required)) * 10
                      ) / 10
                    }/${value.required} posts. Keep posting to wear it down, then throw a ball.`}
              </Text>
            </Stack>
          )}
          {valueBeaten && remaining > 0 && !isPond && rollSection}
        </Stack>
      ) : isPond ? (
        <Stack gap={8}>
          {fishedThisWeek ? (
            <Text fz={14} c="dimmed">
              You already cast your line this week. The pond restocks Monday 00:00 UTC.
            </Text>
          ) : !myRod ? (
            <Text fz={14} c="dimmed">
              You need a fishing rod. The Snag Mall&apos;s Angler&apos;s Corner sells them.
            </Text>
          ) : (
            <>
              <MultiSelect
                label="Fishing as (optional)"
                description="The catch joins the chosen character's box."
                placeholder="Any of your characters"
                data={(characters?.sortedData ?? []).map((c) => ({ value: c.id, label: c.name }))}
                value={forCharacterIds}
                onChange={setForCharacterIds}
                clearable
                size="xs"
                styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
              />
              <Group gap={8} align="center">
                <Button
                  size="xs"
                  radius="xl"
                  variant="light"
                  color="blue"
                  loading={fishingMutation.isPending}
                  onClick={() => {
                    setEncounterError("");
                    fishingMutation.mutateAsync().catch(() => undefined);
                  }}
                >
                  Cast your line ({myRod.name})
                </Button>
                <Text fz={13} c="dimmed">
                  Once a week. Water-type bites:{" "}
                  {myRod.tier >= 3
                    ? "1★ 55% / 2★ 30% / 3★ 10%, plus a 5% 4★ bite (Super Rod)"
                    : myRod.tier === 2
                      ? "1★ 60% / 2★ 30% / 3★ 10%"
                      : "1★ 65% / 2★ 30% / 3★ 5% (a better rod means better bites)"}
                  .
                </Text>
              </Group>
            </>
          )}
          {encounterError && <GameResultText>{encounterError}</GameResultText>}
        </Stack>
      ) : remaining <= 0 ? (
        <Text fz={14} c="dimmed">
          You have no pokemon left to encounter on this thread.
        </Text>
      ) : (
        rollSection
      )}
    </ForumPanel>
  );
}
