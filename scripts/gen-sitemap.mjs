// Generates the sitemaps on every build (see the "build" script in
// package.json), so a deploy always ships fresh ones:
//
//   public/sitemap.xml        sitemap INDEX pointing at the two below
//   public/sitemap-pages.xml  main public pages from src/lib/seo/pages.json
//   public/sitemap-blog.xml   published blog posts, fetched from Firestore's
//                             public REST API (blogPosts world-readable per
//                             rules), so new posts land in the sitemap on
//                             the next deploy with no credentials needed.
//
// Only indexable pages belong here: private areas (Dashboard, Admin) and
// crawl-blocked areas (Forum threads, user profiles) must stay out. If the
// blog fetch fails (offline build, rules not deployed yet), the blog child
// sitemap is written with whatever could be fetched, never a broken file.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://snagemguild.com";
const PROJECT_ID = process.env.VITE_BACKEND_FIREBASE_PROJECT_ID || "snagemguild";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { pages } = JSON.parse(readFileSync(join(root, "src/lib/seo/pages.json"), "utf8"));

const today = new Date().toISOString().slice(0, 10);

const urlset = (urls) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

// ---- Pages sitemap --------------------------------------------------------
const pageUrls = pages.map(
  (p) => `  <url>
    <loc>${SITE_URL}${p.path === "/" ? "/" : p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority.toFixed(1)}</priority>
  </url>`,
);
writeFileSync(join(root, "public/sitemap-pages.xml"), urlset(pageUrls));

// ---- Blog sitemap ---------------------------------------------------------
async function fetchPublishedPosts() {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "blogPosts" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "published" },
              op: "EQUAL",
              value: { booleanValue: true },
            },
          },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Firestore REST ${res.status}`);
  const rows = await res.json();
  return rows
    .filter((r) => r.document)
    .map((r) => ({
      slug: r.document.name.split("/").pop(),
      lastmod: (r.document.fields?.updatedAt?.timestampValue ?? today).slice(0, 10),
    }));
}

let blogUrls = [];
try {
  const posts = await fetchPublishedPosts();
  blogUrls = posts.map(
    (p) => `  <url>
    <loc>${SITE_URL}/Blog/${p.slug}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`,
  );
  console.log(`sitemap-blog.xml: ${posts.length} published posts`);
} catch (err) {
  console.warn(`sitemap-blog.xml: could not fetch posts (${err.message}); writing empty urlset`);
}
writeFileSync(join(root, "public/sitemap-blog.xml"), urlset(blogUrls));

// ---- Sitemap index --------------------------------------------------------
const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-pages.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-blog.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>
`;
writeFileSync(join(root, "public/sitemap.xml"), index);
console.log(`sitemap.xml index written (${pages.length} pages, ${blogUrls.length} blog posts)`);
