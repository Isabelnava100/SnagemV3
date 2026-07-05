import { Button, Group, NumberInput, Radio, Select, Stack, Switch, Text } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { useAuth } from "../../../../context/AuthContext";
import { pokemonData } from "../../../../data/pokemon";
import { getPokemonLists } from "../../../../queries/admin";
import { DEFAULT_ENCOUNTERS_PER_USER } from "../../config";
import { callRollEncounter, callableMessage } from "../../functionsClient";
import { getEncounterLists, resolveListSlugs } from "../../queries";
import { EncounterBlock, EncounterConfig, ForumThread } from "../../types";
import { ForumPanel, ForumTextLink, GameResultText, PanelHint } from "../ui";

function YesNo(props: {
  label: string;
  noLabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Stack gap={4}>
      <Text fz={13} c="white">
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
                <Text fz={12} c="white">
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
                styles={{ label: { color: "white", fontSize: 13 } }}
              />
            )}
          </>
        )}
        <Group justify="flex-end">
          <ForumTextLink
            component="a"
            onClick={() =>
              window.open("/Dashboard/Admin-Access/Adjust-Lists", "_blank", "noopener")
            }
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
export function EncounterPostPanel(props: {
  forum: string;
  thread: ForumThread;
  value: EncounterBlock | null;
  onChange: (encounter: EncounterBlock | null) => void;
  lockedEncounters?: EncounterBlock[];
}) {
  const { user } = useAuth();
  const { forum, thread, value, onChange } = props;
  const [wantsEncounter, setWantsEncounter] = React.useState(false);
  const [encounterError, setEncounterError] = React.useState("");
  const config = thread.encounterConfig;

  // The server validates the list, allowance and mode, then binds the result
  // to this player's next post in the thread, no client-side rolling.
  const encounterMutation = useMutation({
    mutationFn: (chosenSlug?: string) => callRollEncounter(forum, thread.id, chosenSlug),
    onSuccess: (result) => onChange(result),
    onError: (err) =>
      setEncounterError(callableMessage(err, "The encounter roll failed. Try again.")),
  });

  // Resolve the host's lists (all signed-in users can read the list library).
  const { data: allLists } = useQuery({
    queryKey: ["get-admin-pokemon-lists"],
    queryFn: getPokemonLists,
    enabled: !!user && !!config?.enabled,
  });

  if (!config?.enabled) return null;

  const mainList = allLists?.formattedData.find((l) => l.id === config.listId);
  const nonCatchList = config.nonCatchable
    ? allLists?.formattedData.find((l) => l.id === config.nonCatchable?.listId)
    : undefined;
  const nonCatchSlugs = new Set(resolveListSlugs(nonCatchList));
  const pool = [...new Set([...resolveListSlugs(mainList), ...nonCatchSlugs])];

  const claimed = (thread.encounterClaims ?? {})[user?.uid ?? ""] ?? 0;
  // The value being set means one claim was just consumed server-side.
  const remaining = Math.max(0, config.perUserLimit - claimed - (value ? 1 : 0));

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
        <Text fz={13} c="dimmed">
          The host has turned off new encounters in this thread.
        </Text>
      ) : value ? (
        <GameResultText>
          {value.mode === "roll" ? "You've rolled an encounter..." : "You've chosen an encounter..."}{" "}
          {value.name}!{!value.catchable && " (It cannot be caught.)"}
        </GameResultText>
      ) : remaining <= 0 ? (
        <Text fz={13} c="dimmed">
          You have no pokemon left to encounter on this thread.
        </Text>
      ) : (
        <Stack gap={8}>
          <YesNo
            label="Would you like to encounter a pokemon within this post?"
            value={wantsEncounter}
            onChange={setWantsEncounter}
          />
          {wantsEncounter && (
            <>
              <Text fz={12} c="dimmed">
                You have {remaining} pokemon left to encounter on this thread.
              </Text>
              {config.mode === "roll" ? (
                <Button
                  size="xs"
                  radius="xl"
                  color="cyan.0"
                  w={160}
                  disabled={!pool.length}
                  loading={encounterMutation.isPending}
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
                  data={pool.map((slug) => ({
                    value: slug,
                    label:
                      (pokemonData.find((p) => p.slug === slug)?.name ?? slug) +
                      (nonCatchSlugs.has(slug) ? " (cannot be caught)" : ""),
                  }))}
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
      )}
    </ForumPanel>
  );
}
