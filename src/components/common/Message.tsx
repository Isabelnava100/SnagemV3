import { Stack, Text, Title } from "@mantine/core";
import React from "react";

export function EmptyMessage(props: {
  title?: string;
  description?: string | React.ReactNode;
  action?: React.ReactNode;
}) {
  const { title, description, action } = props;
  return (
    <Stack py={5} w="100%">
      <Stack spacing="xs">
        {title && <Title order={3}>{title}</Title>}
        {description && (
          <Text color="white" size="md">
            {description}
          </Text>
        )}
      </Stack>
      <div>{action}</div>
    </Stack>
  );
}
