/**
 * Customizable navigation order. Members reorder these destinations in
 * Settings; the first N pin to the nav bar (4 on desktop, 4 on mobile) and the
 * rest fall into the "Menu" drawer. The order is shared across desktop and
 * mobile, only the bar cutoff differs. Icons/routes live in SideBar; this file
 * is the label list + resolver, imported by both SideBar and the Settings UI.
 */

export const NAV_BAR_LIMIT_DESKTOP = 4;
export const NAV_BAR_LIMIT_MOBILE = 4;

/** Pinnable destinations in their default order (top pins to the bar first). */
export const PINNABLE_NAV_LABELS: string[] = [
  "Forum",
  "Console",
  "S.N.A.G.",
  "Colosseum",
  "Challenges",
  "Missions",
  "Activities",
  "Daycare",
  "Trading",
  "Shop",
  "Casino",
  "Research",
  "Users",
];

/**
 * Merge a member's saved order with the master list: keeps their arrangement,
 * drops labels that no longer exist, and appends any new destinations at the
 * end so features added later still appear (in the drawer until re-pinned).
 */
export function resolveNavOrder(saved?: string[]): string[] {
  const valid = new Set(PINNABLE_NAV_LABELS);
  const seen = new Set<string>();
  const ordered: string[] = [];
  (saved ?? []).forEach((label) => {
    if (valid.has(label) && !seen.has(label)) {
      ordered.push(label);
      seen.add(label);
    }
  });
  PINNABLE_NAV_LABELS.forEach((label) => {
    if (!seen.has(label)) ordered.push(label);
  });
  return ordered;
}
