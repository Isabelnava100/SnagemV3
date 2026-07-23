import { getDb } from "../context/firebase";

/**
 * Site-wide SEO settings, stored at admin/seo (public read per Firestore
 * rules since it holds no PII; writable by Admin or a director with
 * ManageSEO). Titles, descriptions, canonicals, robots, sitemap, and schema
 * are all assigned automatically (see src/components/common/Seo.tsx and
 * src/lib/seo/), so the only editable knobs are the standardized social
 * share images and the X handle.
 */
export interface SEOSettings {
  /** Absolute URL of the default social share image (1200x630 works best). */
  ogImageUrl: string;
  /** Optional X/Twitter-specific share image; falls back to ogImageUrl. */
  twitterImageUrl: string;
  /** X/Twitter handle including the @, e.g. @snagemguild. */
  twitterHandle: string;
}

export const DEFAULT_SEO: SEOSettings = {
  ogImageUrl: "",
  twitterImageUrl: "",
  twitterHandle: "",
};

export const getSEOSettings = async (): Promise<SEOSettings> => {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const db = await getDb();
    const snap = await getDoc(doc(db, "admin", "seo"));
    const data = snap.data() as Partial<SEOSettings> | undefined;
    return { ...DEFAULT_SEO, ...(data ?? {}) };
  } catch {
    // Rules may not allow anonymous reads until the next rules deploy; the
    // baked defaults in src/lib/seo/site.ts cover that case.
    return DEFAULT_SEO;
  }
};

export const saveSEOSettings = async (settings: SEOSettings): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  const db = await getDb();
  await setDoc(doc(db, "admin", "seo"), settings, { merge: true });
};
