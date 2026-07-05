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

export const callRollEncounter = (forum: string, threadId: string, chosenSlug?: string) =>
  call<EncounterBlock>("rollEncounter", { forum, threadId, chosenSlug });

export const callPublishPost = (input: {
  forum: string;
  threadId: string;
  html: string;
  characters: PostCharacter[];
  items: Array<{ itemId: string; qty: number; note?: string }>;
  editPostId?: string;
  attachSignature?: boolean;
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
}) => call<{ ok: boolean }>("setBossBattle", input);
