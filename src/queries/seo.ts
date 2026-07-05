import { db } from "../context/firebase";

/**
 * Site-wide SEO settings. Stored at admin/seo (readable by signed-in users,
 * writable by Admin or a director with ManageSEO per Firestore rules). These
 * are the defaults used for meta tags and social share cards. Per-page
 * overrides and how these get applied to crawlers are a later pass.
 */
export interface SEOSettings {
  /** Browser tab / default <title>. */
  siteTitle: string;
  /** Appended after page titles, e.g. "Page Name | Snagem Guild". */
  titleSuffix: string;
  /** Default meta description (aim for 150 to 160 characters). */
  metaDescription: string;
  /** Comma-separated keywords (low SEO value now, kept for completeness). */
  keywords: string;
  /** Canonical site URL, e.g. https://snagemguild.com. */
  canonicalUrl: string;
  /** Absolute URL of the default social share image (1200x630 works best). */
  ogImageUrl: string;
  /** Twitter/X handle including the @, e.g. @snagemguild. */
  twitterHandle: string;
}

export const DEFAULT_SEO: SEOSettings = {
  siteTitle: "Snagem Guild",
  titleSuffix: " | Snagem Guild",
  metaDescription: "",
  keywords: "",
  canonicalUrl: "https://snagemguild.com",
  ogImageUrl: "",
  twitterHandle: "",
};

export const getSEOSettings = async (): Promise<SEOSettings> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "admin", "seo"));
  const data = snap.data() as Partial<SEOSettings> | undefined;
  return { ...DEFAULT_SEO, ...(data ?? {}) };
};

export const saveSEOSettings = async (settings: SEOSettings): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "admin", "seo"), settings, { merge: true });
};
