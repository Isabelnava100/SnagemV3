import { Button, useMantineTheme, type ButtonProps } from "@mantine/core";
import { HTMLAttributes } from "react";

export default function GradientButtonPrimary({
  children,
  variant = "gradient",
  radius = 10,
  gradient = undefined,
  ...props
}: { children: React.ReactNode } & ButtonProps & HTMLAttributes<HTMLButtonElement>) {
  const theme = useMantineTheme();
  return (
    <Button
      variant={variant}
      radius={radius}
      gradient={gradient || { from: theme.colors.pink[2], to: theme.colors.pink[0] }}
      {...props}
    >
      {children}
    </Button>
  );
}

export function GradientButtonSecondary({
  children,
  variant = "gradient",
  radius = 10,
  gradient = undefined,
  ...props
}: { children: React.ReactNode } & ButtonProps & HTMLAttributes<HTMLButtonElement>) {
  const theme = useMantineTheme();
  return (
    <Button
      variant={variant}
      radius={radius}
      gradient={gradient || { from: theme.colors.violet[0], to: theme.colors.cyan[0] }}
      {...props}
    >
      {children}
    </Button>
  );
}
