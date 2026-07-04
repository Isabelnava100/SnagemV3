import { Capability, NewForumInfo, UserRoles } from "../../components/types/typesUsed";
import type { User } from "../../components/types/typesUsed";
import { hasCapability, isAdmin } from "../../lib/permissions";

/** Design token: every text link inside the forum uses this color. */
export const FORUM_LINK_COLOR = "#346CFD";

/** Gradient used on panel headers throughout the forum (matches SectionWrapper). */
export const PANEL_GRADIENT = "linear-gradient(90.37deg, #762B77 6.76%, #17F1F0 65.52%)";

/** Purple used for table headers / active pagination (existing forum accent). */
export const FORUM_ACCENT = "#772976";

export type CategoryCreatePolicy = "admin" | "any" | "event-host";

export interface ForumCategory {
  /** NewForumInfo.value — forum-visibility permission id */
  value: string;
  /** URL segment + Firestore doc id under /forum */
  link: string;
  /** Display name from the design */
  label: string;
  description: string;
  /** Who may create threads here (matrix from the build board). */
  create: CategoryCreatePolicy;
  /** Missions threads are meant to be started from the quests page. */
  questGated?: boolean;
}

/**
 * The five forum categories from the design board, mapped onto the existing
 * /forum/{link}/threads collections so no data migration is needed.
 * Master-Mission (master-only visibility) is appended for users who can see it.
 */
export const FORUM_CATEGORIES: ForumCategory[] = [
  {
    value: "1",
    link: "Main-Forum",
    label: "Main Adventures",
    description: "This is where the roleplay happens. Hosted by admins.",
    create: "admin",
  },
  {
    value: "2",
    link: "Side-Roleplay",
    label: "Side Stories",
    description: "Player vs player roleplay. Any user can create threads here.",
    create: "any",
  },
  {
    value: "4",
    link: "Quests",
    label: "Missions",
    description: "Specific plots with variety options, picked up from the quests page.",
    create: "any",
    questGated: true,
  },
  {
    value: "5",
    link: "Events",
    label: "Events",
    description: "Time sensitive events with prizes.",
    create: "event-host",
  },
  {
    value: "7",
    link: "The-Colosseum",
    label: "The Colosseum",
    description: "Player vs environment battles.",
    create: "admin",
  },
];

/** Master-only category (existing data), shown as an extra tab when visible. */
export const MASTER_CATEGORY: ForumCategory = {
  value: "3",
  link: "Master-Mission",
  label: "Master Mission",
  description: "Here is where master missions happen.",
  create: "admin",
};

export function categoryByLink(link: string | undefined): ForumCategory | undefined {
  if (!link) return undefined;
  if (link === MASTER_CATEGORY.link) return MASTER_CATEGORY;
  const inDesign = FORUM_CATEGORIES.find((c) => c.link === link);
  if (inDesign) return inDesign;
  // Legacy locations (Private, ...) still resolve so old URLs keep working.
  const legacy = NewForumInfo.find((c) => c.link === link);
  return legacy
    ? { value: legacy.value, link: legacy.link, label: legacy.label, description: legacy.description, create: "any" }
    : undefined;
}

/** Thread-creation permission matrix (client-side gate; rules mirror it). */
export function canCreateThread(user: User | undefined, category: ForumCategory): boolean {
  if (!user) return false;
  switch (category.create) {
    case "admin":
      return isAdmin(user);
    case "event-host":
      return isAdmin(user) || hasCapability(user, Capability.HostEvents);
    case "any":
    default:
      return user.otherinfo?.permissions !== UserRoles.Applicant
        && user.otherinfo?.permissions !== UserRoles.Disabled;
  }
}

/** Categories the user is allowed to pick in the new-thread composer. */
export function creatableCategories(user: User | undefined): ForumCategory[] {
  return FORUM_CATEGORIES.filter((category) => canCreateThread(user, category));
}

export const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const;

export const THREADS_PER_PAGE = 10;
export const POSTS_PER_PAGE = 6;

/** Default number of encounters each player gets in a thread when the host enables them. */
export const DEFAULT_ENCOUNTERS_PER_USER = 3;
