import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useLocation } from "react-router-dom";
import {
  HeadState,
  INDEXABLE_ROUTES,
  NOINDEX_ROUTES,
  SITE_NAME,
  SITE_URL,
  applyHead,
  isPrivatePath,
  organizationJsonLd,
  webPageJsonLd,
  webSiteJsonLd,
} from "../../lib/seo";
import { getSEOSettings } from "../../queries/seo";

/**
 * Head manager. RouteSeo (mounted once in App) auto-assigns meta title,
 * description, canonical, robots, social cards and WebPage JSON-LD for every
 * route from src/lib/seoRoutes.json; pages with dynamic needs (threads,
 * mission briefs, the Library) render their own <Seo> and are listed in
 * SELF_MANAGED so the route defaults do not overwrite them.
 *
 * Building a NEW page? Add its entry to seoRoutes.json (indexable or
 * noindex) and it is automatically covered: title, description, canonical,
 * sitemap membership and robots handling all follow from that one entry.
 */

const shareDefaults = { queryKey: ["seo-settings"], queryFn: getSEOSettings };

export function Seo(props: Omit<HeadState, "image" | "twitterHandle"> & { image?: string }) {
  const { data: share } = useQuery(shareDefaults);
  const { title, description, canonical, noindex, ogType, jsonLd, image } = props;
  React.useEffect(() => {
    applyHead({
      title,
      description,
      canonical,
      noindex,
      ogType,
      jsonLd,
      image: image || share?.ogImageUrl || undefined,
      twitterHandle: share?.twitterHandle || undefined,
    });
  }, [title, description, canonical, noindex, ogType, image, jsonLd, share]);
  return null;
}

/** Path prefixes whose pages render their own <Seo> with dynamic content. */
const SELF_MANAGED = ["/Forum", "/Library", "/Missions/", "/Users/"];

export function RouteSeo() {
  const { pathname } = useLocation();
  const { data: share } = useQuery(shareDefaults);

  React.useEffect(() => {
    // Entries ending in "/" cover only subpaths (e.g. /Missions/:id but not
    // /Missions); bare entries cover the path and everything under it.
    const selfManaged = SELF_MANAGED.some((p) =>
      p.endsWith("/") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)
    );
    if (selfManaged) return;
    const clean = pathname.replace(/\/+$/, "") || "/";
    const lower = clean.toLowerCase();
    const indexable = INDEXABLE_ROUTES.find((r) => r.path.toLowerCase() === lower);
    const noindexEntry = NOINDEX_ROUTES.find((r) => r.path.toLowerCase() === lower);
    const priv = isPrivatePath(clean);
    const entry = indexable ?? noindexEntry;
    const canonical = `${SITE_URL}${indexable?.path ?? clean}`;
    const title = entry?.title ?? `${clean.slice(1).replace(/[-/]/g, " ") || SITE_NAME}`;
    const description =
      entry?.description ??
      "Snagem Guild, a free Pokemon roleplay community: forum roleplay, battles, catching, breeding, trading and events.";
    const jsonLd: object[] = [];
    if (clean === "/") {
      jsonLd.push(organizationJsonLd(), webSiteJsonLd());
    } else if (indexable) {
      jsonLd.push(webPageJsonLd(title, description, canonical));
    }
    applyHead({
      title,
      description,
      canonical,
      noindex: priv || !indexable,
      jsonLd,
      image: share?.ogImageUrl || undefined,
      twitterHandle: share?.twitterHandle || undefined,
    });
  }, [pathname, share]);

  return null;
}
