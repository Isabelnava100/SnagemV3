import { Button, MantineColorsTuple, createTheme } from "@mantine/core";

// v9 requires exactly 10 shades per color; pad shorter palettes by repeating the last shade
function shades(...colors: string[]): MantineColorsTuple {
  const last = colors[colors.length - 1];
  return [...colors, ...Array(10 - colors.length).fill(last)] as unknown as MantineColorsTuple;
}

export const theme = createTheme({
  colors: {
    brand: shades(
      "#F7DBF7",
      "#E4BFE4",
      "#D1A2D1",
      "#C17DC1",
      "#AC5DAB",
      "#772976",
      "#651664",
      "#4C094B",
      "#3B053A",
      "#2A0229"
    ),
    // Alert/action red family; 0 is the homepage CTA red (Magikarp Red).
    pink: shades("#E54156", "#B1446D", "#7E2C75", "#912691"),
    // Single gold ramp for the whole site: 0 = fill (dark text on it),
    // 1 = accent text on dark, deeper shades for gradients.
    gold: shades("#FFD074", "#F5C842", "#E8B32A", "#C9940F"),
    // Success/positive states use the brand cyan (greens retired by request);
    // remapping the green and teal names recolors every existing usage.
    green: shades("#12B7B6", "#14B1B6"),
    teal: shades("#5FD6D5", "#3ACCCB", "#22C4C3", "#12B7B6"),
    violet: shades("#4D14C4"),
    cyan: shades("#12B7B6", "#14B1B6"),
    // The homepage CTA blue, saturated up from the old #474D9B. Overriding
    // `indigo` also pulls the existing grape-to-indigo gradients on brand.
    indigo: shades("#4049C9", "#3B42B0", "#343A96"),
    // Purple accents (badges, tabs, eyebrows) share the brand ramp so there is
    // only one purple family on the site.
    grape: shades(
      "#F7DBF7",
      "#E4BFE4",
      "#D1A2D1",
      "#C17DC1",
      "#AC5DAB",
      "#772976",
      "#651664",
      "#4C094B",
      "#3B053A",
      "#2A0229"
    ),
  },
  primaryColor: "brand",
  // Never render light-on-light: filled components on a light color (the gold
  // ramp) automatically switch to dark text.
  autoContrast: true,
  luminanceThreshold: 0.4,
  // Filled components in dark mode use the canonical mid shade (brand.5
  // purple) instead of Mantine's near-black shade 8.
  primaryShade: { light: 6, dark: 5 },
  white: "#FFFFFF",
  breakpoints: {
    xs: "480px",
    sm: "800px",
    md: "900px",
    lg: "1200px",
    xl: "1440px",
  },
  fontFamily: "'Roboto', sans-serif",
  // Site-wide 14px text floor: token sizes lifted so xs/sm meet the minimum
  // and the larger steps shift up in kind (was 12/14/16/18/20).
  fontSizes: {
    xs: "14px",
    sm: "16px",
    md: "20px",
    lg: "22px",
    xl: "24px",
  },
  // Standardize button shape site-wide: xl (pill) is already the dominant radius
  // and matches the homepage CTAs, so every Button defaults to it unless a call
  // site overrides. Keeps borders/sizes consistent across the app.
  components: {
    Button: Button.extend({
      defaultProps: { radius: "xl" },
    }),
  },
});
