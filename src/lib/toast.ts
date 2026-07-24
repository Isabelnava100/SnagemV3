import { notifications } from "@mantine/notifications";

/**
 * Thin wrapper over @mantine/notifications so mutations report success/failure
 * consistently instead of failing silently. Provider mounted in routes.tsx.
 */

/** User-safe error text: raw message unless it is server jargon. */
export function friendlyMessage(err: unknown, fallback: string): string {
  const raw = (err as { message?: string })?.message;
  // Server jargon (callable codes, rules denials, auth errors) must not reach
  // members raw; show the friendly fallback instead.
  return raw && !/internal|failed[-_ ]?precondition|permission|unauthenticated|unauthorized/i.test(raw)
    ? raw
    : fallback;
}

export function toastSuccess(message: string, title?: string): void {
  notifications.show({ title, message, color: "teal", autoClose: 3500 });
}

export function toastError(err: unknown, fallback = "Something went wrong. Please try again."): void {
  notifications.show({ title: "Something went wrong", message: friendlyMessage(err, fallback), color: "red", autoClose: 6000 });
}
