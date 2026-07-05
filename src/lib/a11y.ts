import React from "react";

/**
 * Make a non-button element behave like a button for keyboard and screen-reader
 * users. Spread onto any <Box>/<div> that has an onClick, so Enter and Space
 * activate it and it exposes a button role and is focusable.
 *
 *   <Box {...clickable(() => open())} aria-label="Open box">…</Box>
 */
export function clickable(onClick: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
  };
}
