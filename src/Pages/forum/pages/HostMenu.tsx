import {
  Avatar,
  Box,
  Checkbox,
  Container,
  Divider,
  Flex,
  Group,
  MultiSelect,
  NumberInput,
  Radio,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import { SectionLoader } from "../../../components/navigation/loading";
import { Capability } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { actorFrom, logAuditEvent } from "../../../lib/auditLog";
import { pokemonData } from "../../../data/pokemon";
import { getPokemonImageURL } from "../../../helpers";
import { battleStage } from "../../../lib/battleStage";
import { hasCapability, isAdmin } from "../../../lib/permissions";
import { getPokemonLists } from "../../../queries/admin";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { getUsers } from "../../../queries/admin";
import { getXPDefaults } from "../../../queries/game";
import {
  endBossBattle,
  setThreadArchived,
  startBossBattle,
  updateThreadDetails,
} from "../mutations";
import { callSetThreadWeather } from "../functionsClient";
import { getThread, resolveListSlugs } from "../queries";
import { EncounterConfig } from "../types";
import { EncounterSetupPanel } from "../components/composer/EncounterPanels";
import SafariJudgePanel from "../components/SafariJudgePanel";
import { ConfirmModal, ForumPanel, GameResultText, PanelHint } from "../components/ui";
import CloseThreadModal from "../components/CloseThreadModal";
import { userIsHost } from "./ThreadView";
import "../forum.css";

/**
 * Host Menu, visible only to the thread host (the first poster) and admins.
 * Edit forum details, manage encounters after creation (board 15/17), run
 * boss battles, and archive the thread. Archive and boss battle actions all
 * require confirmation modals (board 13/14).
 */
/** Host-editable battle weather, changeable at any time mid-thread. */
function WeatherPanel(props: { forum: string; threadId: string; current: string | null }) {
  const queryClient = useQueryClient();
  const [value, setValue] = React.useState<string | null>(props.current);
  const [message, setMessage] = React.useState("");
  const save = useMutation({
    mutationFn: () => callSetThreadWeather(props.forum, props.threadId, value),
    onSuccess: () => {
      setMessage("Weather updated. It applies from the next battle post.");
      queryClient.invalidateQueries({ queryKey: ["forum-thread", props.forum, props.threadId] });
    },
    onError: (e) => setMessage((e as Error).message || "Could not change the weather."),
  });
  return (
    <ForumPanel title="Weather">
      <PanelHint>
        Battle weather boosts favored attacker types and weakens the rest. You can retune
        it at any point in the thread.
      </PanelHint>
      <Group gap={10} align="flex-end">
        <Select
          label="Current weather"
          data={[
            { value: "sun", label: "Harsh sunlight (Fire/Grass up, Water down)" },
            { value: "rain", label: "Rain (Water/Electric up, Fire down)" },
            { value: "sandstorm", label: "Sandstorm (Rock/Ground/Steel up, Flying down)" },
            { value: "snow", label: "Snow (Ice up, Grass down)" },
          ]}
          placeholder="Clear skies (no weather)"
          value={value}
          onChange={setValue}
          clearable
          w={280}
          styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
        />
        <GradientButtonSecondary
          radius="xl"
          size="xs"
          loading={save.isPending}
          onClick={() => {
            setMessage("");
            save.mutateAsync().catch(() => undefined);
          }}
        >
          Set Weather
        </GradientButtonSecondary>
      </Group>
      {message && (
        <Text fz={14} c="green.0" role="status" aria-live="polite">
          {message}
        </Text>
      )}
    </ForumPanel>
  );
}

export default function HostMenu() {
  const { forum: forumParam, id: threadId } = useParams();
  const forum = forumParam ?? "Main-Forum";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();
  const queryClient = useQueryClient();

  const { data: thread, isPending } = useQuery({
    queryKey: ["forum-thread", forum, threadId],
    queryFn: () => getThread(forum, threadId!),
    enabled: !!threadId,
  });
  const { data: xpDefaults } = useQuery({ queryKey: ["xp-defaults"], queryFn: getXPDefaults });

  const [title, setTitle] = React.useState("");
  const [useDefaultXp, setUseDefaultXp] = React.useState(true);
  const [pinned, setPinned] = React.useState(false);
  const [restricted, setRestricted] = React.useState(false);
  const [allowedPosters, setAllowedPosters] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [instructions, setInstructions] = React.useState("");
  const [encounterConfig, setEncounterConfig] = React.useState<EncounterConfig | null>(null);
  const [bossSlug, setBossSlug] = React.useState<string | null>(null);
  const [bossDescription, setBossDescription] = React.useState("");
  // Optional damage-per-attack-post override; empty = the species' star damage.
  const [bossDamage, setBossDamage] = React.useState<number | "">("");
  const [bossExcluded, setBossExcluded] = React.useState<string[]>([]);
  const [saved, setSaved] = React.useState(false);
  const [saveError, setSaveError] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);

  const [archiveOpened, archiveModal] = useDisclosure(false);
  const [closeOpened, closeModal] = useDisclosure(false);
  const [bossStartOpened, bossStartModal] = useDisclosure(false);
  const [bossEndOpened, bossEndModal] = useDisclosure(false);

  React.useEffect(() => {
    if (!thread || loaded) return;
    setTitle(thread.title ?? "");
    setPinned(!!thread.pinned);
    setRestricted(!!thread.restricted);
    setAllowedPosters(thread.allowedPosters ?? []);
    setTags(thread.tags ?? []);
    setInstructions(thread.instructions ?? "");
    setEncounterConfig(thread.encounterConfig ?? null);
    setLoaded(true);
  }, [thread, loaded]);

  const { data: allUsers } = useQuery({
    queryKey: ["forum-all-users"],
    queryFn: getUsers,
  });
  const userOptions = (allUsers ?? [])
    .map((u) => u.username)
    .filter(Boolean)
    .map((username) => ({ value: username, label: username }));

  // Boss options come from the encounter list(s) set on this thread. If none is
  // set yet, the full dex is offered so a boss can still be picked.
  const { data: pokemonLists } = useQuery({
    queryKey: ["get-admin-pokemon-lists"],
    queryFn: getPokemonLists,
  });
  const bossPool = React.useMemo(() => {
    const cfg = encounterConfig;
    const lists = pokemonLists?.formattedData ?? [];
    const ids = [cfg?.listId, cfg?.nonCatchable?.listId].filter(Boolean) as string[];
    const slugs = new Set<string>();
    ids.forEach((id) => resolveListSlugs(lists.find((l) => l.id === id)).forEach((s) => slugs.add(s)));
    const source = slugs.size
      ? pokemonData.filter((p) => slugs.has(p.slug))
      : pokemonData;
    return source.map((p) => ({ value: p.slug, label: p.name }));
  }, [encounterConfig, pokemonLists]);

  const invalidateThread = () =>
    queryClient.invalidateQueries({ queryKey: ["forum-thread", forum, threadId] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateThreadDetails(forum, threadId!, {
        title: title.trim() || thread!.title,
        instructions,
        tags,
        ...(isAdmin(user) ? { pinned } : {}),
        restricted,
        allowedPosters: restricted ? allowedPosters : [],
        // Battle mode is battle-staff only; a plain host write with
        // encounterConfig in it would be rejected by the Firestore rules.
        ...(isAdmin(user) || hasCapability(user, Capability.ManageBattles)
          ? { encounterConfig }
          : {}),
        // "Use defaults" resets the per-post amounts to the current site
        // defaults. (XP always applies per post; the old instant-vs-close
        // choice is retired.)
        ...(thread!.staffCreated && useDefaultXp && xpDefaults
          ? { xpConfig: { ...xpDefaults } }
          : {}),
      });
    },
    onSuccess: () => {
      setSaved(true);
      invalidateThread();
    },
    onError: (e) => {
      setSaved(false);
      setSaveError((e as Error).message || "Could not save changes. Try again.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const closing = !thread?.closed;
      await setThreadArchived(forum, threadId!, closing);
      if (closing) {
        await logAuditEvent({
          action: "thread.close",
          ...actorFrom(user),
          targetPath: `forum/${forum}/threads/${threadId}`,
          details: { title: thread?.title, forum },
        });
      }
    },
    onSuccess: () => {
      const justArchived = !thread?.closed;
      archiveModal.close();
      invalidateThread();
      queryClient.invalidateQueries({ queryKey: ["forum-threads", forum] });
      // Closing a thread opens the rewards flow for reward granters (Q1).
      if (justArchived && hasCapability(user, Capability.GiveItems)) {
        navigate(`/Forum/${forum}/thread/${threadId}/rewards`);
      }
    },
  });

  const bossStartMutation = useMutation({
    mutationFn: async () => {
      const dex = Number(pokemonData.find((p) => p.slug === bossSlug)?.idx ?? 0);
      await startBossBattle(forum, threadId!, {
        slug: bossSlug!,
        description: bossDescription,
        excluded: bossExcluded,
        stage: battleStage(dex),
        ...(typeof bossDamage === "number" && bossDamage > 0
          ? { attackDamage: Math.trunc(bossDamage) }
          : {}),
      });
    },
    onSuccess: () => {
      bossStartModal.close();
      invalidateThread();
      queryClient.invalidateQueries({ queryKey: ["forum-posts-count", forum, threadId] });
    },
  });

  const bossEndMutation = useMutation({
    mutationFn: () => endBossBattle(forum, threadId!),
    onSuccess: () => {
      bossEndModal.close();
      invalidateThread();
      queryClient.invalidateQueries({ queryKey: ["forum-posts-count", forum, threadId] });
    },
  });

  if (isPending) {
    return (
      <Container size="lg" mt={20}>
        <SectionLoader />
      </Container>
    );
  }

  // Battle staff (admin or the ManageBattles capability) get host access on
  // every thread; battle mode itself (encounterConfig) is battle-staff only.
  const battleStaff = isAdmin(user) || hasCapability(user, Capability.ManageBattles);
  if (!thread || (!userIsHost(thread, user) && !battleStaff)) {
    return (
      <Container size="lg" mt={20}>
        <Text c="white">Only the host of this thread can open the host menu.</Text>
      </Container>
    );
  }

  const activeBoss = thread.bossBattle?.active ? thread.bossBattle : null;

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <Title order={1} fz={isOverSm ? 30 : 20} c="white" fw={400} mb={16}>
        Host Menu
      </Title>

      <Flex gap={16} align="flex-start" direction={isOverSm ? "row" : "column"}>
        {/* Left column: forum details + archive */}
        <Stack gap={16} style={{ flex: 5, width: "100%" }}>
          <ForumPanel title="Forum Details">
            <Stack gap={12}>
              <TextInput
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
              />
              {isAdmin(user) && (
                <Radio.Group
                  value={pinned ? "pin" : "nopin"}
                  onChange={(v) => setPinned(v === "pin")}
                >
                  <Group gap={16}>
                    <Radio value="nopin" label="Do Not Pin" color="pink.0" size="xs" />
                    <Radio
                      value="pin"
                      label="Fixed Pinned Thread to the Top"
                      color="pink.0"
                      size="xs"
                    />
                  </Group>
                </Radio.Group>
              )}
              <Text fz={14} c="dimmed" fs="italic">
                Location: {forum.replace(/-/g, " ")}
              </Text>

              <Divider color="#4a464a" />

              <Box>
                <Text fz={14} fw={700} c="white" tt="uppercase">
                  Restrictions
                </Text>
                <PanelHint>
                  Select who can post on this thread aside from the host, this may be changed
                  later. This will not limit who can view the thread.
                </PanelHint>
                <Radio.Group
                  value={restricted ? "limit" : "anyone"}
                  onChange={(v) => setRestricted(v === "limit")}
                >
                  <Group gap={16}>
                    <Radio value="anyone" label="Allow Anyone" color="pink.0" size="xs" />
                    <Radio value="limit" label="Limit Who Can Post" color="pink.0" size="xs" />
                  </Group>
                </Radio.Group>
                {restricted && (
                  <MultiSelect
                    mt={8}
                    placeholder="Search for users who can post"
                    searchable
                    data={userOptions}
                    value={allowedPosters}
                    onChange={setAllowedPosters}
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                )}
              </Box>

              <Divider color="#4a464a" />

              <Box>
                <Text fz={14} fw={700} c="white" tt="uppercase">
                  Tags
                </Text>
                <PanelHint>
                  Add additional words to make the thread easier to find via search.
                </PanelHint>
                <TagsInput
                  value={tags}
                  onChange={setTags}
                  placeholder="Type a tag and press Enter"
                  styles={{ input: { background: "#2E2D2E" } }}
                />
              </Box>

              <TextInput
                label="Instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.currentTarget.value)}
                styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
              />
            </Stack>
          </ForumPanel>

          {thread.staffCreated && (
            <ForumPanel title="Rewards & XP">
              <PanelHint>
                Experience and stats are awarded automatically to each team pokemon as people post.
                Items and coins are reviewed by an admin when the thread closes.
              </PanelHint>
              <Checkbox
                mt={10}
                label="Use default settings for exp stuff"
                color="green.0"
                checked={useDefaultXp}
                onChange={(e) => setUseDefaultXp(e.currentTarget.checked)}
                styles={{ label: { color: "white", fontSize: 14 } }}
              />
            </ForumPanel>
          )}

          <Group>
            {thread.closed ? (
              <GradientButtonSecondary radius="xl" size="sm" onClick={archiveModal.open}>
                Reopen This Thread
              </GradientButtonSecondary>
            ) : (
              <GradientButtonSecondary radius="xl" size="sm" onClick={closeModal.open}>
                Close Thread
              </GradientButtonSecondary>
            )}
          </Group>
        </Stack>

        {/* Right column: encounters + boss battle (or Safari judging) */}
        <Stack gap={16} style={{ flex: 7, width: "100%" }}>
          <WeatherPanel forum={forum} threadId={threadId!} current={thread.weather ?? null} />

          {thread.safariContest ? (
            <SafariJudgePanel forum={forum} threadId={threadId!} thread={thread} />
          ) : battleStaff ? (
            <EncounterSetupPanel
              value={encounterConfig}
              onChange={setEncounterConfig}
              showDisableSwitch
            />
          ) : (
            <ForumPanel title="Encounters">
              <PanelHint>
                Battle mode (enabling or disabling encounters) is managed by admins and
                battle staff. Ask a staff member if this thread&apos;s encounter setup
                needs a change.
              </PanelHint>
            </ForumPanel>
          )}

          {!thread.safariContest && (
          <ForumPanel title="Boss Battle">
            {activeBoss ? (
              <Stack gap={10}>
                <Text fz={22} c="white">
                  It&apos;s a Boss Battle!
                </Text>
                <Avatar src={getPokemonImageURL(activeBoss.slug)} alt={`${activeBoss.name} sprite`} size={72} radius="xl" />
                <GameResultText>
                  {activeBoss.name} is active
                  {activeBoss.excluded.length
                    ? `, excluded: ${activeBoss.excluded.join(", ")}`
                    : ""}
                  .
                </GameResultText>
                <Group>
                  <GradientButtonSecondary radius="xl" size="xs" onClick={bossEndModal.open}>
                    End Boss Battle
                  </GradientButtonSecondary>
                </Group>
              </Stack>
            ) : (
              <Stack gap={10}>
                <PanelHint>Select the boss for everyone to face.</PanelHint>
                <Select
                  placeholder="Select a Pokemon from the encounter list"
                  searchable
                  data={bossPool}
                  value={bossSlug}
                  onChange={setBossSlug}
                  limit={20}
                  w={isOverSm ? 260 : "100%"}
                  styles={{ input: { background: "#2E2D2E" } }}
                />
                {bossSlug && (
                  <Avatar src={getPokemonImageURL(bossSlug)} alt={`${bossSlug} sprite`} size={64} radius="xl" />
                )}
                <Textarea
                  label="Description"
                  placeholder="Announcement text posted into the thread"
                  value={bossDescription}
                  onChange={(e) => setBossDescription(e.currentTarget.value)}
                  autosize
                  minRows={2}
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />
                <NumberInput
                  label="Attack damage (optional)"
                  description="Damage the boss deals to a fighter per attack post. Leave empty for its species' star damage."
                  placeholder="Default: species star damage"
                  value={bossDamage}
                  onChange={(v: number | string) => setBossDamage(typeof v === "number" ? v : "")}
                  min={1}
                  w={isOverSm ? 260 : "100%"}
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />
                <Box>
                  <Text fz={14} fw={700} c="white">
                    Exclude
                  </Text>
                  <PanelHint>
                    Exclude anyone who is posting who won&apos;t have the boss activated for
                    them. (Ex. They are battling outside the boss&apos;s area.)
                  </PanelHint>
                  <MultiSelect
                    placeholder="Search for users to exclude"
                    searchable
                    data={userOptions}
                    value={bossExcluded}
                    onChange={setBossExcluded}
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                </Box>
                <Group>
                  <GradientButtonSecondary
                    radius="xl"
                    size="xs"
                    disabled={!bossSlug}
                    onClick={bossStartModal.open}
                  >
                    Start Boss Battle
                  </GradientButtonSecondary>
                </Group>
              </Stack>
            )}
          </ForumPanel>
          )}

          {saved && (
            <Text fz={14} c="green.0" role="status" aria-live="polite">
              Changes saved.
            </Text>
          )}
          {saveError && (
            <Text fz={14} c="red.4" role="status" aria-live="polite">
              {saveError}
            </Text>
          )}
          <Group justify="space-between">
            <GradientButtonSecondary
              radius="xl"
              variant="subtle"
              onClick={() => navigate(`/Forum/${forum}/thread/${threadId}`)}
            >
              Back to Thread
            </GradientButtonSecondary>
            <GradientButtonPrimary
              radius="xl"
              loading={saveMutation.isPending}
              onClick={() => {
                setSaved(false);
                setSaveError("");
                saveMutation.mutateAsync().catch(() => undefined);
              }}
            >
              Save Changes
            </GradientButtonPrimary>
          </Group>
        </Stack>
      </Flex>

      <ConfirmModal
        opened={archiveOpened}
        title="Reopen this thread?"
        message="The thread will move back to the open thread list and posting will reopen."
        confirmLabel="Reopen Thread"
        loading={archiveMutation.isPending}
        onConfirm={() => archiveMutation.mutateAsync()}
        onClose={archiveModal.close}
      />
      <CloseThreadModal
        opened={closeOpened}
        onClose={closeModal.close}
        forum={forum}
        thread={thread}
      />
      <ConfirmModal
        opened={bossStartOpened}
        title="Start the boss battle?"
        message="An announcement will be posted into the thread and balls will be disabled for everyone except excluded players until the battle ends."
        confirmLabel="Start Boss Battle"
        loading={bossStartMutation.isPending}
        onConfirm={() => bossStartMutation.mutateAsync()}
        onClose={bossStartModal.close}
      />
      <ConfirmModal
        opened={bossEndOpened}
        title="End the boss battle?"
        message="An end-of-battle announcement will be posted into the thread and item usage will return to normal."
        confirmLabel="End Boss Battle"
        loading={bossEndMutation.isPending}
        onConfirm={() => bossEndMutation.mutateAsync()}
        onClose={bossEndModal.close}
      />
    </Container>
  );
}
