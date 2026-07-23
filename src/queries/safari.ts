import { v4 as uuid } from "uuid";
import { SafariConfig, defaultSafariConfig } from "../lib/safari";

/**
 * Safari Contest zones live as a named library in one doc, `admin/safari_config`
 * under a `zones` map (zoneId -> SafariConfig). An admin loads a zone into the
 * editor, tweaks it, and saves it back to an existing zone or a new named one,
 * then launches it into an Event thread. Writable by Admin / HostEvents /
 * ManageLists (see firestore.rules).
 */
const SAFARI_PATH = ["admin", "safari_config"] as const;

export interface SafariZone {
  id: string;
  config: SafariConfig;
}

/** Backfill a saved config against the current defaults so old zones still load. */
function normalizeConfig(raw: unknown): SafariConfig {
  const base = defaultSafariConfig();
  const data = raw as Partial<SafariConfig> | undefined;
  if (!data || !Array.isArray(data.tiers) || !data.tiers.length) return base;
  return {
    ...base,
    ...data,
    tiers: data.tiers as SafariConfig["tiers"],
    prizeCoins: (data.prizeCoins as SafariConfig["prizeCoins"]) ?? base.prizeCoins,
  };
}

/** All saved zones, sorted by name. Falls back to the baked Meadow Zone. */
export async function getSafariZones(): Promise<SafariZone[]> {
  const { doc, getDoc } = await import("firebase/firestore");
  const { getDb } = await import("../context/firebase");
  const db = await getDb();
  const snap = await getDoc(doc(db, ...SAFARI_PATH));
  const data = snap.data() as any;

  if (data?.zones && typeof data.zones === "object") {
    const zones = Object.entries(data.zones).map(([id, cfg]) => ({
      id,
      config: normalizeConfig(cfg),
    }));
    if (zones.length) return zones.sort((a, b) => a.config.name.localeCompare(b.config.name));
  }
  // Legacy: a single flat config saved before zones existed.
  if (data && Array.isArray(data.tiers) && data.tiers.length) {
    return [{ id: "default", config: normalizeConfig(data) }];
  }
  // Nothing saved yet: offer the baked Meadow Zone (persisted once saved).
  return [{ id: "meadow-zone", config: defaultSafariConfig() }];
}

/** Resolve one zone's config for launch, falling back to the first/default. */
export async function getSafariZoneById(id?: string | null): Promise<SafariConfig> {
  const zones = await getSafariZones();
  const found = id ? zones.find((z) => z.id === id) : undefined;
  return (found ?? zones[0]).config;
}

/** Upsert one zone. */
export async function saveSafariZone(id: string, config: SafariConfig): Promise<void> {
  const { doc, setDoc } = await import("firebase/firestore");
  const { getDb } = await import("../context/firebase");
  const db = await getDb();
  // JSON round-trip drops any undefined so Firestore accepts the nested state.
  await setDoc(
    doc(db, ...SAFARI_PATH),
    { zones: { [id]: JSON.parse(JSON.stringify(config)) } },
    { merge: true }
  );
}

/** Remove one zone from the library. */
export async function deleteSafariZone(id: string): Promise<void> {
  const { deleteField, doc, setDoc } = await import("firebase/firestore");
  const { getDb } = await import("../context/firebase");
  const db = await getDb();
  await setDoc(doc(db, ...SAFARI_PATH), { zones: { [id]: deleteField() } }, { merge: true });
}

export function newSafariZoneId(): string {
  return uuid();
}
