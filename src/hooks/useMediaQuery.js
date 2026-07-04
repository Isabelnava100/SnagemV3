import { useMantineTheme } from "@mantine/core";
import { useMediaQuery as useCoreMediaQuery } from "@mantine/hooks";

export default function useMediaQuery() {
  const { breakpoints } = useMantineTheme();

  // theme breakpoint values already include the px unit
  const isOverXs = useCoreMediaQuery(`(min-width: ${breakpoints.xs})`);
  const isOverSm = useCoreMediaQuery(`(min-width: ${breakpoints.sm})`);
  const isOverMd = useCoreMediaQuery(`(min-width: ${breakpoints.md})`);
  const isOverLg = useCoreMediaQuery(`(min-width: ${breakpoints.lg})`);
  const isOverXl = useCoreMediaQuery(`(min-width: ${breakpoints.xl})`);

  return { isOverSm, isOverMd, isOverLg, isOverXl, isOverXs };
}
