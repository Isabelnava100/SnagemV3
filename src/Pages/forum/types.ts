/**
 * Forum v2 data model. Lives at the existing paths:
 *   forum/{forumLink}/threads/{threadId}            (thread doc, sequential string id)
 *   forum/{forumLink}/threads/{threadId}/posts/{id} (post doc, auto id)
 *
 * Every new field is optional at read time so legacy threads/posts (title,
 * createdBy, closed, timePosted / owner, character, text, badges) still render.
 * See docs/FORUM.md for the full model and the decisions behind it.
 */

export interface FireTimestamp {
  seconds: number;
  nanoseconds: number;
}

/** One selected character on a post, denormalized so posts render in one read. */
export interface PostCharacter {
  id: string;
  name: string;
  imageURL: string;
  /** Team the character brought along (max 6, denormalized sprites). */
  teamId?: string;
  teamName?: string;
  pokemon: Array<{ slug: string; name: string }>;
}

export interface EncounterBlock {
  slug: string;
  name: string;
  /** 'roll' = randomly drawn from the host list, 'choose' = picked from it. */
  mode: "roll" | "choose";
  /** True when this encounter came from the host's non-catchable list or a boss. */
  catchable: boolean;
  caught?: boolean;
}

export interface ItemUsedBlock {
  itemId: string;
  name: string;
  filePath: string;
  qty: number;
  /** Player-written usage description (certain item types ask for one). */
  note?: string;
  /** Set when this item (a ball) successfully caught the post's encounter. */
  caughtPokemon?: string;
}

export interface DiceBlock {
  sides: number;
  count: number;
  results: number[];
}

export interface RandomBlock {
  min: number;
  max: number;
  result: number;
}

/** Game actions attached to a post. Write-once: locked after publish. */
export interface PostBlocks {
  encounters?: EncounterBlock[];
  itemsUsed?: ItemUsedBlock[];
  dice?: DiceBlock[];
  randoms?: RandomBlock[];
  /** Boss present in this post (mirrors thread.bossBattle at publish time). */
  boss?: { slug: string; name: string };
}

export type PostType = "user" | "boss_start" | "boss_end";

export interface ForumPost {
  id: string;
  owner: string;
  ownerUid?: string;
  avatar?: string;
  badges: string[] | null;
  /** Legacy display string (character names joined), kept for old posts. */
  character: string;
  characters?: PostCharacter[];
  text: string;
  /** Author's signature snapshot at publish time (Gaia-style, optional). */
  signature?: string;
  timePosted: FireTimestamp;
  editedAt?: FireTimestamp;
  type?: PostType;
  blocks?: PostBlocks;
}

export interface ThreadPoll {
  question: string;
  options: Array<{ id: string; text: string }>;
  /** uid -> optionId. One vote per user; re-voting overwrites. */
  votes: Record<string, string>;
}

export interface EncounterConfig {
  enabled: boolean;
  /** Host kill-switch: encounters stay visible on old posts but new ones stop. */
  disabled?: boolean;
  listId: string;
  listName: string;
  /** 'roll' shows a Roll button, 'choose' a searchable pick within the list. */
  mode: "roll" | "choose";
  /** Encounters each player may claim in this thread. */
  perUserLimit: number;
  nonCatchable?: { listId: string; listName: string } | null;
}

export interface BossBattle {
  active: boolean;
  slug: string;
  name: string;
  description?: string;
  /** Usernames excluded (they are battling outside the boss's area). */
  excluded: string[];
  startedAt?: FireTimestamp;
}

export interface ThreadParticipant {
  name: string;
  avatar?: string;
}

export interface ForumThread {
  id: string;
  title: string;
  createdBy: string;
  hostUid?: string;
  /** True when the thread's creator was an admin (XP applies immediately). */
  createdByAdmin?: boolean;
  /**
   * Non-admin threads accrue team-pokemon XP here (uid -> pokemonId -> stats)
   * until close, when it is reviewed and committed via finalizeThreadRewards.
   */
  pendingXp?: Record<
    string,
    Record<
      string,
      {
        name?: string;
        slug?: string;
        experience?: number;
        friendship?: number;
        purification?: number;
        shadow?: number;
      }
    >
  >;
  /** Archived flag (legacy field name). */
  closed: boolean;
  pinned?: boolean;
  tags?: string[];
  instructions?: string;
  /** Posting restriction: when true only allowedPosters (+host) may reply. */
  restricted?: boolean;
  allowedPosters?: string[];
  createdAt?: FireTimestamp;
  /** Last-activity time; threads order by this. */
  timePosted: FireTimestamp;
  replyCount?: number;
  lastPost?: { by: string; avatar?: string; at: FireTimestamp };
  participants?: Record<string, ThreadParticipant>;
  poll?: ThreadPoll | null;
  encounterConfig?: EncounterConfig | null;
  /** uid -> encounters already claimed in this thread. */
  encounterClaims?: Record<string, number>;
  bossBattle?: BossBattle | null;
  /** Discord UIDs subscribed via bookmarks (legacy). */
  notifyviaDiscord?: string[];
  private?: boolean;
  privateTo?: Array<string | null | undefined>;
}

/** Composer draft of one game-action set before publish (all editable until then). */
export interface ComposerBlocksState {
  encounter?: EncounterBlock | null;
  itemsUsed: Array<{ itemId: string; qty: number; note: string }>;
  dice?: DiceBlock | null;
  random?: RandomBlock | null;
}

export function formatFireTime(ts?: FireTimestamp | null): string {
  if (!ts?.seconds) return "";
  const date = new Date(ts.seconds * 1000);
  return (
    date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) +
    " at " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

export function formatFireDate(ts?: FireTimestamp | null): string {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
