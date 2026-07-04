import { MantineColorsTuple, createTheme } from "@mantine/core";

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
      "#782A77",
      "#651664",
      "#4C094B",
      "#3B053A",
      "#2A0229"
    ),
    pink: shades("#E35C65", "#B1446D", "#7E2C75", "#912691"),
    green: shades("#22B573"),
    violet: shades("#4D14C4"),
    cyan: shades("#12B7B6", "#14B1B6"),
  },
  primaryColor: "brand",
  white: "#FFFFFF",
  breakpoints: {
    xs: "480px",
    sm: "800px",
    md: "900px",
    lg: "1200px",
    xl: "1440px",
  },
  fontFamily: "'Roboto', sans-serif",
});
