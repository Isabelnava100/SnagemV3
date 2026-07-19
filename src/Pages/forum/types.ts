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
  /** Capture: posts required (from the species' star) and posts landed so far. */
  stage?: string;
  required?: number;
  progress?: number;
  /** Characters the encounter is being caught for (empty = any of the roller's). */
  forCharacterIds?: string[];
  /** Traits rolled when the encounter appeared (shown in the banner, kept on catch). */
  gender?: "M" | "F";
  shiny?: boolean;
  /** "fishing" when the encounter was reeled in with a rod. */
  method?: string;
  /** The rod used for a fishing encounter. */
  rod?: string;
  /** Snag Coins paid out for releasing a Fishing Pond catch. */
  abandonCoin?: number;

  // --- Star rating ----------------------------------------------------------
  /**
   * Normal encounters: the species' strength star (1..7, 6 = pseudo-legendary,
   * 7 = legendary/mythical) which sets `required`. Safari Contest encounters:
   * the rolled rarity tier (1..5).
   */
  star?: number;
  /** Fight posts needed to knock this wild Pokemon out (catch it before then). */
  postsToDefeat?: number;
  /** Fight posts landed so far (its health going down). */
  fightPosts?: number;
  /** Accumulated catch-rate bonus (percent) from berries/food fed. */
  catchBonus?: number;
  /** Failed ball throws so far (some balls key off this). */
  failCount?: number;
  /** What happened on the post this block is attached to. */
  outcome?: "weakened" | "fed" | "fled" | "ko" | "caught" | "missed" | "flee_failed";
  /** The success chance (percent) shown when a run-away was attempted. */
  fleeChance?: number;
  /** Type effectiveness of the fighter's post against this enemy (0.5..2). */
  attackEffect?: number;
  /** Type effectiveness of this enemy's hits against the fighter (0.5..2). */
  defenseEffect?: number;
  /** The catch chance shown when a ball was thrown (for the post log). */
  catchChance?: number;
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
  /** An evolution triggered by this post (on the evolution system card). */
  evolution?: { fromName: string; fromSlug: string; toName: string; toSlug: string };
  /** Pokemon that became fully shadowed on this post (shadowed system card). */
  shadowed?: { names: string[] };
  /** This post was spent visiting the Pokemon Center (team healed + cured). */
  center?: { healed: boolean };
  /** The enemy's counter-attack on this post's chosen fighter (flat HP). */
  battle?: {
    fighterId: string;
    fighterName: string;
    fighterSlug: string;
    /** Flat damage this hit took off the fighter (0 on a heals-only post). */
    damageTaken: number;
    /** The fighter's level-based max HP at the time of the hit. */
    maxHp?: number;
    /** HP left after the hit (0 = fainted for the thread). */
    hpLeft: number;
    fainted: boolean;
    /** The fighter's nature (battle modifier). */
    nature?: string;
    /** Human-readable battle events: crits, statuses, missed balls. */
    notes?: string[];
    /** Healing items applied this post (potions/revives, auto-targeted). */
    heals?: Array<{
      itemName: string;
      pokemonId: string;
      pokemonName: string;
      amount: number;
      revive: boolean;
    }>;
  };
}

export type PostType = "user" | "boss_start" | "boss_end" | "evolution" | "shadowed";

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
  /** Per-pokemon stats each team member earned on this post (footer caption). */
  xpEarned?: { experience?: number; friendship?: number; shadow?: number; purification?: number };
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
  /** Battle stage (stage1/stage2/stage3/legendary), sizes the health bar. */
  stage?: string;
  /** Attack posts needed to defeat the boss (from admin/battle_config). */
  requiredPosts?: number;
  /** Attack posts landed so far, totalled across everyone. */
  attackPosts?: number;
  /** Flat damage the boss deals per attack post (host override or its species' star damage). */
  attackDamage?: number;
}

export interface ThreadParticipant {
  name: string;
  avatar?: string;
}

/** One tier of a Safari Contest: a star rarity, its odds, and its pool. */
export interface SafariTier {
  star: number;
  rate: number;
  postsToDefeat: number;
  pokemons: string[];
}

/** A caught Safari Pokemon, tracked on the thread for judging. */
export interface SafariCatch {
  slug: string;
  name: string;
  star: number;
  postId: string;
}

