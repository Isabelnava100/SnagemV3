import React from "react";

/**
 * Snag icon set: solid fills, chunky shapes, dark cutlines. Ported verbatim
 * from the owner's Claude Design project (Nav Icons / snag-icons.js), where it
 * ships as a <snag-icon> web component. Here it is a typed React component so
 * it fits the app's conventions and stays crisp at any size (inline SVG, no
 * image scaling).
 *
 * Usage: <SnagIcon name="trophy" size={24} color="#fff" cut="#1c1a22" label="1" />
 * `cut` is the cutline color and should match the surface behind the icon.
 * `label` is only used by the icons that draw text (medal).
 */

/** Escape text interpolated into the SVG (label prop). */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Geometry is verbatim from the design file. Do not hand-edit paths; re-port
// from the design project if the set changes.
function iconSet(fg: string, cut: string, label: string): Record<string, string> {
  return {
    trophy: `<path d="M12 11 H6 v3 a9 9 0 0 0 9 9" stroke="${fg}" stroke-width="3.5" fill="none"/><path d="M36 11 h6 v3 a9 9 0 0 1 -9 9" stroke="${fg}" stroke-width="3.5" fill="none"/><path d="M13 7 h22 v11 a11 11 0 0 1 -22 0 z" fill="${fg}"/><path d="M21 28 h6 v6 h-6 z" fill="${fg}"/><rect x="15" y="34" width="18" height="5" rx="2" fill="${fg}"/><circle cx="24" cy="17" r="5" fill="${cut}"/><line x1="19" y1="17" x2="29" y2="17" stroke="${fg}" stroke-width="1.6"/><circle cx="24" cy="17" r="1.6" fill="${fg}"/>`,
    burst: `<polygon points="46,24 34.2,28.2 39.6,39.6 28.2,34.2 24,46 19.8,34.2 8.4,39.6 13.8,28.2 2,24 13.8,19.8 8.4,8.4 19.8,13.8 24,2 28.2,13.8 39.6,8.4 34.2,19.8" fill="${fg}"/><rect x="21.7" y="13.5" width="4.6" height="13" rx="2.3" fill="${cut}"/><circle cx="24" cy="32" r="2.6" fill="${cut}"/>`,
    map: `<path d="M5 10 L17 6 V38 L5 42 z" fill="${fg}"/><path d="M17 6 L31 10 V42 L17 38 z" fill="${fg}"/><path d="M31 10 L43 6 V38 L31 42 z" fill="${fg}"/><line x1="17" y1="6" x2="17" y2="38" stroke="${cut}" stroke-width="2"/><line x1="31" y1="10" x2="31" y2="42" stroke="${cut}" stroke-width="2"/><path d="M10 33 C14 25 22 31 26 21 C28 16 31 16 34 15" stroke="${cut}" stroke-width="2.2" fill="none" stroke-dasharray="3.5 3"/><path d="M34.5 10.5 l4.5 4.5 M39 10.5 l-4.5 4.5" stroke="${cut}" stroke-width="2.6" stroke-linecap="round"/>`,
    flask: `<path d="M19 5 h10 v3 h-2 v8 l9.5 16.5 A5 5 0 0 1 32 40 H16 a5 5 0 0 1 -4.3 -7.5 L21 16 V8 h-2 z" fill="${fg}"/><line x1="15" y1="28" x2="33" y2="28" stroke="${cut}" stroke-width="2.2"/><circle cx="21.5" cy="33" r="1.7" fill="${cut}"/><circle cx="27" cy="31.5" r="1.3" fill="${cut}"/><circle cx="24.5" cy="36.5" r="1.5" fill="${cut}"/>`,
    gengar: `<circle cx="24" cy="24" r="17.5" fill="${fg}"/><circle cx="24" cy="24" r="14" fill="none" stroke="${cut}" stroke-width="1.6" opacity=".55"/><path d="M10.5 12.5 L22.5 18 L13 21.5 z" fill="${cut}"/><path d="M37.5 12.5 L25.5 18 L35 21.5 z" fill="${cut}"/><path d="M9.5 22.5 C13 30.5 18 34.8 24 34.8 C30 34.8 35 30.5 38.5 22.5 C33.5 26.2 29 27.8 24 27.8 C19 27.8 14.5 26.2 9.5 22.5 z" fill="${cut}"/><polygon points="13.5,25.1 17.5,26.4 14.9,29.5" fill="${fg}"/><polygon points="19.5,27 23,27.7 20.8,31.5" fill="${fg}"/><polygon points="28.5,27 25,27.7 27.2,31.5" fill="${fg}"/><polygon points="34.5,25.1 30.5,26.4 33.1,29.5" fill="${fg}"/>`,
    users: `<circle cx="11" cy="17" r="4.8" fill="${fg}"/><path d="M11 24 c-5 0 -8 3.8 -8 8.5 V37 h9.5 v-4.5 c0 -3.4 1.2 -6.2 3.2 -8 c-1.4 -.4 -3 -.5 -4.7 -.5 z" fill="${fg}"/><circle cx="37" cy="17" r="4.8" fill="${fg}"/><path d="M37 24 c5 0 8 3.8 8 8.5 V37 h-9.5 v-4.5 c0 -3.4 -1.2 -6.2 -3.2 -8 c1.4 -.4 3 -.5 4.7 -.5 z" fill="${fg}"/><circle cx="24" cy="13.5" r="6.5" fill="${fg}" stroke="${cut}" stroke-width="2.2"/><path d="M24 22.5 c7 0 11 4.8 11 10.5 V37 H13 v-4 c0 -5.7 4 -10.5 11 -10.5 z" fill="${fg}" stroke="${cut}" stroke-width="2.2"/>`,
    ferris: `<path d="M24 20 L15 44 M24 20 L33 44" stroke="${fg}" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="20" r="14" fill="none" stroke="${fg}" stroke-width="2.5"/><path d="M24 20 L24 6 M24 20 L36.1 13 M24 20 L36.1 27 M24 20 L24 34 M24 20 L11.9 27 M24 20 L11.9 13" stroke="${fg}" stroke-width="2"/><circle cx="24" cy="6" r="3.2" fill="${fg}" stroke="${cut}" stroke-width="1.5"/><circle cx="36.1" cy="13" r="3.2" fill="${fg}" stroke="${cut}" stroke-width="1.5"/><circle cx="36.1" cy="27" r="3.2" fill="${fg}" stroke="${cut}" stroke-width="1.5"/><circle cx="24" cy="34" r="3.2" fill="${fg}" stroke="${cut}" stroke-width="1.5"/><circle cx="11.9" cy="27" r="3.2" fill="${fg}" stroke="${cut}" stroke-width="1.5"/><circle cx="11.9" cy="13" r="3.2" fill="${fg}" stroke="${cut}" stroke-width="1.5"/><circle cx="24" cy="20" r="5.5" fill="${fg}"/><circle cx="24" cy="20" r="2" fill="${cut}"/>`,
    snaghand: `<rect x="11.5" y="7" width="6" height="13" rx="3" fill="${fg}"/><rect x="18.8" y="4" width="6" height="16" rx="3" fill="${fg}"/><rect x="26.1" y="4" width="6" height="16" rx="3" fill="${fg}"/><rect x="33.4" y="7" width="6" height="13" rx="3" fill="${fg}"/><path d="M11.5 18 H39.4 V29 a11 11 0 0 1 -11 11 h-5.9 a11 11 0 0 1 -11 -11 z" fill="${fg}"/><circle cx="25.5" cy="31" r="7.5" fill="${fg}" stroke="${cut}" stroke-width="2.4"/><line x1="18" y1="31" x2="33" y2="31" stroke="${cut}" stroke-width="2.4"/><circle cx="25.5" cy="31" r="2.4" fill="${cut}"/>`,
    book: `<path d="M13 4 h25 a2 2 0 0 1 2 2 v36 a2 2 0 0 1 -2 2 H13 a6 6 0 0 1 -6 -6 V10 a6 6 0 0 1 6 -6 z" fill="${fg}"/><line x1="9" y1="35.5" x2="40" y2="35.5" stroke="${cut}" stroke-width="2"/><path d="M27 4 v13 l4.5 -4 4.5 4 V4 z" fill="${cut}"/>`,
    shieldcheck: `<path d="M24 4 L40 10 v11 c0 11 -7 17.5 -16 21.5 C15 38.5 8 32 8 21 V10 z" fill="${fg}"/><path d="M17 22 l5 5 9.5 -10.5" stroke="${cut}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    pokeball: `<circle cx="24" cy="24" r="18" fill="${fg}"/><line x1="6" y1="24" x2="42" y2="24" stroke="${cut}" stroke-width="4"/><circle cx="24" cy="24" r="6.5" fill="${cut}"/><circle cx="24" cy="24" r="3" fill="${fg}"/>`,
    coin: `<circle cx="24" cy="24" r="17" fill="${fg}"/><circle cx="24" cy="24" r="11.5" fill="none" stroke="${cut}" stroke-width="2.5"/><rect x="21.4" y="17" width="5.2" height="14" rx="2.6" fill="${cut}"/>`,
    gift: `<rect x="7" y="14" width="34" height="8" rx="2" fill="${fg}"/><rect x="10" y="24" width="28" height="18" rx="3" fill="${fg}"/><line x1="24" y1="14" x2="24" y2="42" stroke="${cut}" stroke-width="3.5"/><path d="M24 13 C20 4 10 5.5 12.5 10.5 c1.8 3.6 7.5 3.5 11.5 2.5 z" fill="${fg}"/><path d="M24 13 C28 4 38 5.5 35.5 10.5 c-1.8 3.6 -7.5 3.5 -11.5 2.5 z" fill="${fg}"/>`,
    flame: `<path d="M24 5 C31 14 36 19 36 27 A12 12 0 0 1 12 27 C12 19 17 14 24 5 z" fill="${fg}"/><path d="M24 22 C27.5 26.5 29.5 28.5 29.5 31.5 A5.5 5.5 0 0 1 18.5 31.5 C18.5 28.5 20.5 26.5 24 22 z" fill="${cut}"/>`,
    dice: `<rect x="8" y="8" width="32" height="32" rx="7" fill="${fg}"/><circle cx="16.5" cy="16.5" r="2.8" fill="${cut}"/><circle cx="31.5" cy="16.5" r="2.8" fill="${cut}"/><circle cx="24" cy="24" r="2.8" fill="${cut}"/><circle cx="16.5" cy="31.5" r="2.8" fill="${cut}"/><circle cx="31.5" cy="31.5" r="2.8" fill="${cut}"/>`,
    chat: `<path d="M11 6 h26 a7 7 0 0 1 7 7 v13 a7 7 0 0 1 -7 7 H23 l-9 9 v-9 h-3 a7 7 0 0 1 -7 -7 V13 a7 7 0 0 1 7 -7 z" fill="${fg}"/><circle cx="16" cy="19.5" r="2.4" fill="${cut}"/><circle cx="24" cy="19.5" r="2.4" fill="${cut}"/><circle cx="32" cy="19.5" r="2.4" fill="${cut}"/>`,
    bag: `<path d="M10 16 h28 l3 26 H7 z" fill="${fg}"/><path d="M17 16 v-3 a7 7 0 0 1 14 0 v3" fill="none" stroke="${fg}" stroke-width="3.5"/><circle cx="24" cy="29" r="6" fill="none" stroke="${cut}" stroke-width="2"/><line x1="18" y1="29" x2="30" y2="29" stroke="${cut}" stroke-width="2"/><circle cx="24" cy="29" r="1.7" fill="${cut}"/>`,
    egg: `<path d="M24 5 C32 5 38 15 38 26 A14 14 0 0 1 10 26 C10 15 16 5 24 5 z" fill="${fg}"/><path d="M10.6 23.5 l4.4 -3.4 4.5 3.4 4.5 -3.4 4.5 3.4 4.5 -3.4 4.4 3.4" stroke="${cut}" stroke-width="2.2" fill="none" stroke-linejoin="round"/><circle cx="18" cy="31" r="1.9" fill="${cut}"/><circle cx="29.5" cy="31.5" r="1.9" fill="${cut}"/><circle cx="24" cy="13" r="1.9" fill="${cut}"/>`,
    lock: `<rect x="10" y="20" width="28" height="22" rx="5" fill="${fg}"/><path d="M16 20 v-4 a8 8 0 0 1 16 0 v4" fill="none" stroke="${fg}" stroke-width="4"/><circle cx="24" cy="29" r="3.5" fill="${cut}"/><rect x="22.4" y="29" width="3.2" height="7" rx="1.6" fill="${cut}"/>`,
    unlock: `<rect x="10" y="20" width="28" height="22" rx="5" fill="${fg}"/><path d="M16 20 v-5 a8 8 0 0 1 15.5 -2.5" fill="none" stroke="${fg}" stroke-width="4"/><circle cx="24" cy="29" r="3.5" fill="${cut}"/><rect x="22.4" y="29" width="3.2" height="7" rx="1.6" fill="${cut}"/>`,
    sparkle: `<path d="M24 4 L28 20 44 24 28 28 24 44 20 28 4 24 20 20 z" fill="${fg}"/><path d="M38 5 l1.5 5 5 1.5 -5 1.5 -1.5 5 -1.5 -5 -5 -1.5 5 -1.5 z" fill="${fg}"/>`,
    refresh: `<g transform="scale(-1,1) translate(-48,0)"><path d="M39 24 a15 15 0 1 1 -4.4 -10.6" fill="none" stroke="${fg}" stroke-width="4.5"/><polygon points="33,3 36,15 45.5,8.5" fill="${fg}"/></g>`,
    ticket: `<rect x="5" y="13" width="38" height="22" rx="4" fill="${fg}"/><circle cx="5" cy="24" r="4" fill="${cut}"/><circle cx="43" cy="24" r="4" fill="${cut}"/><line x1="30" y1="13" x2="30" y2="35" stroke="${cut}" stroke-width="2" stroke-dasharray="3 3"/>`,
    swords: `<g transform="rotate(45 24 24)"><rect x="21.2" y="3" width="5.6" height="27" rx="2.4" fill="${fg}"/><rect x="15" y="31" width="18" height="4.5" rx="2.2" fill="${fg}"/><rect x="21.2" y="36" width="5.6" height="9" rx="2.8" fill="${fg}"/></g><g transform="rotate(-45 24 24)"><rect x="21.2" y="3" width="5.6" height="27" rx="2.4" fill="${fg}"/><rect x="15" y="31" width="18" height="4.5" rx="2.2" fill="${fg}"/><rect x="21.2" y="36" width="5.6" height="9" rx="2.8" fill="${fg}"/></g>`,
    duo: `<circle cx="15.5" cy="15" r="6" fill="${fg}"/><path d="M15.5 23 c7 0 10.5 4.8 10.5 10 v4.5 H5 V33 c0 -5.2 3.5 -10 10.5 -10 z" fill="${fg}"/><circle cx="33" cy="15" r="6" fill="${fg}" stroke="${cut}" stroke-width="2.4"/><path d="M33 23 c7 0 10.5 4.8 10.5 10 v4.5 H22.5 V33 c0 -5.2 3.5 -10 10.5 -10 z" fill="${fg}" stroke="${cut}" stroke-width="2.4"/>`,
    target: `<circle cx="24" cy="24" r="17" fill="none" stroke="${fg}" stroke-width="3.5"/><circle cx="24" cy="24" r="9.5" fill="none" stroke="${fg}" stroke-width="3.5"/><circle cx="24" cy="24" r="3" fill="${fg}"/>`,
    // The S.N.A.G. device: an old-school walkie-talkie (antenna, screen,
    // speaker grill, side talk button). Drawn in-set, not ported.
    walkie: `<rect x="16" y="2.5" width="4.2" height="11" rx="2.1" fill="${fg}"/><rect x="12.5" y="11" width="23" height="34" rx="5.5" fill="${fg}"/><rect x="17" y="16.5" width="14" height="8" rx="2" fill="${cut}"/><line x1="17.5" y1="30" x2="30.5" y2="30" stroke="${cut}" stroke-width="2.2" stroke-linecap="round"/><line x1="17.5" y1="34.5" x2="30.5" y2="34.5" stroke="${cut}" stroke-width="2.2" stroke-linecap="round"/><line x1="17.5" y1="39" x2="26" y2="39" stroke="${cut}" stroke-width="2.2" stroke-linecap="round"/><rect x="36.5" y="18" width="4" height="9" rx="2" fill="${fg}"/>`,
    pin: `<path d="M24 4 c7.2 0 13 5.8 13 13 c0 9.5 -13 27 -13 27 S11 26.5 11 17 C11 9.8 16.8 4 24 4 z" fill="${fg}"/><circle cx="24" cy="17" r="5" fill="${cut}"/>`,
    medal: `<path d="M17.5 21 L11 4 h10.5 l4 10 z" fill="${fg}"/><path d="M30.5 21 L37 4 H26.5 l-4 10 z" fill="${fg}"/><circle cx="24" cy="30" r="12.5" fill="${fg}"/><circle cx="24" cy="30" r="8.5" fill="none" stroke="${cut}" stroke-width="2"/>${label ? `<text x="24" y="34.5" text-anchor="middle" font-size="13" font-weight="900" fill="${cut}" font-family="sans-serif">${label}</text>` : ""}`,
    chart: `<rect x="8" y="26" width="7" height="16" rx="2" fill="${fg}"/><rect x="20.5" y="16" width="7" height="26" rx="2" fill="${fg}"/><rect x="33" y="8" width="7" height="34" rx="2" fill="${fg}"/>`,
    clock: `<circle cx="24" cy="24" r="18" fill="${fg}"/><path d="M24 13 v11 l8 5" fill="none" stroke="${cut}" stroke-width="3.5" stroke-linecap="round"/>`,
    moon: `<path d="M28 4 A20 20 0 1 0 44 30 A16 16 0 0 1 28 4 z" fill="${fg}"/>`,
    barbell: `<rect x="2" y="21.5" width="44" height="5" rx="2.5" fill="${fg}"/><rect x="6" y="12" width="6" height="24" rx="3" fill="${fg}"/><rect x="36" y="12" width="6" height="24" rx="3" fill="${fg}"/><rect x="14" y="16" width="5" height="16" rx="2.5" fill="${fg}"/><rect x="29" y="16" width="5" height="16" rx="2.5" fill="${fg}"/>`,
    moneybag: `<path d="M19.5 5 h9 l-2.5 6 h-4 z" fill="${fg}"/><path d="M24 11 C34 15 40 23 40 31.5 A10.5 10.5 0 0 1 29.5 42 h-11 A10.5 10.5 0 0 1 8 31.5 C8 23 14 15 24 11 z" fill="${fg}"/><text x="24" y="34" text-anchor="middle" font-size="17" font-weight="900" fill="${cut}" font-family="sans-serif">$</text>`,
    skull: `<circle cx="24" cy="20" r="14.5" fill="${fg}"/><rect x="15.5" y="27" width="17" height="12" rx="3.5" fill="${fg}"/><circle cx="18.5" cy="20" r="3.6" fill="${cut}"/><circle cx="29.5" cy="20" r="3.6" fill="${cut}"/><path d="M24 25 l-2.4 3.6 h4.8 z" fill="${cut}"/><line x1="21" y1="33" x2="21" y2="38" stroke="${cut}" stroke-width="1.8"/><line x1="24.5" y1="33" x2="24.5" y2="38" stroke="${cut}" stroke-width="1.8"/><line x1="28" y1="33" x2="28" y2="38" stroke="${cut}" stroke-width="1.8"/>`,
    gem: `<polygon points="14,7 34,7 42,18 24,41 6,18" fill="${fg}"/><path d="M6 18 h36 M14 7 l10 11 10 -11 M17.5 18 L22 36 M30.5 18 L26 36" stroke="${cut}" stroke-width="1.8" fill="none"/>`,
    triangle: `<polygon points="24,7 43,39 5,39" fill="${fg}"/>`,
    party: `<path d="M7 41 L16 15 33 32 z" fill="${fg}"/><circle cx="30" cy="9" r="2.4" fill="${fg}"/><circle cx="39" cy="15" r="2.4" fill="${fg}"/><circle cx="41" cy="27" r="2.4" fill="${fg}"/><path d="M32 19 l7 -7" stroke="${fg}" stroke-width="2.2" stroke-linecap="round"/>`,
    bolt: `<polygon points="27,3 11,27 21,27 19,45 37,19 26,19" fill="${fg}"/>`,
    bone: `<rect x="13" y="20.5" width="22" height="7" rx="3.5" fill="${fg}"/><circle cx="13" cy="19" r="5.5" fill="${fg}"/><circle cx="13" cy="29" r="5.5" fill="${fg}"/><circle cx="35" cy="19" r="5.5" fill="${fg}"/><circle cx="35" cy="29" r="5.5" fill="${fg}"/>`,
    droplet: `<path d="M24 4 C31 15 36 21 36 29 A12 12 0 0 1 12 29 C12 21 17 15 24 4 z" fill="${fg}"/>`,
    tree: `<polygon points="24,4 34,18 30,18 38,30 10,30 18,18 14,18" fill="${fg}"/><rect x="21" y="30" width="6" height="10" fill="${fg}"/>`,
    cactus: `<rect x="20" y="8" width="8" height="34" rx="4" fill="${fg}"/><path d="M12 16 v8 a8 8 0 0 0 8 8" fill="none" stroke="${fg}" stroke-width="5"/><path d="M36 12 v8 a8 8 0 0 1 -8 8" fill="none" stroke="${fg}" stroke-width="5"/>`,
    flower: `<circle cx="24" cy="12.5" r="6.5" fill="${fg}"/><circle cx="24" cy="35.5" r="6.5" fill="${fg}"/><circle cx="12.5" cy="24" r="6.5" fill="${fg}"/><circle cx="35.5" cy="24" r="6.5" fill="${fg}"/><circle cx="16" cy="16" r="6" fill="${fg}"/><circle cx="32" cy="16" r="6" fill="${fg}"/><circle cx="16" cy="32" r="6" fill="${fg}"/><circle cx="32" cy="32" r="6" fill="${fg}"/><circle cx="24" cy="24" r="6" fill="${fg}" stroke="${cut}" stroke-width="2.4"/>`,
    mountain: `<polygon points="17,12 31,42 3,42" fill="${fg}"/><polygon points="31,7 45,42 17,42" fill="${fg}" stroke="${cut}" stroke-width="2"/>`,
    waves: `<path d="M5 16 q5.5 -6 11 0 t11 0 11 0 M5 27 q5.5 -6 11 0 t11 0 11 0 M5 38 q5.5 -6 11 0 t11 0 11 0" fill="none" stroke="${fg}" stroke-width="4" stroke-linecap="round"/>`,
    palm: `<path d="M26 42 c-1 -10 0 -18 3 -26" fill="none" stroke="${fg}" stroke-width="4.5" stroke-linecap="round"/><path d="M29 16 C24 8 15 7 10 12 c6 0 12 2 19 4 z" fill="${fg}"/><path d="M29 16 C34 8 43 7 45 13 c-6 -1 -10 1 -16 3 z" fill="${fg}"/><path d="M29 16 C29 9 24 4 18 4 c3 3 6 7 11 12 z" fill="${fg}"/><circle cx="19" cy="40" r="3" fill="${fg}"/>`,
    ghost: `<path d="M24 6 C15.5 6 10 12.5 10 21 v19 l4.7 -3.8 4.6 3.8 4.7 -3.8 4.6 3.8 4.7 -3.8 4.7 3.8 V21 C38 12.5 32.5 6 24 6 z" fill="${fg}"/><circle cx="18.5" cy="20" r="3" fill="${cut}"/><circle cx="29.5" cy="20" r="3" fill="${cut}"/><circle cx="24" cy="27.5" r="2.2" fill="${cut}"/>`,
    sliders: `<line x1="12" y1="6" x2="12" y2="42" stroke="${fg}" stroke-width="3.5"/><line x1="24" y1="6" x2="24" y2="42" stroke="${fg}" stroke-width="3.5"/><line x1="36" y1="6" x2="36" y2="42" stroke="${fg}" stroke-width="3.5"/><circle cx="12" cy="30" r="4.5" fill="${fg}" stroke="${cut}" stroke-width="2"/><circle cx="24" cy="15" r="4.5" fill="${fg}" stroke="${cut}" stroke-width="2"/><circle cx="36" cy="24" r="4.5" fill="${fg}" stroke="${cut}" stroke-width="2"/>`,
    exchange: `<path d="M10 17 h24" stroke="${fg}" stroke-width="4"/><polygon points="34,11 44,17 34,23" fill="${fg}"/><path d="M38 31 H14" stroke="${fg}" stroke-width="4"/><polygon points="14,25 4,31 14,37" fill="${fg}"/>`,
    play: `<polygon points="14,8 40,24 14,40" fill="${fg}"/>`,
    arrow: `<path d="M14 34 L34 14 M18 12 h16 v16" fill="none" stroke="${fg}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    circleo: `<circle cx="24" cy="24" r="15" fill="none" stroke="${fg}" stroke-width="4"/>`,
    menu: `<rect x="8" y="11" width="32" height="5" rx="2.5" fill="${fg}"/><rect x="8" y="21.5" width="32" height="5" rx="2.5" fill="${fg}"/><rect x="8" y="32" width="32" height="5" rx="2.5" fill="${fg}"/>`,
    // Gym badges: stylized icon versions, fixed palettes
    boulder: `<polygon points="16,5 32,5 43,16 43,32 32,43 16,43 5,32 5,16" fill="#a8adb8"/><polygon points="19,11 29,11 37,19 37,29 29,37 19,37 11,29 11,19" fill="none" stroke="#6f7580" stroke-width="2"/>`,
    cascade: `<path d="M24 4 C31 15 36 21 36 29 A12 12 0 0 1 12 29 C12 21 17 15 24 4 z" fill="#4aa8e0"/><path d="M18 27 a6 7 0 0 0 6 8" fill="none" stroke="#bfe4f8" stroke-width="2.2" stroke-linecap="round"/>`,
    thunderbadge: `<polygon points="16,5 32,5 43,16 43,32 32,43 16,43 5,32 5,16" fill="#f0a03a"/><polygon points="26,9 15,26 22,26 20,39 33,21 25,21" fill="#fff"/>`,
    rainbow: `<circle cx="34" cy="25" r="6" fill="#ef5350"/><circle cx="29" cy="16.3" r="6" fill="#f2a53a"/><circle cx="19" cy="16.3" r="6" fill="#f2e05a"/><circle cx="14" cy="25" r="6" fill="#8bc067"/><circle cx="19" cy="33.7" r="6" fill="#5aa0d0"/><circle cx="29" cy="33.7" r="6" fill="#b06bd0"/><circle cx="24" cy="25" r="5.5" fill="#f2c94c" stroke="#b8912a" stroke-width="1.6"/>`,
    soul: `<path d="M24 41 C11 32 7 25 7 18 A8.5 8.5 0 0 1 24 14 A8.5 8.5 0 0 1 41 18 C41 25 37 32 24 41 z" fill="#ef7fae"/><path d="M13 18 a5 5 0 0 1 5 -5" stroke="#fbd4e6" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    marsh: `<circle cx="24" cy="24" r="17" fill="#e8c25a"/><circle cx="24" cy="24" r="9.5" fill="none" stroke="#a8842a" stroke-width="2.6"/><circle cx="24" cy="24" r="3" fill="#a8842a"/>`,
    volcano: `<path d="M24 5 C31 14 36 19 36 27 A12 12 0 0 1 12 27 C12 19 17 14 24 5 z" fill="#e05340"/><path d="M24 20 C27.5 24.5 29.5 26.5 29.5 29.5 A5.5 5.5 0 0 1 18.5 29.5 C18.5 26.5 20.5 24.5 24 20 z" fill="#f2a53a"/>`,
    earth: `<path d="M24 44 V18" stroke="#4a8a3a" stroke-width="3" stroke-linecap="round"/><path d="M24 26 C14 25 8 18 9 8 C19 9 24 16 24 26 z" fill="#6fb35a"/><path d="M24 26 C34 25 40 18 39 8 C29 9 24 16 24 26 z" fill="#4a8a3a"/>`,
    zephyr: `<path d="M5 30 C13 12 32 5 43 8 C39 13 34 15 28 17 C34 17 39 18 42 20 C33 29 16 35 5 30 z" fill="#c8ccd8"/><path d="M10 27 C18 18 28 14 36 12" stroke="#8f97a8" stroke-width="1.8" fill="none"/>`,
    hive: `<circle cx="24" cy="27" r="14" fill="#e05340"/><circle cx="24" cy="11" r="5.5" fill="#3a3a44"/><line x1="24" y1="15" x2="24" y2="41" stroke="#3a3a44" stroke-width="2.2"/><circle cx="17" cy="24" r="2.4" fill="#3a3a44"/><circle cx="31" cy="24" r="2.4" fill="#3a3a44"/><circle cx="19" cy="33" r="2.4" fill="#3a3a44"/><circle cx="29" cy="33" r="2.4" fill="#3a3a44"/>`,
    plainbadge: `<rect x="13" y="13" width="22" height="22" rx="3" transform="rotate(45 24 24)" fill="#e8e4da" stroke="#b8ac88" stroke-width="2.2"/>`,
    fogbadge: `<polygon points="24,4 30,12 24,20 18,12" fill="#9ab8d8"/><polygon points="24,28 30,36 24,44 18,36" fill="#9ab8d8"/><polygon points="4,24 12,18 20,24 12,30" fill="#7a9cc4"/><polygon points="28,24 36,18 44,24 36,30" fill="#7a9cc4"/>`,
    storm: `<polygon points="24,6 40,24 24,42 8,24" fill="#b8bcc8" stroke="#8a90a0" stroke-width="2"/><circle cx="24" cy="24" r="4.5" fill="#8a90a0"/>`,
    mineral: `<polygon points="24,6 39,15 39,33 24,42 9,33 9,15" fill="#aab2c0" stroke="#7a8290" stroke-width="2.2"/><path d="M24 6 V42 M9 15 L39 33 M39 15 L9 33" stroke="#7a8290" stroke-width="1.4" opacity=".5"/>`,
    glacier: `<polygon points="14,42 19,12 24,42" fill="#bfe8f2"/><polygon points="20,42 26,4 32,42" fill="#8ed4e8"/><polygon points="28,42 34,16 39,42" fill="#bfe8f2"/>`,
    rising: `<path d="M9 41 C27 39 37 27 37 7 C43 22 40 36 25 43 z" fill="#e88ab8"/><path d="M14 38 C26 35 33 26 34 14" stroke="#c25a90" stroke-width="1.8" fill="none"/>`,
    stonebadge: `<polygon points="7,35 12,19 25,21 27,37" fill="#b0a28a"/><polygon points="25,33 30,15 42,19 40,37" fill="#8f8268"/>`,
    knuckle: `<rect x="7" y="15" width="16" height="18" rx="5" fill="#e0b890"/><rect x="25" y="15" width="16" height="18" rx="5" fill="#c89a70"/><path d="M11 15 v6 M15 15 v6 M19 15 v6 M29 15 v6 M33 15 v6 M37 15 v6" stroke="#a87c50" stroke-width="1.6"/>`,
    dynamo: `<circle cx="24" cy="24" r="16" fill="#e8b83a"/><polygon points="27,12 17,26 23,26 21,37 32,22 25,22" fill="#7a5a10"/>`,
    heat: `<path d="M24 4 C30 12 37 17 37 27 A13 13 0 0 1 11 27 C11 17 18 12 24 4 z" fill="#f27a3a"/><path d="M24 18 C28 23 30.5 25.5 30.5 29 A6.5 6.5 0 0 1 17.5 29 C17.5 25.5 20 23 24 18 z" fill="#f2e05a"/>`,
    balance: `<line x1="11" y1="13" x2="37" y2="13" stroke="#b8bcc8" stroke-width="3" stroke-linecap="round"/><line x1="24" y1="13" x2="24" y2="38" stroke="#b8bcc8" stroke-width="3"/><rect x="17" y="38" width="14" height="3.5" rx="1.7" fill="#b8bcc8"/><path d="M11 13 l-4 10 a7 4.5 0 0 0 8 0 z" fill="#9aa0b0"/><path d="M37 13 l-4 10 a7 4.5 0 0 0 8 0 z" fill="#9aa0b0"/>`,
    feather: `<path d="M11 41 C13 24 27 9 41 6 C39 21 26 37 11 41 z" fill="#c8d4e8"/><line x1="11" y1="41" x2="41" y2="6" stroke="#8898b8" stroke-width="2"/>`,
    mind: `<circle cx="17" cy="24" r="9" fill="#e08ab8"/><circle cx="31" cy="24" r="9" fill="#b06bd0" fill-opacity=".9"/>`,
    rainbadge: `<circle cx="24" cy="24" r="17" fill="#4aa8e0"/><path d="M24 12 C28 18 30.5 21 30.5 25 A6.5 6.5 0 0 1 17.5 25 C17.5 21 20 18 24 12 z" fill="#e8f4fb"/><path d="M14 33 q5 -4 10 0 t10 0" stroke="#1f6ea8" stroke-width="2" fill="none"/>`,
    zcrystal: `<polygon points="24,4 41,16 35,43 13,43 7,16" fill="${fg}"/><path d="M24 4 L18 43 M24 4 L30 43 M7 16 L41 16" stroke="${cut}" stroke-width="1.4" opacity=".55"/>`,
  };
}

/** Every glyph in the set, for the Design System's icon reference. */
export const SNAG_ICON_NAMES = Object.keys(
  iconSet("#fff", "#000", "")
) as SnagIconName[];

export type SnagIconName =
  | "trophy" | "burst" | "map" | "flask" | "gengar" | "users" | "ferris" | "snaghand"
  | "book" | "shieldcheck" | "pokeball" | "coin" | "gift" | "flame" | "dice" | "chat"
  | "bag" | "egg" | "lock" | "unlock" | "sparkle" | "refresh" | "ticket" | "swords"
  | "duo" | "target" | "pin" | "medal" | "chart" | "clock" | "moon" | "barbell"
  | "moneybag" | "skull" | "gem" | "triangle" | "party" | "bolt" | "bone" | "droplet"
  | "tree" | "cactus" | "flower" | "mountain" | "waves" | "palm" | "ghost" | "sliders"
  | "exchange" | "play" | "arrow" | "circleo" | "menu" | "boulder" | "cascade" | "thunderbadge"
  | "rainbow" | "soul" | "marsh" | "volcano" | "earth" | "zephyr" | "hive" | "plainbadge"
  | "fogbadge" | "storm" | "mineral" | "glacier" | "rising" | "stonebadge" | "knuckle"
  | "dynamo" | "heat" | "balance" | "feather" | "mind" | "rainbadge" | "zcrystal"
  | "walkie";

export interface SnagIconProps {
  name: SnagIconName;
  /** Rendered width and height in px. The art is a 48x48 grid. */
  size?: number;
  /** Main fill color. */
  color?: string;
  /** Cutline color; match the surface behind the icon. */
  cut?: string;
  /** Text drawn by label-aware icons (medal). */
  label?: string;
  style?: React.CSSProperties;
  className?: string;
  /** Accessible name; icons are decorative (aria-hidden) when omitted. */
  title?: string;
}

export function SnagIcon({
  name,
  size = 24,
  color = "#fff",
  cut = "#1c1a22",
  label = "",
  style,
  className,
  title,
}: SnagIconProps) {
  const inner = React.useMemo(() => {
    const set = iconSet(color, cut, esc(label));
    return set[name] ?? set.pokeball;
  }, [name, color, cut, label]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={{ display: "inline-flex", flexShrink: 0, ...style }}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
