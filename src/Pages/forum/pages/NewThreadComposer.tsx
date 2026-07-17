import {
  Box,
  Checkbox,
  Container,
  Divider,
  Grid,
  Group,
  MultiSelect,
  NumberInput,
  Radio,
  Select,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import GradientButtonPrimary, {
  GradientButtonSecondary,
} from "../../../components/common/GradientButton";
import Editor, { useRichTextEditor } from "../../../components/editor/Editor";
import { Capability } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { canCurateThreads, hasCapability, isAdmin } from "../../../lib/permissions";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { getUsers } from "../../../queries/admin";
import { XPDefaults, XP_STAT_FIELDS, getXPDefaults } from "../../../queries/game";
import { creatableCategories } from "../config";
import { callStartSafariContest, callableMessage } from "../functionsClient";
import { getSafariZoneById } from "../../../queries/safari";
import {
  DRAFT_WARNING_AT,
  MAX_DRAFTS,
  deleteDraft,
  publishThread,
  saveDraft,
} from "../mutations";
import { getDraft } from "../queries";
import { ComposerDraftSettings, EncounterConfig, PostCharacter, ThreadPoll } from "../types";
import CharactersPanel from "../components/composer/CharactersPanel";
import { EncounterSetupPanel } from "../components/composer/EncounterPanels";
import { PollBuilderPanel } from "../components/composer/PostActionsPanel";
import { ForumPanel, GameResultText, PanelHint } from "../components/ui";
import "../forum.css";

export default function NewThreadComposer() {
  const { forum } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOverSm } = useMediaQuery();

  const [searchParams] = useSearchParams();
  // Safari Contest launch: arrives from Admin -> Safari Contest with ?safari=1.
  // The thread is created through startSafariContest (Event forum, star pools
  // baked on) instead of the normal publish path.
  const safariMode = searchParams.get("safari") === "1";
  const safariZoneId = searchParams.get("zone");
  const { data: safariConfig } = useQuery({
    queryKey: ["safari-zone", safariZoneId],
    queryFn: () => getSafariZoneById(safariZoneId),
    enabled: safariMode,
  });

  const categories = creatableCategories(user);
  const [categoryLink, setCategoryLink] = React.useState<string | null>(
    safariMode ? "Events" : categories.some((c) => c.link === forum) ? (forum as string) : null
  );
  const [title, setTitle] = React.useState("");
  const [pinned, setPinned] = React.useState(false);
  const [restricted, setRestricted] = React.useState(false);
  const [allowedPosters, setAllowedPosters] = React.useState<string[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [instructions, setInstructions] = React.useState("");
  const [characters, setCharacters] = React.useState<PostCharacter[]>([]);
  const [encounterConfig, setEncounterConfig] = React.useState<EncounterConfig | null>(null);
  const [poll, setPoll] = React.useState<ThreadPoll | null>(null);
  const [html, setHtml] = React.useState("");
  const [error, setError] = React.useState("");
  const [draftMessage, setDraftMessage] = React.useState("");
  const [attachSignature, setAttachSignature] = React.useState(true);
  const [xpOverride, setXpOverride] = React.useState<XPDefaults | null>(null);
  const canAdjustXP = isAdmin(user) || hasCapability(user, Capability.AdjustXP);
  const canPin = canCurateThreads(user);
  // Staff-created roleplays choose when XP is served (instant vs at close) and
  // whether to use the site default XP settings.
  const canHostRoleplay = canCurateThreads(user);
  const [xpAward, setXpAward] = React.useState<"instant" | "onClose">("instant");
  const [useDefaultXp, setUseDefaultXp] = React.useState(true);

  // Site-wide XP defaults, shown as the panel's starting values.
  const { data: xpDefaults } = useQuery({
    queryKey: ["xp-defaults"],
    queryFn: getXPDefaults,
    enabled: canAdjustXP,
  });

  const editor = useRichTextEditor({
    onUpdate: ({ editor: e }) => setHtml(e.getHTML()),
  });

  // Continue a saved draft from Dashboard → Drafts (?draft=<id>).
  const draftId = searchParams.get("draft");
  const [draftLoaded, setDraftLoaded] = React.useState(false);
  const { data: draft } = useQuery({
    queryKey: ["forum-draft", user?.uid, draftId],
    queryFn: () => getDraft(user!.uid, draftId!),
    enabled: !!user && !!draftId,
  });
  React.useEffect(() => {
    if (!editor || editor.isDestroyed || !draft || draftLoaded) return;
    if (draft.title_thread) setTitle(draft.title_thread);
    const content = draft.long_text || "";
    // Tiptap 3 can throw parsing legacy/malformed draft HTML, so never let that
    // crash the composer; fall back to a clean editor so editing still works.
    try {
      editor.commands.setContent(content);
      setHtml(content);
    } catch {
      editor.commands.clearContent();
      setHtml("");
    }
    // Restore the rest of the roleplay settings saved with this draft.
    const s = draft.settings as ComposerDraftSettings | undefined;
    if (s) {
      if (s.categoryLink && categories.some((c) => c.link === s.categoryLink)) {
        setCategoryLink(s.categoryLink);
      }
      if (s.tags) setTags(s.tags);
      if (typeof s.instructions === "string") setInstructions(s.instructions);
      if (typeof s.pinned === "boolean") setPinned(s.pinned);
      if (typeof s.restricted === "boolean") setRestricted(s.restricted);
      if (s.allowedPosters) setAllowedPosters(s.allowedPosters);
      if (s.characters) setCharacters(s.characters);
      if (s.encounterConfig !== undefined) setEncounterConfig(s.encounterConfig);
      if (s.poll !== undefined) setPoll(s.poll);
      if (s.xpOverride !== undefined) setXpOverride(s.xpOverride as XPDefaults | null);
      if (typeof s.attachSignature === "boolean") setAttachSignature(s.attachSignature);
    }
    setDraftLoaded(true);
  }, [editor, draft, draftLoaded, categories]);

  const { data: allUsers } = useQuery({
    queryKey: ["forum-all-users"],
    queryFn: getUsers,
    enabled: restricted,
  });

  const validate = (): string => {
    if (!title.trim() || title.trim().length < 2) return "Give your thread a title.";
    if (!categoryLink) return "Pick a category for your thread.";
    if (!characters.length) return "Select at least one character.";
    if (characters.some((c) => !c.teamId)) return "Select a team for each character.";
    if (html.replace(/<[^>]*>/g, "").trim().length < 2) return "Write your first post.";
    if (encounterConfig && !encounterConfig.listId)
      return "Pick an encounter list, or turn encounters off.";
    if (poll && (!poll.question.trim() || poll.options.some((o) => !o.text.trim())))
      return "Complete the poll question and every option, or remove them.";
    return "";
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (safariMode) {
        if (!safariConfig) throw new Error("The Safari Contest settings are still loading.");
        const { threadId } = await callStartSafariContest({
          title: title.trim(),
          html,
          characters,
          config: safariConfig,
          attachSignature,
        });
        return threadId;
      }
      const threadId = await publishThread({
        forum: categoryLink!,
        title: title.trim(),
        instructions,
        tags,
        pinned: canPin && pinned,
        restricted,
        allowedPosters: restricted ? allowedPosters : [],
        poll,
        encounterConfig,
        characters,
        html,
        xpConfig: canAdjustXP && !useDefaultXp && xpOverride ? { ...xpOverride } : null,
        ...(canHostRoleplay ? { xpAward } : {}),
        attachSignature,
      });
      return threadId;
    },
    onSuccess: async (threadId) => {
      if (draftId && user) await deleteDraft(user.uid, draftId);
      navigate(`/Forum/${categoryLink}/thread/${threadId}`);
    },
    onError: (err) =>
      setError(callableMessage(err, "Something went wrong publishing your thread. Try again.")),
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      const settings: ComposerDraftSettings = {
        categoryLink,
        tags,
        instructions,
        pinned,
        restricted,
        allowedPosters,
        characters,
        encounterConfig,
        poll,
        xpOverride,
        attachSignature,
      };
      return saveDraft({
        user: user!,
        forum: categoryLink ?? "Main-Forum",
        threadId: "new-thread",
        title: title.trim() || "Untitled thread",
        characterNames: characters.map((c) => c.name).join(", "),
        html,
        settings: settings as unknown as Record<string, unknown>,
      });
    },
    onSuccess: (count) =>
      setDraftMessage(
        count >= DRAFT_WARNING_AT
          ? `Draft saved. Heads up, you have ${count}/${MAX_DRAFTS} drafts. You'll run out soon.`
          : "Draft saved. Find it under Dashboard → Drafts."
      ),
    onError: (err) =>
      setDraftMessage((err as Error).message || "Could not save the draft."),
  });

  const handlePublish = () => {
    const problem = validate();
    setError(problem);
    if (!problem) publishMutation.mutateAsync();
  };

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <Title order={1} fz={isOverSm ? 30 : 20} c="white" fw={400} mb={16}>
        {safariMode ? "Launch a Safari Contest" : "Make a New Thread"}
      </Title>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 5 }}>
          <Stack gap={16}>
            <CharactersPanel value={characters} onChange={setCharacters} />

            <ForumPanel title="Forum Details">
              <Stack gap={12}>
                <TextInput
                  label="Title"
                  placeholder="Title of your thread"
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  required
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />

                <Box>
                  <PanelHint>Select where your thread will be located.</PanelHint>
                  {canPin && (
                    <Radio.Group
                      value={pinned ? "pin" : "nopin"}
                      onChange={(v) => setPinned(v === "pin")}
                      mb={8}
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
                  <Select
                    placeholder="Location or Category for the Thread"
                    data={categories.map((c) => ({ value: c.link, label: c.label }))}
                    value={categoryLink}
                    onChange={setCategoryLink}
                    disabled={safariMode}
                    description={safariMode ? "Safari Contests are always Events." : undefined}
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                </Box>

                <Divider color="#4a464a" />

                <Box>
                  <Text fz={12} fw={700} c="white" tt="uppercase">
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
                      data={(allUsers ?? [])
                        .map((u) => u.username)
                        .filter(Boolean)
                        .map((username) => ({ value: username, label: username }))}
                      value={allowedPosters}
                      onChange={setAllowedPosters}
                      styles={{ input: { background: "#2E2D2E" } }}
                    />
                  )}
                </Box>

                <Divider color="#4a464a" />

                <Box>
                  <Text fz={12} fw={700} c="white" tt="uppercase">
                    Tags
                  </Text>
                  <PanelHint>
                    Add additional words to make the thread easier to find via search.
                  </PanelHint>
                  <TagsInput
                    placeholder="Type a tag and press Enter"
                    value={tags}
                    onChange={setTags}
                    styles={{ input: { background: "#2E2D2E" } }}
                  />
                </Box>

                <Divider color="#4a464a" />

                <TextInput
                  label="Instructions"
                  placeholder="Optional instructions for participants"
                  value={instructions}
                  onChange={(e) => setInstructions(e.currentTarget.value)}
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />
              </Stack>
            </ForumPanel>

            <PollBuilderPanel value={poll} onChange={setPoll} />

            {/* Reward settings: staff choose when XP is served; AdjustXP
                directors may also override the per-stat amounts. */}
            {(canHostRoleplay || canAdjustXP) && (
              <ForumPanel title="Rewards & XP">
                {canHostRoleplay && (
                  <>
                    <PanelHint>Choose when the experience rewards are given out.</PanelHint>
                    <Radio.Group
                      value={xpAward}
                      onChange={(v) => setXpAward(v === "instant" ? "instant" : "onClose")}
                    >
                      <Stack gap={4}>
                        <Radio value="instant" label="Award instantly as people post" color="pink.0" size="xs" />
                        <Radio value="onClose" label="Award only after closing the thread" color="pink.0" size="xs" />
                      </Stack>
                    </Radio.Group>
                    <Checkbox
                      mt={8}
                      mb={4}
                      label="Use default settings for exp stuff"
                      color="green.0"
                      checked={useDefaultXp}
                      onChange={(e) => setUseDefaultXp(e.currentTarget.checked)}
                      styles={{ label: { color: "white", fontSize: 13 } }}
                    />
                  </>
                )}
                {canAdjustXP && !useDefaultXp && (
                <>
                <PanelHint>
                  Points each team pokemon earns per qualifying post in this thread. Leave as the
                  site defaults or override per stat.
                </PanelHint>
                <Stack gap={8}>
                  {XP_STAT_FIELDS.map((stat) => (
                    <Group gap={6} key={stat.key} justify="space-between" maw={280}>
                      <Text fz={12} c="white">
                        {stat.label} per post:
                      </Text>
                      <NumberInput
                        value={(xpOverride ?? xpDefaults)?.[stat.key] ?? 0}
                        onChange={(v) =>
                          setXpOverride({
                            ...((xpOverride ?? xpDefaults) as XPDefaults),
                            [stat.key]: Math.max(0, Number(v) || 0),
                          })
                        }
                        min={0}
                        w={90}
                        size="xs"
                        styles={{ input: { background: "#2E2D2E" } }}
                      />
                    </Group>
                  ))}
                  <Group gap={6} justify="space-between" maw={280}>
                    <Text fz={12} c="white">
                      Minimum post length:
                    </Text>
                    <NumberInput
                      value={(xpOverride ?? xpDefaults)?.minPostLength ?? 0}
                      onChange={(v) =>
                        setXpOverride({
                          ...((xpOverride ?? xpDefaults) as XPDefaults),
                          minPostLength: Math.max(0, Number(v) || 0),
                        })
                      }
                      min={0}
                      w={90}
                      size="xs"
                      styles={{ input: { background: "#2E2D2E" } }}
                    />
                  </Group>
                </Stack>
                </>
                )}
              </ForumPanel>
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 7 }}>
          <Stack gap={16}>
            {safariMode ? (
              <ForumPanel title="Safari Contest">
                {safariConfig ? (
                  <Stack gap={8}>
                    <Text fz={15} fw={700} c="white">
                      {safariConfig.name}
                    </Text>
                    <PanelHint>
                      Launching creates this Event thread with the confirmed star pools attached.
                      Players roll a wild Pokemon, then fight, feed a berry or throw a ball. Post the
                      opening scene below as your own character and team, like any thread.
                    </PanelHint>
                    <Stack gap={2}>
                      {safariConfig.tiers.map((t) => (
                        <Text key={t.star} fz={12} c="dimmed">
                          {"★".repeat(t.star)} {t.star} Star: rate {t.rate}, {t.pokemons.length} pokemon,{" "}
                          {t.postsToDefeat} posts to defeat
                        </Text>
                      ))}
                    </Stack>
                    <PanelHint>
                      Change any of this in Admin, Manage, Safari Contest before you launch.
                    </PanelHint>
                  </Stack>
                ) : (
                  <PanelHint>Loading the Safari Contest settings...</PanelHint>
                )}
              </ForumPanel>
            ) : (
              <EncounterSetupPanel value={encounterConfig} onChange={setEncounterConfig} />
            )}

            <ForumPanel title="Write Your Post">
              <Editor editor={editor} />
            </ForumPanel>

            <Checkbox
              label="Attach Signature"
              color="green.0"
              checked={attachSignature}
              onChange={(e) => setAttachSignature(e.currentTarget.checked)}
              styles={{ label: { color: "white", fontSize: 13 } }}
            />
            <Text fz={12} c="dimmed">
              Your roleplay rewards will be sent over after the thread is closed
              and approved by an admin.
            </Text>

            {error && <GameResultText>{error}</GameResultText>}
            {draftMessage && (
              <Text fz={13} c="green.0">
                {draftMessage}
              </Text>
            )}

            <Group justify="space-between">
              <GradientButtonSecondary
                radius="xl"
                loading={draftMutation.isPending}
                onClick={() => draftMutation.mutateAsync()}
              >
                Save Your Draft
              </GradientButtonSecondary>
              <GradientButtonPrimary
                radius="xl"
                loading={publishMutation.isPending}
                onClick={handlePublish}
              >
                Publish Post
              </GradientButtonPrimary>
            </Group>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
