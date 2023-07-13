import { Box, Flex, MultiSelect, Stack, Title } from "@mantine/core";
import { GradientButtonSecondary } from "../../../../components/common/GradientButton";

function TopHeader(props: { children: React.ReactNode }) {
  return (
    <Box
      px={15}
      sx={{ background: "linear-gradient(90deg, #742D78 0%, #239DAD 100%)", borderRadius: 8 }}
      py={10}
    >
      <Title color="white" transform="uppercase" order={3} size={14} weight={700}>
        {props.children}
      </Title>
    </Box>
  );
}

export default function Donate() {
  return (
    <Stack spacing={24}>
      <Flex gap={10}>
        <Stack sx={{ flex: 1 }} spacing={7}>
          <TopHeader>Items to send</TopHeader>
          <MultiSelect radius="md" data={[]} searchable placeholder="Search to add an item" />
        </Stack>
        <Stack w="100%" sx={{ flexShrink: 0 }} maw={250} spacing={7}>
          <TopHeader>To users</TopHeader>
          <MultiSelect radius="md" data={[]} placeholder="Search to add users" />
        </Stack>
      </Flex>

      <GradientButtonSecondary sx={{ alignSelf: "end" }} radius="lg">
        Send Items
      </GradientButtonSecondary>

      <Stack spacing={24}>
        <Title order={2} color="white" size={24} weight={400}>
          Confirm that you’ll be sending these items to these users...
        </Title>
        <Flex gap={10}>
          <Stack bg="#4C474F" sx={{ flex: 1, borderRadius: 8 }} spacing={0}>
            <TopHeader>Items to send</TopHeader>
            <Box p={8}>
              <h3>Content</h3>
            </Box>
          </Stack>
          <Stack
            w="100%"
            maw={250}
            sx={{ borderRadius: 8, flexShrink: 0 }}
            bg="#4C474F"
            spacing={0}
          >
            <TopHeader>To users</TopHeader>
            <Box p={8}>
              <h3>Content</h3>
            </Box>
          </Stack>
        </Flex>
        <GradientButtonSecondary sx={{ alignSelf: "end" }} radius="lg">
          Confirm
        </GradientButtonSecondary>
      </Stack>
    </Stack>
  );
}
