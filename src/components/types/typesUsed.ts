// Type or Interface
// In general, interfaces and types are interchangeable in many contexts,
// but there are some differences in how they are used. For example,
// interfaces can be extended and implemented, whereas types can be aliased
// and merged. Additionally, some advanced features of TypeScript, such as
// conditional types and mapped types, can only be used with types.

import { Dispatch, SetStateAction } from "react";

export interface HeaderSearchProps {
  links: {
    link: string;
    label: string;
    icon: string;
    links?: { link: string; label: string }[];
  }[];
}
// This is for changing the navigation if the user is logged in or not

export interface PermissionsForForum {
  link: string;
  value: string;
  label: string;
}
//Interface for forum location listings

export interface ProviderForumSetup {
  value: string;
  label: string;
  link: string;
  description: string;
}
//Creating interface for forum provider interface

export const NewForumInfo: ProviderForumSetup[] = [
  {
    value: "1",
    label: "Main Forums",
    link: "Main-Forum",
    description: "This is where the roleplay happens.",
  },
  {
    value: "2",
    label: "Side Roleplay",
    link: "Side-Roleplay",
    description: "This space is for small, side roleplays.",
  },
  {
    value: "3",
    label: "Master Mission",
    link: "Master-Mission",
    description: "Here are where master missions happens.",
  },
  {
    value: "4",
    label: "Quests",
    link: "Quests",
    description: "Pick up quests to do on your own or with friends.",
  },
  {
    value: "5",
    label: "Events",
    link: "Events",
    description: "Participate in events and get prizes!",
  },
  {
    value: "6",
    label: "Private",
    link: "Private",
    description: "Keep a record of your own quests and roleplays here.",
  },
  {
    value: "7",
    label: "The Colosseum",
    link: "The-Colosseum",
    description: "Player vs environment battles.",
  },
];
//replace all other with this

// Forum-visibility model (default-DENY). Adjust these two lists to change access.
// Master Mission (value "3") is the master-only forum unlocked by the Master role
// or the SeeMasterForums capability; everything else is visible to any member.
export const MASTER_FORUM_VALUES = ["3"];
export const BASE_FORUM_VALUES = ["1", "2", "4", "5", "6", "7"];

export const badgesColors = [
  { color1: "red", color2: "yellow", label: "Test" },
  { color1: "blue", color2: "green", label: "Legacy" },
];
//This is used for getting the static colors of badges

export interface EachPostInfo {
  //used to be Item
  id: string;
  character: string;
  owner: string;
  text: string;
  thread: number;
  otherinfo: SpecificUser | undefined;
}
//This is the set up for fetching each post

export interface EachPostVisual {
  newkey: string;
  image: string;
  bigText: string;
  chara: string;
  author: {
    name: string;
    avatar: string;
    badges: string[];
  };
}
//This is for showing each post on the threads

export interface InfoOnThreadVisual {
  info: ThreadInformation[];
  forum: number | string | undefined;
}
//This is for visually setting up the adjustments above each individual thread

export interface ThreadInformation {
  id: number;
  closed: boolean;
  createdBy: string;
  notifyviaDiscord: Array<string>;
  private: boolean;
  privateTo?: Array<string | null | undefined>;
  timePosted: string;
  title: string;
}

//This is the set up for reading a thread

export interface PostsStructure {
  id: string;
  badges: string[];
  character: string;
  owner: string;
  text: string;
  timePosted: {
    seconds: number;
    nanoseconds: number;
  };
}
//This is the set up for reading a post

export type User = {
  uid: string;
  email: string | null;
  avatar?: string;
  displayName: string | null;
  otherinfo?: SpecificUser;
  username: string;
};
//Database for Users

