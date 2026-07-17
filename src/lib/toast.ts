import { notifications } from "@mantine/notifications";

/**
 * Thin wrapper over @mantine/notifications so mutations report success/failure
 * consistently instead of failing silently. Provider mounted in routes.tsx.
 */
export function toastSuccess(message: string, title?: string): void {
  notifications.show({ title, message, color: "teal", autoClose: 3500 });
}

export function toastError(err: unknown, fallback = "Something went wrong. Please try again."): void {
  const raw = (err as { message?: string })?.message;
  const message = raw && !/internal/i.test(raw) ? raw : fallback;
  notifications.show({ title: "Something went wrong", message, color: "red", autoClose: 6000 });
}
