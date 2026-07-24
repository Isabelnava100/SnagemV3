import { Button, Group, Popover, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ReactNode } from "react";

/**
 * A reusable "are you sure?" guard for destructive actions. Wrap any trigger
 * (button, ActionIcon, menu item) via the `target` render prop; it renders the
 * trigger inside a Popover and only calls `onConfirm` after the user confirms
 * in the popover. Matches the inline-confirm pattern already used across the
 * dashboard (Characters, Pokemons, Announcements) so every delete looks the
 * same. The Popover inherits the theme's viewport-safe defaults, so the confirm
 * always stays on screen.
 *
 * @example
 * <ConfirmPopover
 *   message="Pull this listing? This can't be undone."
 *   confirmLabel="Pull listing"
 *   onConfirm={pull}
 *   target={(open) => <Button color="red" onClick={open}>Pull listing</Button>}
 * />
 */
export function ConfirmPopover(props: {
  /** The question shown in the confirm popover. */
  message: ReactNode;
  /** Renders the trigger; call `open` from its onClick to raise the confirm. */
  target: (open: () => void) => ReactNode;
  onConfirm: () => void | Promise<unknown>;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /**
   * When true, onConfirm is awaited: the popover stays open (showing
   * `loading`) while the action runs, closes on success, and stays open on
   * failure so the caller's error feedback lands in view. Default closes
   * immediately (legacy behavior for callers whose trigger shows progress).
   */
  awaitConfirm?: boolean;
  color?: string;
  position?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-end"
    | "top-start"
    | "bottom-end"
    | "bottom-start";
}) {
  const {
    message,
    target,
    onConfirm,
    confirmLabel = "Delete",
    cancelLabel = "Keep",
    loading,
    awaitConfirm = false,
    color = "red",
    position = "bottom-end",
  } = props;
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Popover withArrow shadow="md" position={position} opened={opened} onClose={close}>
      <Popover.Target>{target(open) as any}</Popover.Target>
      <Popover.Dropdown>
        <Stack gap={10} maw={260}>
          <Text fz={14}>{message}</Text>
          <Group gap={8}>
            <Button
              size="xs"
              color={color}
              loading={loading}
              onClick={async () => {
                if (!awaitConfirm) {
                  onConfirm();
                  close();
                  return;
                }
                try {
                  await onConfirm();
                  close();
                } catch {
                  // The caller's error feedback (toast) explains; stay open.
                }
              }}
            >
              {confirmLabel}
            </Button>
            <Button size="xs" color="gray" variant="light" onClick={close}>
              {cancelLabel}
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