/** One judged entry in the contest results table. */
export interface SafariResult {
  uid: string;
  name: string;
  /** The kept Pokemon judged for this player. */
  slug: string;
  pokemonName: string;
  star: number;
  /** Rolled quality 1-5. */
  quality: number;
  /** star x quality. */
  score: number;
  /** Snag Coins to award (admin-editable before finalizing). */
  coins: number;
}

/** Safari Contest config + live state, baked onto the Event thread at launch. */
export interface SafariContest {
  name: string;
  blurb?: string;
  tiers: SafariTier[];
  runAwayChance: number;
  berryBonus: number;
  berryBonusCap: number;
  prizeCoins: number[];
  consolationCoins: number;
  /** uid -> the Pokemon that player has caught in this contest. */
  catches?: Record<string, SafariCatch[]>;
  /** Draft judging results, ranked; the admin reviews before finalizing. */
  results?: SafariResult[] | null;
  /** True once prizes have been paid out (guards double payment). */
  finalized?: boolean;
}

export interface ForumThread {
  id: string;
  title: string;
  createdBy: string;
  hostUid?: string;
  /** True when the thread's creator was an admin (XP applies immediately). */
  createdByAdmin?: boolean;
  /** True when created by staff (admin or a hosting director). */
  staffCreated?: boolean;
  /** Staff choice: award XP instantly on posting, or only at the close review. */
  xpAward?: "instant" | "onClose";
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
  /** Set on Event threads launched as a Safari Contest (star-tiered hunt). */
  safariContest?: SafariContest | null;
  /** Discord UIDs subscribed via bookmarks (legacy). */
  notifyviaDiscord?: string[];
  private?: boolean;
  privateTo?: Array<string | null | undefined>;
  /**
   * The shared Super Training Room thread. Replies must start from the
   * Colosseum Training Room page; the composer bounces direct replies there.
   */
  trainingLog?: boolean;
  /** Set on threads auto-created by pickUpMission; links back to /Missions/{id}. */
  missionId?: string;
  /** Mission threads: the briefing's set foes (slugs) that must be beaten before close. */
  requiredEncounters?: string[];
  /** Mission threads: foes beaten so far (server-written as capture bars fill). */
  defeatedEncounters?: string[];
  /** When true, posting here earns no progression (an admin can bonus at close). */
  noXp?: boolean;
  /** uid -> the team(s) that user is locked to on this thread (anti-farm). */
  lockedTeams?: Record<string, string[]>;
  /** Host choice at creation: members may swap teams between posts. */
  allowTeamChanges?: boolean;
  /** uid -> owned pokemon id -> flat damage taken on this thread (fainted at its max HP). */
  battleDamage?: Record<string, Record<string, number>>;
  /** Set when a solo team wipe paused the thread pending a staff decision. */
  paused?: {
    active: boolean;
    uid?: string;
    name?: string;
    reason?: string;
    resolvedBy?: string;
    action?: string;
  };
  /** Host-set battle weather (sun/rain/sandstorm/snow). */
  weather?: string | null;
  /** uid -> pokemon id -> active status condition (burn/poison/paralysis). */
  battleStatus?: Record<string, Record<string, string>>;
  /** Per-user battle log: post count, last battle post, Center visit post. */
  battleLog?: Record<string, { posts?: number; lastBattle?: number; centerAt?: number }>;
  /** The weekly Fishing Pond thread (fishing-only posts). */
  fishingPond?: boolean;
  /** uid -> weekId of their last cast at the Fishing Pond. */
  fishingClaims?: Record<string, string>;
  /** Running tally of items spent on this thread (shown to staff at close). */
  itemsUsedTally?: Record<string, { name?: string; filePath?: string; qty?: number }>;
}

/**
 * The full new-thread composer state saved with a draft so a returning author
 * restores every setting (title/body live in the draft's own fields). Stored
 * under Draft.settings; all fields optional so older drafts still load.
 */
export interface ComposerDraftSettings {
  categoryLink?: string | null;
  tags?: string[];
  instructions?: string;
  pinned?: boolean;
  restricted?: boolean;
  allowedPosters?: string[];
  allowTeamChanges?: boolean;
  characters?: PostCharacter[];
  encounterConfig?: EncounterConfig | null;
  poll?: ThreadPoll | null;
  xpOverride?: Record<string, number> | null;
  attachSignature?: boolean;
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
