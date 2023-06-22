import { Button, useMantineTheme, type ButtonProps } from "@mantine/core";
import React, { HTMLAttributes } from "react";

type GradientButtonProps = { children: React.ReactNode } & ButtonProps &
  HTMLAttributes<HTMLButtonElement>;

const GradientButtonPrimary = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ children, variant = "gradient", radius = 10, gradient = undefined, ...props }, ref) => {
    const theme = useMantineTheme();
    return (
      <Button
        ref={ref}
        variant={variant}
        radius={radius}
        gradient={gradient || { from: theme.colors.pink[2], to: theme.colors.pink[0] }}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

export default GradientButtonPrimary;

export const GradientButtonSecondary = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ children, variant = "gradient", radius = 10, gradient = undefined, ...props }, ref) => {
    const theme = useMantineTheme();
    return (
      <Button
        ref={ref}
        variant={variant}
        radius={radius}
        gradient={gradient || { from: theme.colors.violet[0], to: theme.colors.cyan[0] }}
        {...props}
      >
        {children}
      </Button>
    );
  }
);
