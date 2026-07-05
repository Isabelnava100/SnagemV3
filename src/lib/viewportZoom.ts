/**
 * Pinch-to-zoom preference. The site ships with zoom off for an app-like feel,
 * but blocking zoom is an accessibility barrier, so members can turn it on from
 * Settings. We flip the viewport meta tag at runtime and remember the choice.
 */
const KEY = "snagem:zoom-allowed";

export function getZoomAllowed(): boolean {
  try {
    return localStorage.getItem(KEY) === "yes";
  } catch {
    return false;
  }
}

export function setZoomAllowed(allowed: boolean): void {
  try {
    localStorage.setItem(KEY, allowed ? "yes" : "no");
  } catch {
    /* ignore storage failures */
  }
  applyZoomSetting();
}

/** Apply the saved preference to the viewport meta tag. Call once on load. */
export function applyZoomSetting(): void {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  meta.setAttribute(
    "content",
    getZoomAllowed()
      ? "width=device-width, initial-scale=1"
      : "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  );
}
