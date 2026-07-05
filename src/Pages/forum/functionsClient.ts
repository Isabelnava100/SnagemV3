/**
 * Thin client for the forum's server-side integrity layer (Cloud Functions).
 * All game-relevant writes go through these callables — see functions/src.
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
}) => call<{ threadId: string }>("publishForumThread", input);

export const callVotePoll = (forum: string, threadId: string, optionId: string) =>
  call<{ ok: boolean }>("voteForumPoll", { forum, threadId, optionId });

/** Toggle a badge's inserted/disabled state (ownership + max-5 validated server-side). */
export const callSetBadgeEnabled = (label: string, enabled: boolean) =>
  call<{ ok: boolean }>("setBadgeEnabled", { label, enabled });

export const callSetBossBattle = (input: {
  forum: string;
  threadId: string;
  action: "start" | "end";
  slug?: string;
  description?: string;
  excluded?: string[];
}) => call<{ ok: boolean }>("setBossBattle", input);
