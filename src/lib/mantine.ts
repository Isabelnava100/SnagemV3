import { MantineThemeOverride } from "@mantine/core";

export const theme: MantineThemeOverride = {
  colorScheme: "dark",
  colors: {
    brand: [
      "#F7DBF7",
      "#E4BFE4",
      "#D1A2D1",
      "#C17DC1",
      "#AC5DAB",
      "#782A77",
      "#651664",
      "#4C094B",
      "#3B053A",
      "#2A0229",
    ],
    pink: ["#E35C65", "#B1446D", "#7E2C75", "#912691"],
    green: ["#22B573"],
    violet: ["#4D14C4"],
    cyan: ["#12B7B6", "#14B1B6"],
  },
  primaryColor: "brand",
  white: "#FFFFFF",
  breakpoints: {
    md: 900,
    xl: 1440,
    xs: 480,
    sm: 800,
    lg: 1200,
  },
  fontFamily: "'Roboto', sans-serif",
};
