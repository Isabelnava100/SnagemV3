import {
  BASE_FORUM_VALUES,
  Capability,
  MASTER_FORUM_VALUES,
  User,
  UserRoles,
} from "../components/types/typesUsed";

// NOTE: every helper here is CLIENT-SIDE UI gating only. Real authorization must
// be enforced by Firestore security rules (console-managed). See docs/PERMISSIONS.md.

export function roleOf(user: User | undefined): string {
  return user?.otherinfo?.permissions ?? "";
}

export function isAdmin(user: User | undefined): boolean {
  return roleOf(user) === UserRoles.Admin;
}

// Master tier (admins implicitly count). Gates master-only character fields
// like "type". UI-only: see the note above; a Firestore rule is still needed
// to truly stop a non-master from hand-editing their own character doc.
export function isMaster(user: User | undefined): boolean {
  return isAdmin(user) || roleOf(user) === UserRoles.Master;
}

// Capabilities that unlock a tool in the staff/admin area. A director holding
// any of these sees the staff menu (with only their tools). Admins see all.
export const STAFF_TAB_CAPABILITIES = [
  Capability.ManageLists,
  Capability.GiveItems,
  Capability.ManageBadges,
] as const;

export function hasAnyStaffCapability(user: User | undefined): boolean {
  return STAFF_TAB_CAPABILITIES.some((cap) => hasCapability(user, cap));
}

/** Whether the user can open the staff/admin area at all. */
export function canAccessStaffArea(user: User | undefined): boolean {
  return isAdmin(user) || hasAnyStaffCapability(user);
}

// Admin implicitly has every capability; everyone else needs an explicit grant.
export function hasCapability(user: User | undefined, cap: Capability): boolean {
  if (isAdmin(user)) return true;
  return user?.otherinfo?.capabilities?.includes(cap) ?? false;
}

/**
 * Whether the user may hand out thread-close rewards (items, currency, XP).
 * Admins plus directors granted GiveItems or ReviewRewards. Used to gate the
 * close-thread control and the rewards review flow (UI only; rules mirror it).
 */
export function canGiveRewards(user: User | undefined): boolean {
  return (
    isAdmin(user) ||
    hasCapability(user, Capability.GiveItems) ||
    hasCapability(user, Capability.ReviewRewards)
  );
}

/**
 * Whether the user may create and edit the Lore Library. Admins plus directors
 * granted ManageLore. Gates the Lore tab's editing controls (UI only; the
 * Firestore rules mirror this on loreBooks/loreEntries writes).
 */
export function canManageLore(user: User | undefined): boolean {
  return isAdmin(user) || hasCapability(user, Capability.ManageLore);
}

/**
 * Whether the user may pin a thread to the top and adjust its XP settings.
 * Admins plus directors who host the staff forums (Main Adventures / Events).
 * Regular members never see these controls.
 */
export function canCurateThreads(user: User | undefined): boolean {
  return (
    isAdmin(user) ||
    hasCapability(user, Capability.HostMainForum) ||
    hasCapability(user, Capability.HostEvents)
  );
}

// Forum "value" ids this user may see. Default-deny: unknown/absent roles get the
// base set, Applicant/Disabled get nothing, Master (or the SeeMasterForums grant)
// adds the master-only forum(s), Admin sees all.
export function allowedForumValues(user: User | undefined): string[] {
  const role = roleOf(user);
  if (role === UserRoles.Applicant || role === UserRoles.Disabled) return [];
  if (isAdmin(user)) return [...BASE_FORUM_VALUES, ...MASTER_FORUM_VALUES];

  const values = new Set(BASE_FORUM_VALUES);
  if (role === UserRoles.Master || hasCapability(user, Capability.SeeMasterForums)) {
    MASTER_FORUM_VALUES.forEach((v) => values.add(v));
  }
  return [...values];
}

export function canAccessForum(user: User | undefined, forumValue: string): boolean {
  return allowedForumValues(user).includes(forumValue);
}
