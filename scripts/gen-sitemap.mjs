// Generate dist/sitemap.xml on every build (wired into `npm run build`, so
// each Netlify deploy refreshes it automatically).
//
// Sources:
//   1. src/lib/seoRoutes.json  -> the indexable static routes (the same file
//      the runtime SEO engine reads, so the sitemap and the head can't drift)
//   2. functions/scripts/seed-mission-encounters.mjs -> mission ids, so the
//      public /Missions/:id briefs are listed too.
//
// Rules (owner QA checklist): only indexable primary pages appear; private
// areas (forums/threads, users hub, dashboards) are noindexed AND
// robots-blocked, so they are never listed. Thread pages are deliberately
// not indexed at all, so no thread sub-sitemap is generated.
//
// Run from the repo root:  node scripts/gen-sitemap.mjs
import fs from "fs";

const seo = JSON.parse(
  fs.readFileSync(new URL("../src/lib/seoRoutes.json", import.meta.url), "utf8")
);

// Mission ids from the encounter seed (its ENCOUNTERS map is keyed by id).
let missionIds = [];
try {
  const seedSrc = fs.readFileSync(
    new URL("../functions/scripts/seed-mission-encounters.mjs", import.meta.url),
    "utf8"
  );
  missionIds = [...seedSrc.matchAll(/^\s{2}"([a-z0-9-]+)":\s*\{/gm)].map((m) => m[1]);
} catch {
  console.warn("sitemap: mission seed not found; skipping /Missions/:id entries");
}

const today = new Date().toISOString().slice(0, 10);
const urls = [
  ...seo.routes.map((r) => ({
    loc: `${seo.siteUrl}${r.path}`,
    priority: r.priority ?? 0.5,
    changefreq: r.changefreq ?? "monthly",
  })),
  ...missionIds.map((id) => ({
    loc: `${seo.siteUrl}/Missions/${id}`,
    priority: 0.6,
    changefreq: "monthly",
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const out = new URL("../dist/sitemap.xml", import.meta.url);
fs.mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
fs.writeFileSync(out, xml);
console.log(`sitemap: wrote ${urls.length} urls (${missionIds.length} missions) to dist/sitemap.xml`);
