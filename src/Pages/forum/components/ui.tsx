import { Box, Button, Flex, Group, Modal, Paper, Text, Title } from "@mantine/core";
import React from "react";
import GradientButtonPrimary from "../../../components/common/GradientButton";
import useMediaQuery from "../../../hooks/useMediaQuery";
import { FORUM_LINK_COLOR, PANEL_GRADIENT } from "../config";

/** Composer/thread panel with the teal-purple gradient header from the design. */
export function ForumPanel(props: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  mt?: number;
}) {
  const { isOverSm } = useMediaQuery();
  return (
    <Paper bg="#282727" radius={12} mt={props.mt} style={{ overflow: "hidden" }}>
      <Flex
        py={8}
        px={16}
        w="100%"
        justify="space-between"
        align="center"
        style={{ background: PANEL_GRADIENT }}
      >
        <Title order={3} fz={isOverSm ? 18 : 15} c="white">
          {props.title}
        </Title>
        {props.action}
      </Flex>
      <Box p={isOverSm ? 16 : 10}>{props.children}</Box>
    </Paper>
  );
}

/** Small dimmed helper text used under panel headers in the design. */
export function PanelHint(props: { children: React.ReactNode }) {
  return (
    <Text fz={11} c="dimmed" mb={8}>
      {props.children}
    </Text>
  );
}

/** Text link in the forum link color (#346CFD), annotation 1 on the board. */
export function ForumTextLink(props: {
  children: React.ReactNode;
  onClick?: () => void;
  component?: any;
  to?: string;
  target?: string;
  fz?: number;
}) {
  const { component, ...rest } = props;
  const Comp: any = component ?? "button";
  return (
    <Comp
      {...(component ? { to: rest.to, target: rest.target } : { type: "button" })}
      onClick={rest.onClick}
      style={{
        color: FORUM_LINK_COLOR,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        textDecoration: "underline",
        fontSize: rest.fz ?? 12,
        fontFamily: "inherit",
      }}
    >
      {props.children}
    </Comp>
  );
}

/**
 * Confirmation modal required by the board for archive, boss-battle start and
 * boss-battle end actions.
 */
export function ConfirmModal(props: {
  opened: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title={<Text fw={700}>{props.title}</Text>}
      centered
      radius={12}
    >
      <Text fz={14}>{props.message}</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="subtle" color="gray" onClick={props.onClose}>
          Cancel
        </Button>
        <GradientButtonPrimary radius="xl" loading={props.loading} onClick={props.onConfirm}>
          {props.confirmLabel}
        </GradientButtonPrimary>
      </Group>
    </Modal>
  );
}

/** Pink game-result text used inside post blocks ("A D20 has been rolled..."). */
export function GameResultText(props: { children: React.ReactNode }) {
  return (
    <Text fz={13} c="#E54156" fw={500}>
      {props.children}
    </Text>
  );
}
