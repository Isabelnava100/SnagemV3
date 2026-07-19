// Generates public/sitemap.xml from the SEO page registry
// (src/lib/seo/pages.json). Runs automatically on every build (see the
// "build" script in package.json), so a deploy always ships a sitemap that
// matches the registry. Only main public, indexable pages belong in the
// registry: private areas (Dashboard, Admin) and crawl-blocked areas
// (Forum threads, user profiles) must stay out. Individual threads are
// deliberately not indexed; if that ever changes, add them as a separate
// child sitemap behind a sitemap index rather than bloating this one.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://snagemguild.com";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { pages } = JSON.parse(readFileSync(join(root, "src/lib/seo/pages.json"), "utf8"));

const today = new Date().toISOString().slice(0, 10);
const urls = pages
  .map(
    (p) => `  <url>
    <loc>${SITE_URL}${p.path === "/" ? "/" : p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority.toFixed(1)}</priority>
  </url>`,
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(join(root, "public/sitemap.xml"), xml);
console.log(`sitemap.xml written with ${pages.length} URLs`);
