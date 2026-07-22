import {
  Anchor,
  Avatar,
  Box,
  Button,
  Checkbox,
  Container,
  Flex,
  Grid,
  Group,
  Progress,
  Select,
  Stack,
  Text,
  Title,
  type ButtonProps,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Editor, { useRichTextEditor } from "../../../components/editor/Editor";
import { SectionLoader } from "../../../components/navigation/loading";
import { useAuth } from "../../../context/AuthContext";
import { getPokemonImageURL } from "../../../helpers";
import { getItems, getOwnedPokemons, getTeamsRaw } from "../../../queries/dashboard";
import { OwnedPokemon } from "../../../components/types/typesUsed";
import { PokemonHoverCard } from "../../../components/pokemon/PokemonHoverCard";
import {
  getTrainingSession,
  logTrainingPost,
  MAX_TRAINING_POSTS,
} from "../../../queries/colosseum";
import { queryClient } from "../../../lib/react-query";
import { callableMessage } from "../functionsClient";
import {
  DRAFT_WARNING_AT,
  MAX_DRAFTS,
  deleteDraft,
  publishPost,
  saveDraft,
} from "../mutations";
import { getDraft, getPendingActions, getPost, getThread } from "../queries";
import { DiceBlock, EncounterBlock, PostCharacter, RandomBlock } from "../types";
import OnboardingChecklist, {
  useOnboardingStatus,
} from "../../../components/onboarding/OnboardingChecklist";
import CharactersPanel from "../components/composer/CharactersPanel";
import EvolutionPanel from "../components/composer/EvolutionPanel";
import MegaPanel from "../components/composer/MegaPanel";
import ZPanel from "../components/composer/ZPanel";
import BattleItemsPanel from "../components/composer/BattleItemsPanel";
import { EncounterPostPanel } from "../components/composer/EncounterPanels";
import UseItemsPanel, {
  ItemSelection,
  UsedItemsPanel,
} from "../components/composer/ItemsPanel";
import { PostActionsPanel } from "../components/composer/PostActionsPanel";
import { ForumPanel, GameResultText, PanelHint } from "../components/ui";
import {
  DEFAULT_HP_SCALING,
  STAR_ATTACK_DAMAGE,
  fleeChanceForStar,
  maxHpForLevel,
  postsToBeatStar,
  starForDex,
} from "../../../lib/encounterStars";
import { levelProgress } from "../../../lib/leveling";
import { pokemonData } from "../../../data/pokemon";
import { getBattleConfig } from "../../../queries/game";
import {
  effectivenessLabel,
  typeEffectiveness,
  typesForDex,
  weatherMultiplier,
} from "../../../lib/typeChart";
import { userMayPost } from "./ThreadView";
import "../forum.css";

// Redesign tokens (cinematic game-site language, shared with NewThreadComposer).
const DISPLAY = "var(--font-display, 'Quantico', sans-serif)";
const HEADER_GRADIENT = "linear-gradient(90deg,#762B77 7%,#17F1F0 66%)";
const CTA_CLIP = "polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)";

/** Gradient-headed panel from the composer mockup (optional leading numeral). */
function StepPanel(props: { title: string; n?: string; children: React.ReactNode }) {
  return (
    <Box style={{ border: "1px solid #2a2637", overflow: "hidden" }}>
      <Flex align="center" gap={14} style={{ background: HEADER_GRADIENT, padding: "14px 26px" }}>
        {props.n && (
          <Text fz={15} fw={700} style={{ fontFamily: DISPLAY, color: "rgba(255,255,255,0.75)" }}>
            {props.n}
          </Text>
        )}
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
      <Box style={{ background: "#17151c", padding: "20px" }}>{props.children}</Box>
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

/**
 * Post composer, used both for a new reply (Publish Reply) and for editing an
 * existing post (Publish Edits). Core rule from the board: once an item,
 * encounter or action has been submitted it cannot be edited or changed;
 * before submitting everything can be added, edited or removed freely.
 * Rolls/encounters come from the server and bind to this thread until
 * published; publishing itself runs through a Cloud Function transaction.
 */
export default function PostComposer(props: { mode: "new" | "edit" }) {
  const { mode } = props;
  const { forum: forumParam, id: threadId, postId } = useParams();
  const forum = forumParam ?? "Main-Forum";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const onboarding = useOnboardingStatus();

  const [characters, setCharacters] = React.useState<PostCharacter[]>([]);
  const [encounter, setEncounter] = React.useState<EncounterBlock | null>(null);
  const [itemSelections, setItemSelections] = React.useState<ItemSelection[]>([]);
  const [dice, setDice] = React.useState<DiceBlock | null>(null);
  const [random, setRandom] = React.useState<RandomBlock | null>(null);
  const [html, setHtml] = React.useState("");
  const [error, setError] = React.useState("");
  const [draftMessage, setDraftMessage] = React.useState("");
  const [attachSignature, setAttachSignature] = React.useState(true);
  const [attackBoss, setAttackBoss] = React.useState(false);
  const [safariAction, setSafariAction] = React.useState<"fight" | "berry" | "ball">("fight");
  const [fleeAttempt, setFleeAttempt] = React.useState(false);
  const [fighterId, setFighterId] = React.useState<string | null>(null);
  const [evolve, setEvolve] = React.useState<{ pokemonId: string; toIdx: number } | null>(null);
  // Mega Evolution for this post only (stone required, never consumed).
  const [mega, setMega] = React.useState<{ pokemonId: string; stone: string } | null>(null);
  // Z-Move for this post only (crystal required, never consumed).
  const [zmove, setZmove] = React.useState<{ pokemonId: string; itemId: string } | null>(null);
  // Consumable battle items (X items / Dire Hit / Gems) spent this post.
  const [battleItems, setBattleItems] = React.useState<{ itemId: string; name: string }[]>([]);
  const [loadedEdit, setLoadedEdit] = React.useState(false);

  const editor = useRichTextEditor({
    onUpdate: ({ editor: e }) => setHtml(e.getHTML()),
  });

  const { data: thread, isPending: threadPending } = useQuery({
    queryKey: ["forum-thread", forum, threadId],
    queryFn: () => getThread(forum, threadId!),
    enabled: !!threadId,
  });

  const { data: editingPost } = useQuery({
    queryKey: ["forum-post", forum, threadId, postId],
    queryFn: () => getPost(forum, threadId!, postId!),
    enabled: mode === "edit" && !!postId,
  });

  const quoteId = searchParams.get("quote");
  const { data: quotedPost } = useQuery({
    queryKey: ["forum-post", forum, threadId, quoteId],
    queryFn: () => getPost(forum, threadId!, quoteId!),
    enabled: mode === "new" && !!quoteId,
  });

  const draftId = searchParams.get("draft");
  const { data: draft } = useQuery({
    queryKey: ["forum-draft", user?.uid, draftId],
    queryFn: () => getDraft(user!.uid, draftId!),
    enabled: mode === "new" && !!user && !!draftId,
  });

  // Training-post mode: arriving from the Colosseum Training Room carries the
  // target pokemon id. Publishing also logs the post against the member's
  // daily training window (max 10 posts).
  const trainingTargetId = searchParams.get("training");
  const trainingPartner = searchParams.get("partner") === "1";
  const trainingActive = mode === "new" && !!thread?.trainingLog && !!trainingTargetId;

  const { data: trainingSession } = useQuery({
    queryKey: ["training-session", user?.uid],
    queryFn: () => getTrainingSession(user!.uid),
    enabled: trainingActive && !!user,
  });
  const { data: ownedForTraining } = useQuery({
    queryKey: ["owned-pokemons", user?.uid],
    queryFn: () => getOwnedPokemons(user!.uid),
    enabled: !!user,
  });
  const { data: teamsRaw } = useQuery({
    queryKey: ["teams-raw", user?.uid],
    queryFn: () => getTeamsRaw(user!.uid),
    enabled: !!user,
  });
  const trainingTarget = (ownedForTraining?.sortedData ?? []).find(
    (p) => p.id === trainingTargetId
  );

  // The owned pokemon on the teams brought into this post (for evolve-on-post).
  const evoTeamPokemon = React.useMemo<OwnedPokemon[]>(() => {
    if (!ownedForTraining || !teamsRaw) return [];
    const byId = new Map(ownedForTraining.sortedData.map((p) => [p.id, p]));
    const teamById = new Map(teamsRaw.map((t) => [t.id, t]));
    const ids = new Set<string>();
    characters.forEach((c) => {
      if (!c.teamId) return;
      (teamById.get(c.teamId)?.pokemon_ids ?? []).forEach((id) => ids.add(id));
    });
    return [...ids].map((id) => byId.get(id)).filter(Boolean) as OwnedPokemon[];
  }, [ownedForTraining, teamsRaw, characters]);
  const trainingToday = new Date().toISOString().slice(0, 10);
  const trainingPostsLogged =
    trainingSession?.date === trainingToday ? trainingSession?.postsLogged ?? 0 : 0;
  const trainingAtCap = trainingActive && trainingPostsLogged >= MAX_TRAINING_POSTS;
  const trainingOnLastPost = trainingActive && trainingPostsLogged === MAX_TRAINING_POSTS - 1;

  const { data: inventory } = useQuery({
    queryKey: ["get-items", user?.uid],
    queryFn: () => getItems(user!.uid),
    enabled: !!user,
  });

  // Server-rolled results already bound to this thread (e.g. after a page
  // reload mid-compose), they must attach to the next published post.
  const { data: pending } = useQuery({
    queryKey: ["forum-pending", forum, threadId, user?.uid],
    queryFn: () => getPendingActions(forum, threadId!, user!.uid),
    enabled: !!user && !!threadId,
  });
  React.useEffect(() => {
    if (!pending) return;
    if (pending.dice) setDice(pending.dice);
    if (pending.random) setRandom(pending.random);
    // Per-character: hydrate from the first active encounter in the map, else
    // the legacy single encounter. (The full multi-character composer follows.)
    const firstActive = pending.encounters ? Object.values(pending.encounters)[0] : undefined;
    if (firstActive) setEncounter(firstActive);
    else if (pending.encounter) setEncounter(pending.encounter);
  }, [pending]);

  // Preload content when editing; prepend the quote when quoting.
  React.useEffect(() => {
    if (!editor || editor.isDestroyed || loadedEdit) return;
    // Tiptap 3 can throw parsing legacy/malformed stored HTML, so guard every
    // setContent so a bad draft/post can't crash the composer.
    const load = (content: string): boolean => {
      try {
        editor.commands.setContent(content);
        setHtml(editor.getHTML());
        return true;
      } catch {
        editor.commands.clearContent();
        setHtml("");
        return true;
      }
    };
    if (mode === "edit" && editingPost) {
      load(editingPost.text);
      setCharacters(editingPost.characters ?? []);
      setLoadedEdit(true);
    }
    if (mode === "new" && quotedPost) {
      load(
        `<blockquote><strong>${quotedPost.owner} wrote:</strong>${quotedPost.text}</blockquote><p></p>`
      );
      setLoadedEdit(true);
    }
    if (mode === "new" && draft) {
      load(draft.long_text || "");
      setLoadedEdit(true);
    }
    if (mode === "new" && !quoteId && !draftId && trainingActive && trainingTarget) {
      const label =
        trainingTarget.name && trainingTarget.name !== trainingTarget.species
          ? `${trainingTarget.name} (${trainingTarget.species})`
          : trainingTarget.species || trainingTarget.name;
      load(
        `<p><em>Super Training Room session: training ${label}, ${
          trainingPartner ? "partner" : "solo"
        } window.</em></p><p></p>`
      );
      setLoadedEdit(true);
    }
  }, [
    editor,
    editingPost,
    quotedPost,
    draft,
    mode,
    loadedEdit,
    quoteId,
    draftId,
    trainingActive,
    trainingTarget,
    trainingPartner,
  ]);

  const bossActive =
    !!thread?.bossBattle?.active &&
    !(thread.bossBattle.excluded ?? []).includes(user?.displayName ?? user?.username ?? "");

  // -- battle state (wild/trainer encounters outside Safari mode) ------------
  // A live battle means the enemy hits back this post, so a fighter must be
  // chosen from the team(s) brought into the post. Damage is flat against a
  // level-based max HP; scaling and per-star damage are admin-tunable.
  const { data: liveBattleCfg } = useQuery({
    queryKey: ["battle-config"],
    queryFn: getBattleConfig,
    enabled: mode === "new" && !thread?.safariContest,
  });
  const hpScaling = liveBattleCfg?.hp ?? DEFAULT_HP_SCALING;
  const starDmg = (star: number) =>
    Number(liveBattleCfg?.starDamage?.[String(star)]) ||
    STAR_ATTACK_DAMAGE[(star >= 1 && star <= 7 ? star : 3) as keyof typeof STAR_ATTACK_DAMAGE];
  const myDamage = React.useMemo(
    () => thread?.battleDamage?.[user?.uid ?? ""] ?? {},
    [thread, user]
  );
  // Pokemon Center: the post itself is the price, and the lock binds to the
  // CHARACTER visiting (their team on this post is what gets healed; the
  // member's other characters battle on unaffected). Server-enforced too.
  const [centerVisit, setCenterVisit] = React.useState(false);
  const myCharLogs = thread?.battleLog?.[user?.uid ?? ""]?.chars ?? {};
  const postCharLog = (charId: string) => {
    const l = myCharLogs[charId] ?? {};
    return {
      posts: Number(l.posts) || 0,
      lastBattle: Number(l.lastBattle) || 0,
      centerAt: Number(l.centerAt) || 0,
    };
  };
  const postCharIds = characters.map((c) => c.id);
  const centerCooldown = postCharIds.some((c) => {
    const l = postCharLog(c);
    return l.centerAt > 0 && l.posts + 1 <= l.centerAt + 1;
  });
  const charsRested =
    postCharIds.length > 0 &&
    postCharIds.every((c) => {
      const l = postCharLog(c);
      return l.lastBattle === 0 || l.lastBattle < l.posts;
    });
  const fighterPool = evoTeamPokemon.map((p) => {
    const maxHp = maxHpForLevel(levelProgress(p.experience ?? 0).level, hpScaling);
    const dmg = Math.min(maxHp, Math.max(0, myDamage[p.id] ?? 0));
    return { pokemon: p, dmg, maxHp, hpLeft: maxHp - dmg, fainted: dmg >= maxHp };
  });
  const myLockedTeams = thread?.lockedTeams?.[user?.uid ?? ""] ?? [];
  // Wipe exception: a fully fainted locked team lifts the lock so the member
  // can bring another team/character (they re-lock to the new one).
  const lockedTeamWiped = React.useMemo(() => {
    if (!myLockedTeams.length || !teamsRaw || !ownedForTraining) return false;
    const ids = myLockedTeams.flatMap(
      (tid) => teamsRaw.find((t) => t.id === tid)?.pokemon_ids ?? []
    );
    if (!ids.length) return false;
    const byId = new Map(ownedForTraining.sortedData.map((p) => [p.id, p]));
    return ids.every((id) => {
      const poke = byId.get(id);
      const maxHp = maxHpForLevel(levelProgress(poke?.experience ?? 0).level, hpScaling);
      return (myDamage[id] ?? 0) >= maxHp;
    });
  }, [myLockedTeams, teamsRaw, ownedForTraining, myDamage, hpScaling]);
  const restrictTeams =
    mode === "new" && !thread?.allowTeamChanges && myLockedTeams.length > 0 && !lockedTeamWiped
      ? myLockedTeams
      : undefined;
  const wildBattle =
    mode === "new" && !thread?.safariContest && !!encounter && !!encounter.required;
  const battleOngoing =
    wildBattle && (encounter!.progress ?? 0) < (encounter!.required ?? 1);
  const canFlee = battleOngoing && !!encounter!.catchable;
  const fighterNeeded = battleOngoing || (mode === "new" && attackBoss && bossActive);
  const enemyStar = encounter?.star ?? 3;
  // Type effectiveness both ways, from the chosen fighter's type vs the enemy's.
  const fighterTypes = (() => {
    const chosen = evoTeamPokemon.find((p) => p.id === fighterId);
    return typesForDex(chosen?.pokedex ?? 0);
  })();
  const enemyIdx = pokemonData.find((p) => p.slug === encounter?.slug)?.idx ?? 0;
  const enemyTypes = typesForDex(enemyIdx);
  const attackMult = battleOngoing ? typeEffectiveness(fighterTypes, enemyTypes) : 1;
  const defenseMult = battleOngoing ? typeEffectiveness(enemyTypes, fighterTypes) : 1;
  // Weather is deterministic, so bake it into the preview; nature, held items
  // and crits stay server-side randomness noted in the copy.
  const weatherBoost = liveBattleCfg?.mechanics?.weatherBoost ?? 1.2;
  const enemyWeatherMult = weatherMultiplier(thread?.weather ?? undefined, enemyTypes, weatherBoost);
  // Boss hit: the stored per-boss value, else its species' star damage.
  const bossHit = (() => {
    if (!(attackBoss && bossActive && thread?.bossBattle)) return 0;
    const stored = Number(thread.bossBattle.attackDamage);
    const idx = pokemonData.find((p) => p.slug === thread.bossBattle!.slug)?.idx;
    const base = stored > 0 ? stored : starDmg(starForDex(idx ?? 0));
    return Math.max(1, Math.round(base * typeEffectiveness(typesForDex(idx ?? 0), fighterTypes)));
  })();
  const hitDmg = Math.max(
    battleOngoing
      ? Math.max(1, Math.round(starDmg(enemyStar) * defenseMult * enemyWeatherMult))
      : 0,
    bossHit
  );
  // Default the fighter to the first conscious team member.
  React.useEffect(() => {
    if (!fighterNeeded) return;
    const current = fighterPool.find((f) => f.pokemon.id === fighterId);
    if (current && !current.fainted) return;
    const firstUp = fighterPool.find((f) => !f.fainted);
    setFighterId(firstUp ? firstUp.pokemon.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fighterNeeded, evoTeamPokemon.map((p) => p.id).join(","), fighterId]);
  const chosenFighter = fighterPool.find((f) => f.pokemon.id === fighterId);

  const validate = (): string => {
    // Character + team are required on new posts (edit mode locks them, and
    // legacy posts may predate teams, so don't block edits).
    if (mode === "new") {
      if (!characters.length) return "Select at least one character.";
      if (characters.some((c) => !c.teamId)) return "Select a team for each character.";
      // Team lock: on a normal exp thread you stay on your first team.
      const locked = thread?.lockedTeams?.[user?.uid ?? ""];
      if (locked?.length) {
        const postTeams = [...new Set(characters.map((c) => c.teamId).filter(Boolean))] as string[];
        if (postTeams.some((t) => !locked.includes(t))) {
          return "You're locked to the team you first posted with on this thread.";
        }
      }
    }
    if (html.replace(/<[^>]*>/g, "").trim().length < 2) return "Write your post first.";
    for (const selection of itemSelections) {
      const item = (inventory ?? []).find((i) => i.id === selection.itemId);
      if (item && selection.qty > item.quantity)
        return `You only have ${item.quantity}x ${item.name}.`;
    }
    // Battle posts need a conscious fighter to take the enemy's hit.
    if (fighterNeeded) {
      if (!chosenFighter) {
        return fighterPool.length
          ? "Your whole team has fainted on this thread. You cannot battle this post."
          : "Choose which pokemon is fighting this post (select a character and team first).";
      }
      if (chosenFighter.fainted)
        return "That pokemon has fainted on this thread. Choose another fighter.";
    }
    return "";
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      // Log the training post first so the daily window and 10-post cap are
      // enforced before anything is published to the thread.
      if (trainingActive && trainingTargetId) {
        await logTrainingPost(trainingTargetId, trainingPartner);
      }
      await publishPost({
        forum,
        threadId: threadId!,
        characters,
        html,
        items: itemSelections
          .filter((s) => s.qty > 0)
          .map((s) => ({
            itemId: s.itemId,
            qty: s.qty,
            ...(s.note.trim() ? { note: s.note.trim() } : {}),
          })),
        attachSignature,
        ...(mode === "new" && attackBoss ? { attackBoss: true } : {}),
        ...(mode === "new" && thread?.safariContest && encounter ? { safariAction } : {}),
        ...(mode === "new" && fleeAttempt && canFlee ? { fleeAttempt: true } : {}),
        ...(mode === "new" && centerVisit ? { centerVisit: true } : {}),
        ...(mode === "new" && fighterNeeded && fighterId ? { fighterId } : {}),
        ...(mode === "new" && evolve ? { evolve } : {}),
        ...(mode === "new" && mega ? { mega } : {}),
        ...(mode === "new" && zmove ? { zmove } : {}),
        ...(mode === "new" && battleItems.length ? { battleItems } : {}),
        ...(mode === "edit" ? { editPostId: postId } : {}),
      });
    },
    onSuccess: async () => {
      if (draftId && user) await deleteDraft(user.uid, draftId);
      if (trainingActive) {
        queryClient.invalidateQueries({ queryKey: ["training-session", user?.uid] });
      }
      // Evolution / XP / shadow changes owned pokemon; refresh the cache.
      queryClient.invalidateQueries({ queryKey: ["owned-pokemons", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["forum-thread", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts-count", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-posts", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-pending", forum, threadId] });
      queryClient.invalidateQueries({ queryKey: ["get-items", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["get-drafts", user?.uid] });
      navigate(`/Forum/${forum}/thread/${threadId}/last`);
    },
    onError: (err) =>
      setError(callableMessage(err, "Something went wrong publishing. Try again.")),
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      return saveDraft({
        user: user!,
        forum,
        threadId: threadId ?? "",
        title: thread?.title ?? "",
        characterNames: characters.map((c) => c.name).join(", "),
        html,
      });
    },
    onSuccess: (count) =>
      setDraftMessage(
        count >= DRAFT_WARNING_AT
          ? `Draft saved. Heads up, you have ${count}/${MAX_DRAFTS} drafts. You'll run out soon.`
          : "Draft saved. Find it under Dashboard → Drafts."
      ),
    onError: (err) => setDraftMessage((err as Error).message || "Could not save the draft."),
  });

  if (threadPending || !thread) {
    return (
      <Container size="lg" mt={20}>
        {threadPending ? <SectionLoader /> : <Text c="white">This thread does not exist.</Text>}
      </Container>
    );
  }

  // Training posts must start from the Colosseum Training Room page so the
  // target and daily window travel with them; direct replies bounce there.
  if (mode === "new" && thread.trainingLog && !trainingTargetId) {
    return <Navigate to="/Colosseum" replace />;
  }

  if (mode === "new" && !userMayPost(thread, user)) {
    return (
      <Container size="lg" mt={20}>
        <Text c="white">
          {thread.closed
            ? "This thread is archived and read-only."
            : "The host limited who can post on this thread."}
        </Text>
      </Container>
    );
  }

  if (mode === "edit" && editingPost && editingPost.ownerUid !== user?.uid) {
    return (
      <Container size="lg" mt={20}>
        <Text c="white">Only the author of a post can edit it.</Text>
      </Container>
    );
  }

  // Onboarding pre-gate for new replies: the publish callable requires a
  // character plus a team with a pokemon, so guide people through setup
  // instead of letting them write a post they cannot send.
  if (mode === "new" && !onboarding.loading && !onboarding.complete) {
    return (
      <Container size="sm" style={{ marginTop: 20, paddingBottom: 100 }}>
        <Title order={1} fz={{ base: 24, sm: 34 }} c="white" fw={400} mb={16}>
          Almost ready to post
        </Title>
        <OnboardingChecklist intro="Before posting you need a character and a team with at least one pokemon. Here is where you stand:" />
      </Container>
    );
  }

  const handlePublish = () => {
    const problem = trainingAtCap
      ? `You reached the ${MAX_TRAINING_POSTS}-post limit for this training window.`
      : validate();
    setError(problem);
    if (!problem) publishMutation.mutateAsync();
  };

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 120 }}>
      <Box mb={20}>
        <Anchor
          component={Link}
          to={`/Forum/${forum}/thread/${threadId}`}
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
          ← BACK TO THREAD
        </Anchor>
        <Text
          component="h1"
          c="#fff"
          fz={{ base: 24, sm: 34 }}
          fw={700}
          style={{ fontFamily: DISPLAY, letterSpacing: "0.02em", lineHeight: 1.1, margin: "14px 0 0" }}
        >
          {mode === "edit" ? (
            <>
              EDIT YOUR <span style={{ color: "#FFD074" }}>POST</span>
            </>
          ) : (
            <>
              MAKE A <span style={{ color: "#FFD074" }}>POST</span>
            </>
          )}
        </Text>
        <Text c="#b6b1bc" fz={15} mt={10} maw={620}>
          {mode === "edit" ? "Update your post below." : `Replying in ${thread.title}.`}
        </Text>
      </Box>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 5 }}>
          <Stack gap={16}>
            <CharactersPanel
              value={characters}
              onChange={setCharacters}
              locked={mode === "edit"}
              restrictToTeamIds={restrictTeams}
              hint="Choose the characters you want to include in this post to make it clearer for everyone. Doing so will issue your character and team experience."
            />
            {mode === "new" && !!restrictTeams && (
              <Text fz={14} c="gold.1" role="status" aria-live="polite">
                You are locked to the team you first posted with on this thread, so everyone earns XP
                and takes battle damage on the same team throughout it.
              </Text>
            )}
            {mode === "edit" && (
              <UsedItemsPanel items={editingPost?.blocks?.itemsUsed ?? []} />
            )}
            <UseItemsPanel
              value={itemSelections}
              onChange={setItemSelections}
              ballsBlocked={bossActive}
            />
            <PostActionsPanel
              forum={forum}
              threadId={threadId!}
              dice={dice}
              onDice={setDice}
              random={random}
              onRandom={setRandom}
              lockedDice={mode === "edit" ? editingPost?.blocks?.dice ?? [] : []}
              lockedRandoms={mode === "edit" ? editingPost?.blocks?.randoms ?? [] : []}
            />
            {mode === "new" && (
              <EvolutionPanel
                teamPokemon={evoTeamPokemon}
                items={inventory ?? []}
                value={evolve}
                onChange={setEvolve}
              />
            )}
            {mode === "new" && (
              <MegaPanel
                teamPokemon={evoTeamPokemon}
                items={inventory ?? []}
                value={mega}
                onChange={setMega}
              />
            )}
            {mode === "new" && (
              <ZPanel
                teamPokemon={evoTeamPokemon}
                items={inventory ?? []}
                value={zmove}
                onChange={setZmove}
              />
            )}
            {mode === "new" && (
              <BattleItemsPanel
                items={inventory ?? []}
                value={battleItems}
                onChange={setBattleItems}
              />
            )}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 7 }}>
          <Stack gap={16}>
            {trainingActive && (
              <ForumPanel title="Training Post">
                <Stack gap={10}>
                  <Text fz={16} c="gold.1" fw={600} role="status" aria-live="polite">
                    You are logging a training post. The whole training session needs to be
                    written out and posted within this post.
                  </Text>
                  {trainingTarget && (
                    <Flex align="center" gap={10}>
                      <PokemonHoverCard pokemon={trainingTarget}>
                        <Avatar
                          src={getPokemonImageURL(trainingTarget.image_slug)}
                          alt={`${trainingTarget.name || trainingTarget.species} sprite`}
                          size={48}
                          radius="xl"
                        />
                      </PokemonHoverCard>
                      <Stack gap={2}>
                        <Text fz={16} c="white" fw={600}>
                          Training target: {trainingTarget.name || trainingTarget.species}
                          {trainingTarget.name && trainingTarget.name !== trainingTarget.species
                            ? ` (${trainingTarget.species})`
                            : ""}
                        </Text>
                        <PanelHint>
                          This post counts only toward this target. {trainingPartner ? "Partner" : "Solo"}{" "}
                          window: {trainingPartner ? "4 hours" : "2 hours"}, once per day.
                        </PanelHint>
                      </Stack>
                    </Flex>
                  )}
                  <PanelHint>
                    You may keep posting inside your window, up to {MAX_TRAINING_POSTS} posts.
                    This will be post {Math.min(trainingPostsLogged + 1, MAX_TRAINING_POSTS)} of{" "}
                    {MAX_TRAINING_POSTS}.
                  </PanelHint>
                  {trainingOnLastPost && (
                    <Text fz={14} c="gold.1" fw={600} role="status" aria-live="polite">
                      Heads up: this is going to be your last post of the{" "}
                      {trainingPartner ? "4-hour" : "2-hour"} limit.
                    </Text>
                  )}
                  {trainingAtCap && (
                    <Text fz={14} c="red.4" fw={600} role="status" aria-live="polite">
                      You reached the {MAX_TRAINING_POSTS}-post limit for this training window.
                      Come back tomorrow for a new session.
                    </Text>
                  )}
                </Stack>
              </ForumPanel>
            )}

            {bossActive && thread.bossBattle && (
              <ForumPanel title="Boss Battle">
                <Flex align="center" gap={10}>
                  <PokemonHoverCard species={{ slug: thread.bossBattle.slug, name: thread.bossBattle.name }}>
                    <Avatar
                      src={getPokemonImageURL(thread.bossBattle.slug)}
                      alt={`${thread.bossBattle.name} sprite`}
                      size={48}
                      radius="xl"
                    />
                  </PokemonHoverCard>
                  <Stack gap={2}>
                    <GameResultText>
                      It&apos;s a Boss Battle! A boss encounter will be attached to this post...
                      it&apos;s a {thread.bossBattle.name}!
                    </GameResultText>
                    <PanelHint>Balls cannot be used while the boss battle is active.</PanelHint>
                  </Stack>
                </Flex>
                {mode === "new" && (
                  <Checkbox
                    mt={10}
                    label="Attack the boss with this post"
                    color="green.0"
                    checked={attackBoss}
                    onChange={(e) => setAttackBoss(e.currentTarget.checked)}
                    styles={{ label: { color: "white", fontSize: 16 } }}
                  />
                )}
                {mode === "new" && (
                  <PanelHint>
                    {(() => {
                      const b = thread.bossBattle;
                      const done = b.attackPosts ?? 0;
                      const need = b.requiredPosts ?? 0;
                      return need
                        ? `The boss takes ${need} attack posts to defeat. Progress: ${done}/${need}.`
                        : "Check this to add your attack toward defeating the boss.";
                    })()}
                  </PanelHint>
                )}
              </ForumPanel>
            )}

            <EncounterPostPanel
              forum={forum}
              thread={thread}
              value={encounter}
              onChange={setEncounter}
              lockedEncounters={mode === "edit" ? editingPost?.blocks?.encounters ?? [] : []}
              safariAction={safariAction}
              onSafariAction={setSafariAction}
            />

            {fighterNeeded && (
              <ForumPanel title="Battle">
                <PanelHint>
                  Your pokemon strikes first, then the enemy hits back (unless your
                  strike beats it). Pick which of your team pokemon takes the hit;
                  when its HP hits zero it faints for the rest of this thread.
                </PanelHint>
                <Select
                  label="Your fighting pokemon"
                  placeholder={
                    fighterPool.length
                      ? "Choose a team pokemon"
                      : "Select a character and team first"
                  }
                  data={fighterPool.map((f) => ({
                    value: f.pokemon.id,
                    label: `${f.pokemon.species || f.pokemon.name} · HP ${f.hpLeft}/${f.maxHp}${
                      f.fainted ? " (fainted)" : ""
                    }`,
                    disabled: f.fainted,
                  }))}
                  value={fighterId}
                  onChange={setFighterId}
                  allowDeselect={false}
                  size="xs"
                  styles={{ input: { background: "#2E2D2E" }, label: { color: "white" } }}
                />
                {chosenFighter && (
                  <Stack gap={4} mt={6}>
                    <Progress.Root size="lg" radius="xl">
                      {(() => {
                        const segments = postsToBeatStar(
                          starForDex(chosenFighter.pokemon.pokedex ?? 0)
                        );
                        const hpPct = (chosenFighter.hpLeft / chosenFighter.maxHp) * 100;
                        return Array.from({ length: segments }).map((_, i) => {
                          const segStart = (i / segments) * 100;
                          const segSize = 100 / segments;
                          const filled = Math.max(0, Math.min(segSize, hpPct - segStart));
                          return (
                            <Progress.Section
                              key={i}
                              value={Math.max(0.5, filled)}
                              color={filled > 0 ? "cyan.0" : "rgba(255,255,255,0.08)"}
                              style={{
                                marginRight: i < segments - 1 ? 2 : 0,
                              }}
                            />
                          );
                        });
                      })()}
                    </Progress.Root>
                    <Text fz={14} c="dimmed">
                      HP {chosenFighter.hpLeft}/{chosenFighter.maxHp} (level{" "}
                      {levelProgress(chosenFighter.pokemon.experience ?? 0).level}). This
                      post's incoming hit: about {hitDmg} damage
                      {attackBoss && bossActive ? " (boss attack)" : ""}
                      {enemyWeatherMult !== 1 ? ", weather included" : ""}. Nature, held
                      items and critical hits can still shift the final number.
                    </Text>
                    {battleOngoing && (
                      <Text fz={14} c="dimmed">
                        Type matchup ({fighterTypes.join("/")} vs {enemyTypes.join("/")}):
                        your posts are {effectivenessLabel(attackMult)}; its hits on you
                        are {effectivenessLabel(defenseMult)}.
                      </Text>
                    )}
                  </Stack>
                )}
                <PanelHint>
                  Healing items added under Use Items work automatically: potions heal
                  your fighter, revives restore your first fainted pokemon, before the
                  enemy's hit lands.
                </PanelHint>
                {lockedTeamWiped && (
                  <Text fz={14} c="gold.1" role="status" aria-live="polite">
                    Your locked team was wiped. You may bring another team or
                    character; you will be locked to the new team.
                  </Text>
                )}
                {canFlee && (
                  <Stack gap={4} mt={8}>
                    <Checkbox
                      label={
                        thread?.fishingPond
                          ? "Let it go (+1 Snag Coin, always works)"
                          : `Attempt to run away (${fleeChanceForStar(enemyStar)}% base chance; a speedy nature or Quick Claw improves it)`
                      }
                      color="green.0"
                      checked={fleeAttempt}
                      onChange={(e) => setFleeAttempt(e.currentTarget.checked)}
                      styles={{ label: { color: "white", fontSize: 16 } }}
                    />
                    <PanelHint>
                      {thread?.fishingPond
                        ? "Releasing your catch ends the encounter and the pond pays you 1 Snag Coin for the sport."
                        : "Success ends the encounter and your post goes through safely. On a failed escape the turn is wasted: no damage is landed on the enemy and it still gets its hit in."}
                    </PanelHint>
                  </Stack>
                )}
                {battleOngoing && !encounter?.catchable && (
                  <PanelHint>
                    This Pokemon is owned by a trainer: you cannot run away or catch
                    it. Beat it to end the battle.
                  </PanelHint>
                )}
              </ForumPanel>
            )}

            {mode === "new" &&
              !thread?.safariContest &&
              !battleOngoing &&
              !(attackBoss && bossActive) &&
              (() => {
                const teamIds = evoTeamPokemon.map((p) => p.id);
                const statusMap = thread?.battleStatus?.[user?.uid ?? ""] ?? {};
                const teamHurt = teamIds.some(
                  (id) => (Number(myDamage[id]) || 0) > 0 || !!statusMap[id]
                );
                if (centerCooldown) {
                  return (
                    <ForumPanel title="Pokemon Center">
                      <Text fz={14} c="dimmed">
                        This character is just back from the Pokemon Center: no encounters
                        or battles for them until their next post. Your other characters
                        are free to fight.
                      </Text>
                    </ForumPanel>
                  );
                }
                if (!teamHurt || bossActive || !postCharIds.length) return null;
                if (!charsRested) {
                  return (
                    <ForumPanel title="Pokemon Center">
                      <Text fz={14} c="dimmed">
                        The Pokemon Center takes a character in after one battle-free post.
                        Post without fighting first, then the visit opens up.
                      </Text>
                    </ForumPanel>
                  );
                }
                return (
                  <ForumPanel title="Pokemon Center">
                    <Checkbox
                      label="Spend this post visiting the Pokemon Center"
                      color="green.0"
                      checked={centerVisit}
                      onChange={(e) => {
                        const on = e.currentTarget.checked;
                        if (
                          on &&
                          !window.confirm(
                            "Visit the Pokemon Center? This post becomes the trip: the team on this post is fully healed and cured of its wounds from this thread, and this character cannot roll encounters or battle in this post or their next one here."
                          )
                        ) {
                          return;
                        }
                        setCenterVisit(on);
                      }}
                      styles={{ label: { color: "white", fontSize: 15 } }}
                    />
                    <PanelHint>
                      Nurse Joy heals only the team brought on this post, and only its
                      wounds from this thread. The post is the price: no coins, but this
                      character cannot battle on this post or their next.
                    </PanelHint>
                  </ForumPanel>
                );
              })()}

            <StepPanel title="Write Your Post">
              <Editor editor={editor} />
            </StepPanel>

            {mode === "new" && (
              <Checkbox
                label="Attach my signature"
                color="#12B7B6"
                checked={attachSignature}
                onChange={(e) => setAttachSignature(e.currentTarget.checked)}
                styles={{ label: { color: "#fff", fontSize: 15 } }}
              />
            )}

            {error && <GameResultText>{error}</GameResultText>}
            {draftMessage && (
              <Text fz={14} c="#3ACCCB" role="status" aria-live="polite">
                {draftMessage}
              </Text>
            )}

            <Flex
              align="center"
              justify={mode === "new" ? "space-between" : "flex-end"}
              gap={20}
              wrap="wrap"
              style={{
                background: "#141318",
                border: "1px solid #2a2637",
                borderLeft: "3px solid #FFD074",
                padding: "20px 26px",
              }}
            >
              {mode === "new" && (
                <Text fz={14} c="#b6b1bc" style={{ lineHeight: 1.5, maxWidth: 440 }}>
                  Your roleplay rewards will be sent over after the thread is closed and approved by
                  an admin.
                </Text>
              )}
              <Group gap={12} wrap="wrap">
                {mode === "new" && (
                  <ClipButton
                    tone="outline"
                    loading={draftMutation.isPending}
                    onClick={() => draftMutation.mutateAsync()}
                  >
                    Save Post Draft
                  </ClipButton>
                )}
                <ClipButton tone="red" loading={publishMutation.isPending} onClick={handlePublish}>
                  {mode === "edit" ? "Publish Edits" : "Publish Reply"}
                </ClipButton>
              </Group>
            </Flex>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