/*
  ===========================================
  SnagemGuild Permissions Architecture
  ===========================================
  Two orthogonal axes (see docs/PERMISSIONS.md for the full model + roadmap):

  1. ROLE (`permissions` field, exactly one per user): trust tier + forum
     visibility. Higher tiers see more forums; roles do NOT imply capabilities.
       - Admin     : full control; manages roles and capabilities of others.
       - Director   : functional role; powers come from granted capabilities,
                      NOT from the role itself. Not automatically a Master.
       - Master     : forum-visibility tier that unlocks the master-only forum(s).
       - Verified   : standard trusted member.
       - New        : freshly approved member.
       - Applicant  : still in the NewUsers queue; cannot log in.
       - Disabled   : access revoked; cannot log in.

  2. CAPABILITIES (`capabilities` field, zero or more): granular action grants
     an Admin toggles per user (mainly for Directors). Admin has all implicitly.
     Forum visibility and capabilities are independent: a Director can be granted
     SeeMasterForums without becoming a Master, and vice-versa.

  FUTURE: an Admin-only checklist on the Settings tab to toggle each Director's
  capabilities. For now capabilities are set by hand in the Firestore console.
  Real enforcement of all of this MUST live in Firestore security rules; every
  check in this codebase is client-side UI only.
*/
export enum UserRoles {
  Admin = "Admin",
  Director = "Director",
  Master = "Master",
  Verified = "Verified",
  New = "New",
  Applicant = "Applicant",
  Disabled = "Disabled",
}

// Granular, admin-grantable action permissions. Add new powers here.
// Admins toggle these per Director in Dashboard > Admin > Permissions.
export enum Capability {
  SeeMasterForums = "SeeMasterForums",
  GiveItems = "GiveItems",
  HostEvents = "HostEvents",
  ManageLists = "ManageLists",
  AdjustXP = "AdjustXP",
  ManageBadges = "ManageBadges",
  ReviewRewards = "ReviewRewards",
  ManageSEO = "ManageSEO",
  ApproveImports = "ApproveImports",
  HostMainForum = "HostMainForum",
  ManageLore = "ManageLore",
}

export const CAPABILITY_INFO: Record<Capability, string> = {
  [Capability.SeeMasterForums]: "See the master-only forums",
  [Capability.GiveItems]: "Give items/currency and award thread-close rewards",
  [Capability.HostEvents]: "Create threads in the Events category",
  [Capability.ManageLists]: "Manage encounter lists, announcements and mystery boxes",
  [Capability.AdjustXP]: "Adjust per-thread XP settings",
  [Capability.ManageBadges]: "Create/edit badges and assign them to users",
  [Capability.ReviewRewards]: "Review and finalize thread-close rewards, including team XP",
  [Capability.ManageSEO]: "Edit the site's SEO settings (titles, descriptions, social share info)",
  [Capability.ApproveImports]: "Review and approve returning-member data imports (currency, items, Pokemon)",
  [Capability.HostMainForum]: "Create threads in Main Adventures",
  [Capability.ManageLore]: "Create and edit the Lore Library (books and entries)",
};

export type SpecificUser = {
  permissions: UserRoles | string;
  capabilities?: Capability[];
  badges: string[];
  discordUID?: string;
  /** Discord display name captured when the account was linked. */
  discordUsername?: string;
  /** "Yes" for members who joined via the GaiaOnline guild. */
  isGaia?: string;
};
//Extra details added about the user

export type AuthContextType = {
  user: User | undefined;
  setUser: Dispatch<SetStateAction<User | undefined>>;
};
//AuthContent

export interface myBookmarksInfo {
  where: string;
  name: string;
}

export interface Currencies {
  // Stored as numbers (migrated from legacy strings, see
  // functions/scripts/migrate-currency-to-numbers.mjs). Readers should still
  // tolerate a string in case they run against a not-yet-migrated doc.
  gengarcoin: number;
  pokecoin: number;
  snagemblem?: number;
  /** Mission-bonus pieces; every 3 grant one Snag Emblem. Cumulative count. */
  snagEmblemPieces?: number;
}

export type Item = {
  id: string;
  name: string;
  category: string;
  filePath: string;
  quantity: number;
};

