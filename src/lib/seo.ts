import React from "react";
import seoRoutes from "./seoRoutes.json";

/**
 * The SEO engine (owner QA checklist, docs/SEO.md summary in CLAUDE.md):
 * every page gets an auto meta title (30-70 chars), meta description
 * (50-160 chars), self-referential canonical (query params canonicalize back
 * to the clean path), OG/Twitter tags, and JSON-LD. Private areas are
 * noindexed and robots-blocked; the sitemap is generated at build time from
 * seoRoutes.json (scripts/gen-sitemap.mjs reads the same file).
 *
 * Head tags are managed directly on the DOM (upserted by data-seo markers) so
 * a single code path owns them; each page's <Seo> render wins over the
 * route-level defaults via the SELF_MANAGED list in RouteSeo.
 */

export const SITE_URL: string = seoRoutes.siteUrl;
export const SITE_NAME: string = seoRoutes.siteName;
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;

export interface RouteSeoEntry {
  path: string;
  title: string;
  description?: string;
  priority?: number;
  changefreq?: string;
}

export const INDEXABLE_ROUTES: RouteSeoEntry[] = seoRoutes.routes;
export const NOINDEX_ROUTES: RouteSeoEntry[] = seoRoutes.noindexRoutes;
export const PRIVATE_PREFIXES: string[] = seoRoutes.privatePrefixes;

export const isPrivatePath = (pathname: string): boolean =>
  PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.toLowerCase().startsWith(`${p.toLowerCase()}/`)
  );

/** Meta title within the 60-char sweet spot (suffix included when it fits). */
export function clampTitle(raw: string): string {
  const base = raw.trim().replace(/\s+/g, " ");
  if (base.toLowerCase().includes(SITE_NAME.toLowerCase())) {
    return base.length <= 70 ? base : `${base.slice(0, 67).trimEnd()}...`;
  }
  const withSuffix = `${base}${TITLE_SUFFIX}`;
  if (withSuffix.length <= 70) return withSuffix;
  const room = 70 - TITLE_SUFFIX.length - 3;
  return `${base.slice(0, room).trimEnd()}...${TITLE_SUFFIX}`;
}

/** Meta description clamped to 160 chars on a word boundary. */
export function clampDescription(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 100 ? lastSpace : 157).trimEnd()}...`;
}

/** Plain text from stored HTML (thread descriptions from the first post). */
export function htmlToText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Plain text from a React node tree (FAQ answers for FAQPage JSON-LD). */
export function nodeToText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join(" ");
  if (React.isValidElement(node)) {
    return nodeToText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

export interface HeadState {
  title: string;
  description?: string;
  /** Canonical URL. Defaults to SITE_URL + clean pathname (no query). */
  canonical?: string;
  noindex?: boolean;
  /** Social share image (absolute URL). */
  image?: string;
  /** og:type, defaults to "website". */
  ogType?: string;
  /** Twitter/X handle including the @. */
  twitterHandle?: string;
  /** JSON-LD objects rendered into a single script tag. */
  jsonLd?: object[];
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    el.setAttribute("data-seo", "1");
    document.head.appendChild(el);
    return;
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

function removeMeta(selector: string) {
  document.head.querySelector(selector)?.remove();
}

/** Apply the full head state for the current page (idempotent upserts). */
export function applyHead(state: HeadState) {
  const title = clampTitle(state.title);
  document.title = title;

  const description = state.description ? clampDescription(state.description) : "";
  if (description) {
    upsertMeta('meta[name="description"]', { name: "description", content: description });
  }

  // Canonical: self-referential for primary pages; query-parameter views
  // canonicalize back to the clean path (owner QA rule).
  const canonical =
    state.canonical ?? `${SITE_URL}${window.location.pathname.replace(/\/+$/, "") || "/"}`;
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    link.setAttribute("data-seo", "1");
    document.head.appendChild(link);
  }
  link.href = canonical;

  // Robots: private areas are noindexed (they are also robots-blocked, and
  // never in the sitemap).
  if (state.noindex) {
    upsertMeta('meta[name="robots"]', { name: "robots", content: "noindex, nofollow" });
  } else {
    removeMeta('meta[name="robots"]');
  }

  // Social cards (standardized sitewide; image + handle come from admin/seo).
  const og: Array<[string, string]> = [
    ["og:site_name", SITE_NAME],
    ["og:title", title],
    ["og:type", state.ogType ?? "website"],
    ["og:url", canonical],
  ];
  if (description) og.push(["og:description", description]);
  if (state.image) og.push(["og:image", state.image]);
  og.forEach(([property, content]) =>
    upsertMeta(`meta[property="${property}"]`, { property, content })
  );
  const tw: Array<[string, string]> = [
    ["twitter:card", state.image ? "summary_large_image" : "summary"],
    ["twitter:title", title],
  ];
  if (description) tw.push(["twitter:description", description]);
  if (state.image) tw.push(["twitter:image", state.image]);
  if (state.twitterHandle) tw.push(["twitter:site", state.twitterHandle]);
  tw.forEach(([name, content]) => upsertMeta(`meta[name="${name}"]`, { name, content }));

  // JSON-LD structured data, one script for the page.
  const existing = document.getElementById("seo-jsonld");
  if (state.jsonLd?.length) {
    const script = existing ?? document.createElement("script");
    script.id = "seo-jsonld";
    (script as HTMLScriptElement).type = "application/ld+json";
    script.textContent = JSON.stringify(
      state.jsonLd.length === 1 ? state.jsonLd[0] : state.jsonLd
    );
    if (!existing) document.head.appendChild(script);
  } else if (existing) {
    existing.remove();
  }
}

/* ------------------------------ JSON-LD builders --------------------------- */

export const organizationJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  alternateName: "Team Snagem",
  url: SITE_URL,
  description:
    "A free Pokemon roleplay community: forum roleplay, battles, catching, breeding, trading and events.",
});

export const webSiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
});

export const webPageJsonLd = (title: string, description: string, url: string) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  description,
  url,
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
});

export const faqJsonLd = (items: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((i) => ({
    "@type": "Question",
    name: i.question,
    acceptedAnswer: { "@type": "Answer", text: i.answer },
  })),
});
