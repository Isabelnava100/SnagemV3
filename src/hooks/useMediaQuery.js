import { useMantineTheme } from "@mantine/core";
import { useMediaQuery as useCoreMediaQuery } from "@mantine/hooks";

export default function useMediaQuery() {
  const { breakpoints } = useMantineTheme();

  const isOverSm = useCoreMediaQuery(`(min-width: ${breakpoints.sm}px)`);
  const isOverMd = useCoreMediaQuery(`(min-width: ${breakpoints.md}px)`);
  const isOverLg = useCoreMediaQuery(`(min-width: ${breakpoints.lg}px)`);
  const isOverXl = useCoreMediaQuery(`(min-width: ${breakpoints.xl}px)`);

  return { isOverSm, isOverMd, isOverLg, isOverXl };
}
