// Restore `sx`/`styles` props on Mantine v9 components via @mantine/emotion
import type { EmotionSx } from "@mantine/emotion";

declare module "@mantine/core" {
  export interface BoxProps {
    sx?: EmotionSx;
  }
}
