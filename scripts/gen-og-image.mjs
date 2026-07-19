// One-off generator for the default social share image
// (public/og-image.png, 1200x630). Rerun with `node scripts/gen-og-image.mjs`
// from the repo root if the branding changes; the PNG is committed.
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1a1023"/>
      <stop offset="0.55" stop-color="#2a1533"/>
      <stop offset="1" stop-color="#3d1440"/>
    </linearGradient>
    <linearGradient id="stripe" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e0447c"/>
      <stop offset="1" stop-color="#8b2fc9"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="14" fill="url(#stripe)"/>
  <rect x="0" y="616" width="1200" height="14" fill="url(#stripe)"/>
  <circle cx="1030" cy="150" r="260" fill="#ffffff" opacity="0.04"/>
  <circle cx="1030" cy="150" r="170" fill="#ffffff" opacity="0.04"/>
  <text x="90" y="200" font-family="Roboto, Arial, sans-serif" font-size="34" font-weight="500" letter-spacing="10" fill="#e0447c">A POKEMON ROLEPLAY COMMUNITY</text>
  <text x="86" y="330" font-family="Roboto, Arial, sans-serif" font-size="104" font-weight="800" fill="#ffffff">The Snagem Guild</text>
  <text x="90" y="420" font-family="Roboto, Arial, sans-serif" font-size="38" fill="#c9c2ce">Story forums, missions, battles, and Shadow Pokemon.</text>
  <text x="90" y="478" font-family="Roboto, Arial, sans-serif" font-size="38" fill="#c9c2ce">Ready to start your journey?</text>
  <text x="90" y="565" font-family="Roboto, Arial, sans-serif" font-size="30" font-weight="500" letter-spacing="3" fill="#8b7f93">SNAGEMGUILD.COM</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(join(root, "public/og-image.png"));
console.log("public/og-image.png written");
