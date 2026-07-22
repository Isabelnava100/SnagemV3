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
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
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
              onClick={() => {
                onConfirm();
                close();
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
