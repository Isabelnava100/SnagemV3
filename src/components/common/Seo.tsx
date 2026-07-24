import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import pagesJson from "../../lib/seo/pages.json";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
} from "../../lib/seo/site";
// The SEO settings query module is dynamic-imported at query time so the
// firebase app/auth chunk stays out of the marketing boot graph.

interface RegistryPage {
  path: string;
  title: string;
  description: string;
}

const REGISTRY: RegistryPage[] = pagesJson.pages;

export interface SeoProps {
  /**
   * Registry lookup: path of a main public page in src/lib/seo/pages.json
   * (also the source of sitemap.xml, via scripts/gen-sitemap.mjs). Title and
   * description come from the registry unless overridden below.
   */
  page?: string;
  /** Full page title as rendered (use withSuffix() for dynamic names). */
  title?: string;
  /** Meta description, 50 to 160 characters. */
  description?: string;
  /**
   * Canonical path or absolute URL. Defaults to the registry path (so tab and
   * query-param variants canonicalize back to the base page) or, without a
   * registry page, to the current pathname. Paginated pages must pass their
   * own page URL here: paginated pages self-canonicalize, never to page 1.
   */
  canonicalPath?: string;
  /** Private or utility page: emits noindex and skips schema. */
  noindex?: boolean;
  /** Open Graph type, defaults to website. Threads use article. */
  ogType?: "website" | "article";
  /**
   * schema.org type of the page's default block, defaults to WebPage.
   * Use a specific subtype where one fits: AboutPage, CollectionPage,
   * ContactPage, ProfilePage.
   */
  pageType?: string;
  /**
   * Extra JSON-LD blocks (FAQPage, DiscussionForumPosting, ProfilePage...)
   * appended after the default WebPage schema.
   */
  schema?: Record<string, unknown> | Record<string, unknown>[];
}

function upsertMeta(attr: "name" | "property", key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!href) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Per-page head manager. Every routed page mounts exactly one Seo so titles,
 * descriptions, canonicals, robots, social tags, and JSON-LD never go stale
 * across client-side navigation. Crawler-visible fallbacks for the first
 * paint live in index.html; this component takes over once React runs.
 */
export default function Seo({
  page,
  title,
  description,
  canonicalPath,
  noindex = false,
  ogType = "website",
  pageType = "WebPage",
  schema,
}: SeoProps) {
  const location = useLocation();
  const { data: settings } = useQuery({
    queryKey: ["seo-settings"],
    queryFn: () => import("../../queries/seo").then((m) => m.getSEOSettings()),
    staleTime: 60 * 60 * 1000,
  });

  const registry = page ? REGISTRY.find((p) => p.path === page) : undefined;
  const finalTitle = title ?? registry?.title ?? `${SITE_NAME} | Pokemon Roleplay Community`;
  const finalDescription = description ?? registry?.description ?? DEFAULT_DESCRIPTION;
  const canonical = noindex
    ? null
    : absoluteUrl(canonicalPath ?? registry?.path ?? location.pathname);
  const ogImage = settings?.ogImageUrl || DEFAULT_OG_IMAGE;
  const twitterImage = settings?.twitterImageUrl || ogImage;
  const twitterHandle = settings?.twitterHandle || "";
  const schemaJson = noindex
    ? ""
    : JSON.stringify(
        [
          {
            "@context": "https://schema.org",
            "@type": pageType,
            name: finalTitle,
            description: finalDescription,
            url: canonical,
            isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
          },
          ...(schema ? (Array.isArray(schema) ? schema : [schema]) : []),
        ].map((block) => ({ "@context": "https://schema.org", ...block })),
      );

  useEffect(() => {
    document.title = finalTitle;
    upsertMeta("name", "description", finalDescription);
    upsertMeta("name", "robots", noindex ? "noindex" : null);
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:title", finalTitle);
    upsertMeta("property", "og:description", finalDescription);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", finalTitle);
    upsertMeta("name", "twitter:description", finalDescription);
    upsertMeta("name", "twitter:image", twitterImage);
    upsertMeta("name", "twitter:site", twitterHandle || null);

    let script = document.head.querySelector<HTMLScriptElement>("script#seo-jsonld");
    if (!schemaJson) {
      script?.remove();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.id = "seo-jsonld";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = schemaJson;
    }
  }, [
    finalTitle,
    finalDescription,
    canonical,
    noindex,
    ogType,
    ogImage,
    twitterImage,
    twitterHandle,
    schemaJson,
  ]);

  return null;
}
