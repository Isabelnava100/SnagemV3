import { db } from "../context/firebase";

/**
 * Site-wide SEO settings (admin/seo, world-readable so crawler-visible pages
 * render the same head for visitors; writable by Admin or ManageSEO).
 *
 * Meta titles, descriptions and canonicals are AUTO-ASSIGNED per page by the
 * SEO engine (src/lib/seo.ts + seoRoutes.json), so this doc only stores what
 * is standardized sitewide and genuinely editorial: the social share image
 * and the X handle. Legacy fields from the old scaffold (siteTitle,
 * titleSuffix, metaDescription, keywords, canonicalUrl) are ignored.
 */
export interface SEOSettings {
  /** Absolute URL of the sitewide social share image (1200x630 works best). */
  ogImageUrl: string;
  /** Twitter/X handle including the @, e.g. @snagemguild. */
  twitterHandle: string;
}

export const DEFAULT_SEO: SEOSettings = {
  ogImageUrl: "",
  twitterHandle: "",
};

export const getSEOSettings = async (): Promise<SEOSettings> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "admin", "seo"))).data() as
    | Partial<SEOSettings>
    | undefined;
  return {
    ogImageUrl: data?.ogImageUrl ?? "",
    twitterHandle: data?.twitterHandle ?? "",
  };
};

export const saveSEOSettings = async (settings: SEOSettings): Promise<void> => {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "admin", "seo"), settings, { merge: true });
};
