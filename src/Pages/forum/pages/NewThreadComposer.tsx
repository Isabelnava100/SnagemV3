import {
  Anchor,
  Box,
  Button,
  Checkbox,
  Container,
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
  Title,
  Tooltip,
  UnstyledButton,
  type ButtonProps,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import OnboardingChecklist, {
  useOnboardingStatus,
} from "../../../components/onboarding/OnboardingChecklist";
import CharactersPanel from "../components/composer/CharactersPanel";
import { EncounterSetupPanel } from "../components/composer/EncounterPanels";
import { PollBuilderPanel } from "../components/composer/PostActionsPanel";
import { ForumPanel, GameResultText, PanelHint } from "../components/ui";
import "../forum.css";

// Redesign tokens (cinematic game-site language, from redesign.css / the mockup).
const DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const HEADER_GRADIENT = "linear-gradient(90deg,#762B77 7%,#17F1F0 66%)";
const CTA_CLIP = "polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)";

// Dark inputs shared across the composer fields (bg #0e0d11, subtle border).
const fieldStyles = {
  input: { background: "#0e0d11", borderColor: "#2a2637", color: "#fff" },
  label: { color: "#fff", fontWeight: 700, marginBottom: 4 },
  description: { color: "#8f8a99" },
};

/** Numbered gradient-headed step panel from the "Make a New Thread" mockup. */
function StepPanel(props: { n: string; title: string; children: React.ReactNode }) {
  const { isOverSm } = useMediaQuery();
  return (
    <Box style={{ border: "1px solid #2a2637", overflow: "hidden" }}>
      <Flex
        align="center"
        gap={14}
        style={{ background: HEADER_GRADIENT, padding: isOverSm ? "14px 26px" : "12px 18px" }}
      >
        <Text fz={15} fw={700} style={{ fontFamily: DISPLAY, color: "rgba(255,255,255,0.75)" }}>
          {props.n}
        </Text>
        <Text
          component="h2"
          fz={16}
          fw={700}
          c="#fff"
          tt="uppercase"
          style={{ fontFamily: DISPLAY, letterSpacing: "0.14em", margin: 0 }}
        >
          {props.title}
        </Text>
      </Flex>
      <Box style={{ background: "#17151c", padding: isOverSm ? "26px 30px" : "20px 16px" }}>
        {props.children}
      </Box>
    </Box>
  );
}

/** More-options sub-card: dark panel capped by a colored Quantico kicker. */
function OptionCard(props: { accent: string; title: string; children: React.ReactNode }) {
  const { isOverSm } = useMediaQuery();
  return (
    <Box
      style={{
        background: "#17151c",
        border: "1px solid #2a2637",
        padding: isOverSm ? "24px 28px" : "18px 16px",
      }}
    >
      <Stack gap={16}>
        <Text
          component="h3"
          fz={14}
          fw={700}
          tt="uppercase"
          style={{ fontFamily: DISPLAY, letterSpacing: "0.16em", color: props.accent, margin: 0 }}
        >
          {props.title}
        </Text>
        {props.children}
      </Stack>
    </Box>
  );
}

/** Angled clip-path CTA (red fill or ghost outline) with Mantine loading state. */
function ClipButton(
  props: { tone: "red" | "outline"; children: React.ReactNode } & ButtonProps &
    React.HTMLAttributes<HTMLButtonElement>
) {
  const { tone, children, ...rest } = props;
  const base = {
    fontFamily: DISPLAY,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    borderRadius: 0,
    height: 46,
    clipPath: CTA_CLIP,
  };
  if (tone === "red") {
    return (
      <Button
        {...rest}
        styles={{
          root: {
            ...base,
            "--button-bg": "#E54156",
            "--button-hover": "#FFD074",
            "--button-color": "#fff",
            paddingLeft: 30,
            paddingRight: 30,
          },
        }}
        sx={{ "&:hover": { color: "#1A1B1E !important" } }}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button
      {...rest}
      variant="outline"
      color="gray"
      styles={{
        root: {
          ...base,
          "--button-bd": "1.5px solid rgba(255,255,255,0.4)",
          "--button-color": "#fff",
          color: "#fff",
          paddingLeft: 26,
          paddingRight: 26,
        },
      }}
      sx={{ "&:hover": { background: "rgba(255,255,255,0.06)", borderColor: "#fff" } }}
    >
      {children}
    </Button>
  );
}

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
  const [noXp, setNoXp] = React.useState(false);
  const [allowTeamChanges, setAllowTeamChanges] = React.useState(false);
  const [weather, setWeather] = React.useState<string | null>(null);
  const [characters, setCharacters] = React.useState<PostCharacter[]>([]);
  const [encounterConfig, setEncounterConfig] = React.useState<EncounterConfig | null>(null);
  const [poll, setPoll] = React.useState<ThreadPoll | null>(null);
  const [html, setHtml] = React.useState("");
  const [error, setError] = React.useState("");
  const [draftMessage, setDraftMessage] = React.useState("");
  const [attachSignature, setAttachSignature] = React.useState(true);
  const [xpOverride, setXpOverride] = React.useState<XPDefaults | null>(null);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const canAdjustXP = isAdmin(user) || hasCapability(user, Capability.AdjustXP);
  // Pinning is admin-only server-side (publishForumThread), so only offer it
  // to admins; hosting directors got a silently-ignored radio before.
  const canPin = isAdmin(user);
  // Staff-created roleplays can override the site default XP settings. XP
  // always applies per post; the old instant-vs-at-close choice is retired.
  const canHostRoleplay = canCurateThreads(user);
  const [useDefaultXp, setUseDefaultXp] = React.useState(true);
  const onboarding = useOnboardingStatus();

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
      if (typeof s.allowTeamChanges === "boolean") setAllowTeamChanges(s.allowTeamChanges);
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
        noXp,
        allowTeamChanges,
        weather,
        poll,
        encounterConfig,
        characters,
        html,
        xpConfig: canAdjustXP && !useDefaultXp && xpOverride ? { ...xpOverride } : null,
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
        allowTeamChanges,
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

  // Onboarding pre-gate: a thread needs a character and a stocked team, so
  // steer new members through setup before they draft into a dead end. The
  // publish callable enforces the same rule server-side.
  if (!onboarding.loading && !onboarding.complete) {
    return (
      <Container size="sm" style={{ marginTop: 20, paddingBottom: 100 }}>
        <Title order={1} fz={isOverSm ? 30 : 20} c="white" fw={400} mb={16}>
          Almost ready to make a thread
        </Title>
        <OnboardingChecklist intro="Before starting a thread you need a character and a team with at least one pokemon. Here is where you stand:" />
      </Container>
    );
  }

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 120, maxWidth: 980 }}>
      <Stack gap={22}>
        {/* Cinematic header: back link, gold-accented display title, subtitle. */}
        <Box>
          <Anchor
            component={Link}
            to="/Forum"
            underline="never"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: DISPLAY,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#FFD074",
            }}
          >
            ← BACK TO FORUMS
          </Anchor>
          <Text
            component="h1"
            c="#fff"
            fz={isOverSm ? 34 : 24}
            fw={700}
            style={{ fontFamily: DISPLAY, letterSpacing: "0.02em", lineHeight: 1.1, margin: "14px 0 0" }}
          >
            {safariMode ? (
              <>
                LAUNCH A <span style={{ color: "#FFD074" }}>SAFARI CONTEST</span>
              </>
            ) : (
              <>
                MAKE A NEW <span style={{ color: "#FFD074" }}>THREAD</span>
              </>
            )}
          </Text>
          <Text c="#b6b1bc" fz={15} mt={10} maw={620}>
            {safariMode
              ? "Set the opening scene as your own character and team. The star pools are already attached, tweak the rest under More options if you like."
              : "Four quick steps and you are posting. Everything else already has sensible defaults, tweak them under More options if you want."}
          </Text>
        </Box>

        {/* 01 THE BASICS */}
        <StepPanel n="01" title="The Basics">
          <Stack gap={20}>
            <TextInput
              label={
                <>
                  Title <span style={{ color: "#E54156" }}>*</span>
                </>
              }
              placeholder="Title of your thread"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              required
              styles={fieldStyles}
            />
            <Flex gap={16} wrap="wrap">
              <Box style={{ flex: 1, minWidth: 240 }}>
                <Select
                  label="Where your thread will live"
                  placeholder="Choose a forum"
                  data={categories.map((c) => ({ value: c.link, label: c.label }))}
                  value={categoryLink}
                  onChange={setCategoryLink}
                  disabled={safariMode}
                  description={
                    safariMode
                      ? "Safari Contests are always Events."
                      : "Not sure? Side Stories is the open playground. The Charter explains each forum."
                  }
                  styles={fieldStyles}
                />
              </Box>
              <Box style={{ flex: 1, minWidth: 240 }}>
                <TagsInput
                  label={
                    <>
                      Tags <span style={{ color: "#8f8a99", fontWeight: 400 }}>(optional)</span>
                    </>
                  }
                  placeholder="Type a tag and press Enter"
                  value={tags}
                  onChange={setTags}
                  description="Extra words that make the thread easier to find via search."
                  styles={fieldStyles}
                />
              </Box>
            </Flex>
          </Stack>
        </StepPanel>

        {/* 02 ENCOUNTERS (shared encounter picker, or Safari summary in safari mode) */}
        {safariMode ? (
          <ForumPanel title="Safari Contest">
            {safariConfig ? (
              <Stack gap={8}>
                <Text fz={16} fw={700} c="white">
                  {safariConfig.name}
                </Text>
                <PanelHint>
                  Launching creates this Event thread with the confirmed star pools attached.
                  Players roll a wild Pokemon, then fight, feed a berry or throw a ball. Post the
                  opening scene below as your own character and team, like any thread.
                </PanelHint>
                <Stack gap={2}>
                  {safariConfig.tiers.map((t) => (
                    <Text key={t.star} fz={14} c="dimmed">
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

        {/* 03 WHO IS POSTING (shared characters + team picker) */}
        <CharactersPanel value={characters} onChange={setCharacters} />

        {/* 04 WRITE YOUR POST */}
        <StepPanel n="04" title="Write Your Post">
          <Stack gap={16}>
            <Editor editor={editor} />
            <Checkbox
              label="Attach my signature"
              color="#12B7B6"
              checked={attachSignature}
              onChange={(e) => setAttachSignature(e.currentTarget.checked)}
              styles={{ label: { color: "#fff", fontSize: 15 } }}
            />
          </Stack>
        </StepPanel>

        {/* MORE OPTIONS expander */}
        <UnstyledButton
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            background: "#17151c",
            border: "1px solid #2a2637",
            padding: isOverSm ? "18px 26px" : "16px 18px",
            textAlign: "left",
          }}
        >
          <Stack gap={4}>
            <Text
              fz={15}
              fw={700}
              c="#fff"
              tt="uppercase"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.14em" }}
            >
              More Options
            </Text>
            <Text fz={14} c="#8f8a99">
              {moreOpen
                ? "Access, battle settings, rewards, polls."
                : "Anyone can post, no weather, default XP. Fine for most threads."}
            </Text>
          </Stack>
          <Text
            fz={14}
            fw={700}
            c="#FFD074"
            style={{ fontFamily: DISPLAY, letterSpacing: "0.1em", flex: "none" }}
          >
            {moreOpen ? "HIDE ▴" : "SHOW ▾"}
          </Text>
        </UnstyledButton>

        {moreOpen && (
          <Box style={{ borderLeft: "3px solid #772976", paddingLeft: isOverSm ? 22 : 14 }}>
            <Stack gap={22}>
              {/* Who can post */}
              <OptionCard accent="#FFD074" title="Who Can Post">
                <Text fz={14} c="#8f8a99" style={{ lineHeight: 1.6 }}>
                  Aside from you as host. You can change this later, it never limits who can read.
                </Text>
                <Radio.Group
                  value={restricted ? "limit" : "anyone"}
                  onChange={(v) => setRestricted(v === "limit")}
                >
                  <Group gap={24}>
                    <Radio
                      value="anyone"
                      label="Allow anyone"
                      color="#E54156"
                      styles={{ label: { color: "#fff", fontWeight: 700 } }}
                    />
                    <Radio
                      value="limit"
                      label="Limit who can post"
                      color="#E54156"
                      styles={{ label: { color: "#fff", fontWeight: 700 } }}
                    />
                  </Group>
                </Radio.Group>
                {restricted && (
                  <MultiSelect
                    placeholder="Type member names to allow"
                    searchable
                    data={(allUsers ?? [])
                      .map((u) => u.username)
                      .filter(Boolean)
                      .map((username) => ({ value: username, label: username }))}
                    value={allowedPosters}
                    onChange={setAllowedPosters}
                    styles={fieldStyles}
                  />
                )}
                {canPin && (
                  <Checkbox
                    label={
                      <>
                        Pin this thread to the top of its forum{" "}
                        <span style={{ color: "#8f8a99" }}>(staff)</span>
                      </>
                    }
                    color="#E54156"
                    checked={pinned}
                    onChange={(e) => setPinned(e.currentTarget.checked)}
                    styles={{ label: { color: "#fff", fontSize: 15 } }}
                    style={{ borderTop: "1px solid #232028", paddingTop: 16 }}
                  />
                )}
              </OptionCard>

              {/* Battle settings */}
              <OptionCard accent="#12B7B6" title="Battle Settings">
                <Select
                  label={
                    <>
                      Weather{" "}
                      <span style={{ color: "#8f8a99", fontWeight: 400 }}>
                        (optional, battle flavor)
                      </span>
                    </>
                  }
                  description="Favors matching attack types in battles here: sun boosts Fire/Grass, rain boosts Water/Electric, sandstorm boosts Rock/Ground/Steel, snow boosts Ice."
                  placeholder="No weather"
                  clearable
                  data={[
                    { value: "sun", label: "Harsh sun" },
                    { value: "rain", label: "Rain" },
                    { value: "sandstorm", label: "Sandstorm" },
                    { value: "snow", label: "Snow" },
                  ]}
                  value={weather}
                  onChange={setWeather}
                  maw={360}
                  styles={fieldStyles}
                />
                <Tooltip
                  multiline
                  w={280}
                  withArrow
                  label="Normally each member is locked to the team they bring in their first post here, and battle damage sticks to those pokemon. Check this to let members swap teams between posts. This choice is only available now, at creation."
                >
                  <Checkbox
                    label="Members may change teams between posts"
                    checked={allowTeamChanges}
                    onChange={(e) => setAllowTeamChanges(e.currentTarget.checked)}
                    color="#12B7B6"
                    styles={{ label: { color: "#fff", fontSize: 15 } }}
                  />
                </Tooltip>
              </OptionCard>

              {/* Rewards & XP */}
              <OptionCard accent="#E54156" title="Rewards & XP">
                <Text fz={14} c="#8f8a99" style={{ lineHeight: 1.6 }}>
                  Experience and stats are awarded automatically to each team pokemon as people
                  post. Items and coins are reviewed by an admin when the thread closes.
                </Text>
                {canHostRoleplay && (
                  <Checkbox
                    label={
                      <>
                        Use the default experience settings{" "}
                        <span style={{ color: "#8f8a99" }}>(recommended)</span>
                      </>
                    }
                    color="#12B7B6"
                    checked={useDefaultXp}
                    onChange={(e) => setUseDefaultXp(e.currentTarget.checked)}
                    styles={{ label: { color: "#fff", fontSize: 15 } }}
                  />
                )}
                {canAdjustXP && !useDefaultXp && (
                  <Stack gap={8}>
                    <Text fz={14} c="#8f8a99" style={{ lineHeight: 1.6 }}>
                      Points each team pokemon earns per qualifying post in this thread. Leave as the
                      site defaults or override per stat.
                    </Text>
                    {XP_STAT_FIELDS.map((stat) => (
                      <Group gap={6} key={stat.key} justify="space-between" maw={280}>
                        <Text fz={14} c="#fff">
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
                          styles={fieldStyles}
                        />
                      </Group>
                    ))}
                    <Group gap={6} justify="space-between" maw={280}>
                      <Text fz={14} c="#fff">
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
                        styles={fieldStyles}
                      />
                    </Group>
                  </Stack>
                )}
                <Tooltip
                  multiline
                  w={280}
                  withArrow
                  label="Posts here will not give any experience, friendship, shadow or purification. Team lock is also off. Good for casual or non-canon roleplay. An admin can still hand out bonuses when the thread closes."
                >
                  <Checkbox
                    label="Posting in this thread does not give experience or stats"
                    checked={noXp}
                    onChange={(e) => setNoXp(e.currentTarget.checked)}
                    color="#E54156"
                    styles={{ label: { color: "#fff", fontSize: 15 } }}
                  />
                </Tooltip>
              </OptionCard>

              {/* Extras */}
              <OptionCard accent="#c79bd6" title="Extras">
                <TextInput
                  label={
                    <>
                      Instructions for participants{" "}
                      <span style={{ color: "#8f8a99", fontWeight: 400 }}>(optional)</span>
                    </>
                  }
                  placeholder="Optional instructions for participants"
                  value={instructions}
                  onChange={(e) => setInstructions(e.currentTarget.value)}
                  styles={fieldStyles}
                />
              </OptionCard>

              {/* Poll builder (shared panel) */}
              <PollBuilderPanel value={poll} onChange={setPoll} />
            </Stack>
          </Box>
        )}

        {error && <GameResultText>{error}</GameResultText>}
        {draftMessage && (
          <Text fz={14} c="#3ACCCB" role="status" aria-live="polite">
            {draftMessage}
          </Text>
        )}

        {/* Footer: reward note + Save Draft / Publish CTAs */}
        <Flex
          align="center"
          justify="space-between"
          gap={20}
          wrap="wrap"
          style={{
            background: "#141318",
            border: "1px solid #2a2637",
            borderLeft: "3px solid #FFD074",
            padding: isOverSm ? "20px 26px" : "18px 16px",
          }}
        >
          <Text fz={14} c="#b6b1bc" style={{ lineHeight: 1.5, maxWidth: 440 }}>
            Your roleplay rewards will be sent over after the thread is closed and approved by an
            admin.
          </Text>
          <Group gap={12} wrap="wrap">
            <ClipButton
              tone="outline"
              loading={draftMutation.isPending}
              onClick={() => draftMutation.mutateAsync()}
            >
              Save Your Draft
            </ClipButton>
            <ClipButton tone="red" loading={publishMutation.isPending} onClick={handlePublish}>
              {safariMode ? "Launch Contest" : "Publish Post"}
            </ClipButton>
          </Group>
        </Flex>
      </Stack>
    </Container>
  );
}
