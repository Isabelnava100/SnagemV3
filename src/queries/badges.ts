import { db } from "../context/firebase";

/**
 * Manageable badge catalog. Lives in the shared admin/badges doc (readable by
 * all signed-in users, writable by Admin or the ManageBadges capability per
 * Firestore rules). The six defaults below always exist and can be edited but
 * never deleted; admins/directors can also create custom badges.
 *
 * A user's owned badges live in users/{uid}/bag/badges as [name, background,
 * enabled] tuples (see queries/settings.ts). Assigning a badge writes that
 * tuple into the target user's bag (admins/directors may write per rules).
 */
export interface BadgeDef {
  id: string;
  name: string;
  /** CSS background: a solid color or a gradient, built from `colors`. */
  background: string;
  /** The 1 to 3 hex stops the background was built from (for re-editing). */
  colors?: string[];
  description?: string;
  /** Defaults can be edited but not deleted. */
  isDefault?: boolean;
}

/** The six required badges. Auto-assignment is deferred: assign manually for now. */
export const DEFAULT_BADGES: BadgeDef[] = [
  {
    id: "admin",
    name: "Admin",
    background: "linear-gradient(90deg, #912691 0%, #4D14C4 100%)",
    description: "Site administrator.",
    isDefault: true,
  },
  {
    id: "hybrids",
    name: "Hybrids",
    background: "linear-gradient(90deg, #742D78 0%, #239DAD 100%)",
    description: "Hybrid characters.",
    isDefault: true,
  },
  {
    id: "channelers",
    name: "Channelers",
    background: "linear-gradient(90deg, #2D5C78 0%, #17F1F0 100%)",
    description: "Channeler characters.",
    isDefault: true,
  },
  {
    id: "legacy",
    name: "Legacy",
    background: "linear-gradient(90deg, #B8860B 0%, #FFD700 100%)",
    description: "Auto-assigned to GaiaOnline users.",
    isDefault: true,
  },
  {
    id: "new-user",
    name: "New User",
    background: "linear-gradient(90deg, #3C3A3C 0%, #6d6a6d 100%)",
    description: "Auto-assigned to applicants.",
    isDefault: true,
  },
  {
    id: "master",
    name: "Master",
    background: "linear-gradient(90deg, #762B77 0%, #E35C65 100%)",
    description: "Assigned to anyone with any permissions/capabilities.",
    isDefault: true,
  },
];

const DEFAULT_IDS = new Set(DEFAULT_BADGES.map((b) => b.id));
const ADMIN_BADGES_DOC = ["admin", "badges"] as const;

/**
 * Badges handed out automatically from account status (see autoBadgeIdsFor).
 * These can never be assigned by hand: doing so would fight the derived logic,
 * so the manual-assign UI hides them.
 */
export const AUTO_ASSIGNED_BADGE_IDS = ["admin", "master", "new-user", "legacy"];

/** The account fields the auto-assignment rules read. */
export interface AutoBadgeUser {
  permissions?: string;
  capabilities?: string[];
  /** "Yes" for members who joined via the GaiaOnline guild. */
  isGaia?: string;
}

/**
 * Which default badges a user auto-earns from their account status. These are
 * derived (not stored), so they always reflect the user's current standing
 * without any write:
 *   - legacy    → GaiaOnline members (isGaia === "Yes")
 *   - new-user  → applicants / brand-new accounts
 *   - admin     → admins
 *   - master    → anyone with staff standing (admin, Master/Director role, or
 *                 any granted capability)
 */
export function autoBadgeIdsFor(info: AutoBadgeUser): string[] {
  const role = info.permissions ?? "";
  const caps = info.capabilities ?? [];
  const ids = new Set<string>();

  if (info.isGaia === "Yes") ids.add("legacy");
  if (role === "Applicant" || role === "New") ids.add("new-user");
  if (role === "Admin") ids.add("admin");
  if (role === "Admin" || role === "Master" || role === "Director" || caps.length > 0) {
    ids.add("master");
  }
  return [...ids];
}

type StoredBadge = { name: string; background: string; description?: string; colors?: string[] };

/** All badges: the defaults (with any saved edits) plus custom badges. */
export const getBadgeCatalog = async (): Promise<BadgeDef[]> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, ...ADMIN_BADGES_DOC));
  const stored = (snap.data() as Record<string, StoredBadge> | undefined) ?? {};

  const merged = new Map<string, BadgeDef>();
  DEFAULT_BADGES.forEach((b) => merged.set(b.id, { ...b }));
  Object.entries(stored).forEach(([id, v]) => {
    merged.set(id, {
      id,
      name: v.name,
      background: v.background,
      colors: v.colors,
      description: v.description,
      isDefault: DEFAULT_IDS.has(id),
    });
  });
  return [...merged.values()];
};

/** Create or edit a badge (name + colors/background + optional description). */
export const saveBadge = async (badge: BadgeDef): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(
    doc(db, ...ADMIN_BADGES_DOC),
    {
      [badge.id]: {
        name: badge.name,
        background: badge.background,
        colors: badge.colors ?? [],
        description: badge.description ?? "",
      },
    },
    { merge: true }
  );
};

/**
 * Delete a custom badge from the catalog. Defaults can't be deleted. When
 * `removeFromUsers` is true, also strip the badge from everyone who owns it;
 * otherwise holders keep their copy.
 */
export const deleteBadge = async (id: string, removeFromUsers = false): Promise<void> => {
  if (DEFAULT_IDS.has(id)) throw new Error("Default badges can't be deleted.");
  const { doc, updateDoc, deleteField } = await import("firebase/firestore");
  await updateDoc(doc(db, ...ADMIN_BADGES_DOC), { [id]: deleteField() });
  if (removeFromUsers) {
    // Full cleanup (bag + enabled-display list on every owner's user doc) runs
    // through a Cloud Function so ManageBadges directors get it too, not just
    // admins (directors can't write another member's user doc from the client).
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    await import("../context/firebase");
    await httpsCallable(getFunctions(), "removeBadgeFromUsers")({ badgeId: id });
  }
};

/** Assign a badge (disabled by default; the user enables it themselves). */
export const assignBadgeToUsers = async (badge: BadgeDef, uids: string[]): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  await Promise.all(
    uids.map((uid) =>
      setDoc(
        doc(db, "users", uid, "bag", "badges"),
        { [badge.id]: [badge.name, badge.background, false] },
        { merge: true }
      )
    )
  );
};

/** Remove a badge a user owns. */
export const revokeBadgeFromUser = async (uid: string, badgeId: string): Promise<void> => {
  const { doc, updateDoc, deleteField } = await import("firebase/firestore");
  await updateDoc(doc(db, "users", uid, "bag", "badges"), { [badgeId]: deleteField() });
};
