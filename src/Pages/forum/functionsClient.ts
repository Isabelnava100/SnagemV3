/**
 * Thin client for the forum's server-side integrity layer (Cloud Functions).
 * All game-relevant writes go through these callables. See functions/src.
 * The compat firebase init registers the default modular app, so
 * getFunctions() resolves it without extra wiring.
 */
import { DiceBlock, EncounterBlock, PostCharacter, RandomBlock } from "./types";

async function call<TResult>(name: string, data: unknown): Promise<TResult> {
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  await import("../../context/firebase"); // ensure the app is initialized
  const callable = httpsCallable(getFunctions(), name);
  const result = await callable(data);
  return result.data as TResult;
}

/** Extracts the server's human-readable message from a callable error. */
export function callableMessage(error: unknown, fallback: string): string {
  // Log the raw error so an "internal"/unexpected failure can be diagnosed from
  // the browser console (the fallback text hides the useful detail otherwise).
  if (typeof console !== "undefined") console.error("Callable error:", error);
  const message = (error as { message?: string })?.message;
  return message && !/internal/i.test(message) ? message : fallback;
}

export const callRollDice = (forum: string, threadId: string, sides: number, count: number) =>
  call<DiceBlock>("rollDice", { forum, threadId, sides, count });

export const callRollRandom = (forum: string, threadId: string, min: number, max: number) =>
  call<RandomBlock>("rollRandom", { forum, threadId, min, max });

export const callRollEncounter = (
  forum: string,
  threadId: string,
  chosenSlug?: string,
  forCharacterIds?: string[]
) => call<EncounterBlock>("rollEncounter", { forum, threadId, chosenSlug, forCharacterIds });

export const callPublishPost = (input: {
  forum: string;
  threadId: string;
  html: string;
  characters: PostCharacter[];
  items: Array<{ itemId: string; qty: number; note?: string }>;
  editPostId?: string;
  attachSignature?: boolean;
  /** Opt-in: this post attacks the active boss. */
  attackBoss?: boolean;
  /** Safari Contest turn: fight the wild Pokemon, feed it, or throw a ball. */
  safariAction?: "fight" | "berry" | "ball";
}) => call<{ postId: string }>("publishForumPost", input);

export const callPublishThread = (input: {
  forum: string;
  title: string;
  html: string;
  characters: PostCharacter[];
  instructions: string;
  tags: string[];
  pinned: boolean;
  restricted: boolean;
  allowedPosters: string[];
  poll: unknown;
  encounterConfig: unknown;
  /** Applied server-side only for admins / AdjustXP directors. */
  xpConfig?: Record<string, number> | null;
  /** Staff-only: award XP instantly vs at close (server gates non-staff). */
  xpAward?: "instant" | "onClose";
  attachSignature?: boolean;
}) => call<{ threadId: string }>("publishForumThread", input);

export const callVotePoll = (forum: string, threadId: string, optionId: string) =>
  call<{ ok: boolean }>("voteForumPoll", { forum, threadId, optionId });

/** Toggle a badge's inserted/disabled state (ownership + max-5 validated server-side). */
export const callSetBadgeEnabled = (label: string, enabled: boolean) =>
  call<{ ok: boolean }>("setBadgeEnabled", { label, enabled });

/** Apply a thread-close reward session to all recipients (GiveItems cap). */
export const callFinalizeRewards = (sessionId: string) =>
  call<{ ok: boolean; recipients: number }>("finalizeThreadRewards", { sessionId });

/** Direct currency grant to users (GiveItems cap). */
export const callGrantCurrency = (userIds: string[], currency: string, amount: number) =>
  call<{ ok: boolean }>("grantCurrency", { userIds, currency, amount });

/** Grant a Pokemon (optionally shiny) to users (GiveItems cap). */
export const callGrantPokemon = (userIds: string[], slug: string, shiny: boolean) =>
  call<{ ok: boolean }>("grantPokemon", { userIds, slug, shiny });

/** Open one mystery box; server rolls the reward. */
export const callOpenMysteryBox = (itemId: string) =>
  call<{ reward: { kind: string; name: string; qty: number; filePath: string } }>(
    "openMysteryBox",
    { itemId }
  );

/** Admin maintenance: normalize (and optionally prune) legacy forum threads. */
export const callRepairLegacyThreads = (deleteBroken: boolean) =>
  call<{ scanned: number; normalized: number; deleted: number }>("repairLegacyThreads", {
    deleteBroken,
  });

/** Admin maintenance: migrate legacy myBookmarks[] into the bookmarks subcollection. */
export const callMigrateLegacyBookmarks = (dryRun: boolean) =>
  call<{
    usersWithLegacy: number;
    migrated: number;
    skipped: number;
    dryRun: boolean;
    samples: string[];
  }>("migrateLegacyBookmarks", { dryRun });

export const callSetBossBattle = (input: {
  forum: string;
  threadId: string;
  action: "start" | "end";
  slug?: string;
  description?: string;
  excluded?: string[];
  /** Battle stage of the boss; server reads the post count from config. */
  stage?: string;
}) => call<{ ok: boolean }>("setBossBattle", input);

/**
 * Launch a Safari Contest: builds the Event thread + first post server-side and
 * bakes the star-tiered config onto it (mirrors publishForumThread + the extra
 * safari settings). Requires the HostEvents capability.
 */
export const callStartSafariContest = (input: {
  title: string;
  html: string;
  characters: PostCharacter[];
  config: unknown;
  attachSignature?: boolean;
}) => call<{ threadId: string }>("startSafariContest", input);

/** Roll quality x rarity for every participant's kept catch (host/admin). */
export const callJudgeSafariContest = (forum: string, threadId: string) =>
  call<{ results: unknown[] }>("judgeSafariContest", { forum, threadId });

/** Pay out the reviewed Safari Contest prizes (admin / GiveItems). */
export const callFinalizeSafariContest = (input: {
  forum: string;
  threadId: string;
  results: Array<{ uid: string; coins: number }>;
}) => call<{ ok: boolean; paid: number }>("finalizeSafariContest", input);
