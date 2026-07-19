# SEO system

Built July 2026 to the owner's agency QA checklist (see CLAUDE.md "SEO rules"). One place to look when adding a page or debugging meta output.

## Pieces and where they live

| Piece | Location | Notes |
|---|---|---|
| Page registry | `src/lib/seo/pages.json` | Single source for the main public pages: path, meta title, meta description, sitemap changefreq/priority. Add every new public page here. |
| Head manager | `src/components/common/Seo.tsx` | Mounted once per routed page. Sets title, description, robots, canonical, Open Graph/X cards, and JSON-LD. `page` prop looks up the registry; dynamic pages pass `title`/`description`/`canonicalPath`; private pages pass `noindex` plus a title. |
| Site constants | `src/lib/seo/site.ts` | Site URL/name, default description, default OG image, `withSuffix()` (60 char title helper), `absoluteUrl()`. |
| Text helpers | `src/lib/seo/text.ts` | `stripHtml`, `truncate`, `textFromNode` (JSX to plain text, used for FAQ schema). |
| Sitemap | `scripts/gen-sitemap.mjs` | Regenerates `public/sitemap.xml` from the registry on every build (`npm run build`). Only indexable public pages; threads and profiles are deliberately excluded (add a child sitemap behind a sitemap index if that ever changes). |
| robots.txt | `public/robots.txt` | Blocks all crawlers and a long list of AI/LLM bots from `/Forum`, `/Users`, and every private area; links the sitemap. |
| llms.txt | `public/llms.txt` | Assistant-facing summary of the guild built from About, Library, and Policies content, targeting pokemon/roleplay/snagem queries. Update it when the pitch or feature set changes. |
| OG image | `public/og-image.png` via `scripts/gen-og-image.mjs` | 1200x630 default share card. Rerun the script if branding changes. Admins can override the URL in Site Settings. |
| Static fallbacks | `index.html` | Title, description, OG/X tags, theme-color, and Organization + WebSite JSON-LD for crawlers and unfurlers that do not run JS (Discord, X, Facebook link previews always see these). |
| Security headers | `netlify.toml` | HSTS (preload), CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, plus asset caching. Extend the CSP when adding a third-party origin. |
| Editable settings | `admin/seo` Firestore doc, edited at `/Dashboard/Site-Settings` (`src/Pages/User/Dashboard/Admin/SEO.tsx`, `src/queries/seo.ts`) | Only the standardized share images and X handle. Titles, descriptions, canonicals, robots, sitemap, and schema are automatic and intentionally not editable. |

## Behavior rules

- Titles max 60 chars, descriptions 50 to 160, unique per page.
- Threads: title is the thread name (truncated), with " Page X" appended past page 1; description is the first 160 characters of the page's opening post; paginated pages self-canonicalize to their own page URL, never to page 1.
- Query-param variants (Library wings `?tab=`, Policies tabs) keep the base page canonical and only vary the title.
- Library Help Desk (`/Library?tab=faq`) emits FAQPage JSON-LD from the `FAQ` export in `src/Pages/Library/faq.tsx`.
- Threads emit DiscussionForumPosting, profiles ProfilePage, everything indexable a WebPage block; Organization + WebSite live statically in `index.html`.
- Private/auth pages (`Dashboard`, `Admin`, auth flows, Daycare, Trading, SNAG, Onboarding) mount `<Seo noindex title="..."/>` and never appear in the sitemap.

## Deploy dependencies

- `firestore.rules` now allows public read of `admin/seo` (share image settings for logged-out visitors). Needs `firebase deploy --only firestore:rules`; until then the baked defaults in `src/lib/seo/site.ts` are used, so nothing breaks.
- Netlify picks up headers/redirects from `netlify.toml` automatically on the next deploy. Verify at securityheaders.com after deploying.
- Submit `https://snagemguild.com/sitemap.xml` in Google Search Console once live, and re-check GSC after major page additions.

## Adding a new page (checklist)

1. Add the route entry to `src/lib/seo/pages.json` if it is public (title 30-70 chars, description 50-160). The sitemap picks it up automatically.
2. Mount `<Seo page="/YourPath" />` (or `noindex` + title for private pages) as the first element of the page component.
3. One H1 via PageHero, at least one H2, alt text on every image.
4. If the page has a schema.org type (FAQ, article, event...), pass it via the `schema` prop and validate with validator.schema.org.
