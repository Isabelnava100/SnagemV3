import React from "react";

/** Strip HTML tags and collapse whitespace from stored post HTML. */
export function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").replace(/\s+/g, " ").trim();
}

/** Truncate to a max length on a word boundary, adding an ellipsis. */
export function truncate(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 3);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}

/**
 * Extract the plain text of a React node tree (used to turn the Library FAQ's
 * JSX answers into FAQPage schema text without rendering to the DOM).
 */
export function textFromNode(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join(" ");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return textFromNode(props.children);
  }
  return "";
}
