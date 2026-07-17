import { SafariConfig, defaultSafariConfig } from "../lib/safari";

/**
 * Safari Contest admin config lives in a single doc, `admin/safari_config`
 * (writable by Admins / ManageLists directors per firestore.rules). It is the
 * template an admin edits and confirms, then launches into an Event thread.
 */
const SAFARI_CONFIG_PATH = ["admin", "safari_config"] as const;

/** Read the saved Safari config, falling back to the baked Meadow Zone default. */
export async function getSafariConfig(): Promise<SafariConfig> {
  const { doc, getDoc } = await import("firebase/firestore");
  const { db } = await import("../context/firebase");
  const snap = await getDoc(doc(db, ...SAFARI_CONFIG_PATH));
  const data = snap.data() as Partial<SafariConfig> | undefined;
  if (!data || !Array.isArray(data.tiers) || !data.tiers.length) return defaultSafariConfig();
  const base = defaultSafariConfig();
  return {
    ...base,
    ...data,
    tiers: data.tiers as SafariConfig["tiers"],
    prizeCoins: (data.prizeCoins as SafariConfig["prizeCoins"]) ?? base.prizeCoins,
  };
}

/** Save the Safari config template. */
export async function saveSafariConfig(config: SafariConfig): Promise<void> {
  const { doc, setDoc } = await import("firebase/firestore");
  const { db } = await import("../context/firebase");
  // JSON round-trip drops any undefined so Firestore accepts the nested state.
  await setDoc(doc(db, ...SAFARI_CONFIG_PATH), JSON.parse(JSON.stringify(config)));
}