export interface Draft {
  id: string;
  category: string;
  character_name: string;
  color: string;
  date_saved: {
    seconds: number;
    nanoseconds: number;
  };
  location_db: string;
  long_text: string;
  thread_id: string;
  title_thread: string;
  /**
   * Full new-thread composer state (category, tags, restrictions, characters,
   * encounters, poll, XP overrides) so a saved roleplay draft restores every
   * setting, not just the title and body. Shape: ComposerDraftSettings.
   */
  settings?: Record<string, unknown>;
}

export interface Character {
  id: string;
  age: string;
  birthday: string;
  height: string;
  moveset: string;
  name: string;
  short_description: string;
  species: string;
  pronouns: string;
  type: "None" | "Hybrid" | "Channeler";
  imageURL: string;
  createdAt: {
    nt: number;
    seconds: number;
  };
}

export const characterTypes = ["None", "Hybrid", "Channeler"];

export interface Team {
  id: string;
  pokemon_ids: string[];
  pokemons: OwnedPokemon[];
  team_name: string;
  times_battled: string;
  created_at: {
    nt: number;
    seconds: number;
  };
  /**
   * Character this team belongs to. Optional for backward compatibility: a team
   * with no characterId is shared and available to every one of the user's
   * characters. New teams are assigned to a character in the dashboard.
   */
  characterId?: string;
}

export interface OwnedPokemon {
  id: string;
  date_caught: {
    nt: number;
    seconds: number;
  };
  gender: "M" | "F";
  generation: string;
  image_slug: string;
  name: string;
  pokedex: string;
  regiondex: string;
  species: string;
  type1: string;
  type2?: string;
  /** Provenance: set by the forum catch flow (publishForumPost). */
  caughtIn?: {
    forum: string;
    threadId: string;
    postId: string;
    threadTitle?: string;
  };
  /** Earned via forum posting (xpConfig); the rest are admin-adjusted. */
  experience?: number;
  friendship?: number;
  purification?: number;
  shadow?: number;
  /** Character whose box this Pokemon lives in. Unset = shared/unassigned. */
  characterId?: string;
  /** True for a shiny Pokemon: swaps its sprite to the shiny variant. */
  shiny?: boolean;
  /** One of the 25 natures (assigned at catch/hatch; older mons derive one). */
  nature?: string;
  /** Equipped held item (setHeldItem callable; battle effects server-side). */
  heldItem?: { itemId: string; name: string; filePath?: string; category?: string };
}

export type Profile = Partial<{
  avatars: string[];
  coverBG: string;
  cover_backgrounds: string[];
  description: string;
  tags: string[];
  // Curated showcase picks for the public profile (ids into the user's bag).
  featuredCharacterId: string;
  featuredTeamId: string;
  featuredPokemonId: string;
}>;

export const pokemonTypes = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
] as const;

export type PokemonTypes = (typeof pokemonTypes)[number];

export const pokemonGenerations = [
  "Generation I",
  "Generation II",
  "Generation III",
  "Generation IV",
  "Generation V",
  "Generation VI",
  "Generation VII",
  "Generation VIII",
] as const;

export type PokemonGenerations = (typeof pokemonGenerations)[number];

export interface Bookmark {
  id: string;
  title: string;
  color: string;
  date: {
    nt: number;
    seconds: number;
  };
  send2discord: string;
  threadID: string;
  threadLocation: string;
  /** Thread's last post at bookmark time (denormalized for the card). */
  latestPostBy?: string;
  latestPostAt?: {
    seconds: number;
    nanoseconds: number;
  };
}

export interface AdminPokemonList {
  id: string;
  name?: string;
  creator: string;
  pokemons: string[];
  public: boolean;
  rule: "except" | "only";
  /**
   * Seeded default pool for a mission (attached by pickUpMission). Hidden from
   * the Library's Field Registers and the host encounter picker, which only
   * show manually curated lists.
   */
  missionDefault?: boolean;
}

export interface Settings {
  directPingNotifications: boolean;
  discordNotifications: boolean;
  postsAndBookmarkedThreadsNotification: boolean;
  siteNotifications: boolean;
  /** Announcement/update emails. Account emails (password resets) always send. */
  emailUpdates: boolean;
}
