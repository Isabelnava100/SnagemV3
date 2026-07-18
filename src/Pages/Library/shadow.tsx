import { Anchor, Badge, Box, Divider, Group, List, Stack, Table, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

const PANEL = "#171022";
const PANEL_BORDER = "#271e38";

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <Box
      p="lg"
      style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}`, borderRadius: 14 }}
    >
      <Title order={3} c="white" fz={20} mb={8}>
        {props.title}
      </Title>
      {props.children}
    </Box>
  );
}

/**
 * Library wing explaining the growth stats a pokemon earns from roleplay:
 * experience, friendship, shadow and purification, plus how to clear the Shadow
 * status. First-pass content; refine copy later.
 */
export default function ShadowGuideTab() {
  return (
    <Stack gap={16}>
      <Box>
        <Title order={2} c="white">
          Growth, Shadow &amp; Purification
        </Title>
        <Text c="gray.4" fz={14} mt={4}>
          Every roleplay post you make with a team grows the pokemon on it. Here is what each stat
          does, how it is earned, and how to cure a shadowed pokemon.
        </Text>
      </Box>

      <Section title="The four stats">
        <Text c="gray.3" fz={14} mb={10}>
          Under a post you will see the stats it earned, abbreviated (hover any of them for the full
          name), for example: <Text span c="teal.4" fw={700}>10 exp | 2 frn | 1 shd | 5 prf</Text>.
          Friendship, Shadow and Purification each run from 0 to 100.
        </Text>
        <Table.ScrollContainer minWidth={480}>
          <Table verticalSpacing="sm" horizontalSpacing="md" c="gray.3" fz={14}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Stat</Table.Th>
                <Table.Th>What it does</Table.Th>
                <Table.Th>Per qualifying post</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Text c="white" fw={700}>
                    Experience (exp)
                  </Text>
                </Table.Td>
                <Table.Td>Levels the pokemon up (max level 100), which unlocks level evolutions.</Table.Td>
                <Table.Td>A set amount per thread (max is level 100).</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Text c="white" fw={700}>
                    Friendship (frn)
                  </Text>
                </Table.Td>
                <Table.Td>A full bar (100) unlocks evolutions that need friendship.</Table.Td>
                <Table.Td>+2, until it reaches 100.</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Text c="white" fw={700}>
                    Shadow (shd)
                  </Text>
                </Table.Td>
                <Table.Td>Corruption. At 100 the pokemon becomes Shadow'ed.</Table.Td>
                <Table.Td>25% chance of +1 per team pokemon (stops at 100).</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Text c="white" fw={700}>
                    Purification (prf)
                  </Text>
                </Table.Td>
                <Table.Td>Cleanses a shadowed pokemon. A full bar (100) clears the Shadow status.</Table.Td>
                <Table.Td>Only a Shadow'ed pokemon earns it: 80% chance of +5.</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Text c="gray.5" fz={12} mt={8}>
          Maxed stats stop showing under your posts, and short posts below the thread's minimum
          length do not earn anything. Some threads are marked as giving no experience at all.
        </Text>
      </Section>

      <Section title="Shadow status">
        <Group gap={8} mb={8}>
          <Badge color="dark" style={{ background: "#000", border: "1px solid #5a3fb0" }}>
            Shadow'ed
          </Badge>
          <Text c="gray.4" fz={13}>
            A shadowed pokemon shows a black sprite background and a Shadow'ed badge.
          </Text>
        </Group>
        <List c="gray.3" fz={14} spacing={6}>
          <List.Item>
            A pokemon becomes <b>Shadow'ed</b> when its Shadow reaches 100. Its heart has been shut,
            and it will not grow the same way until it is cured.
          </List.Item>
          <List.Item>
            While shadowed, it earns <b>Purification</b> instead. Keep roleplaying with it and its
            Purification climbs (80% chance of +5 per post).
          </List.Item>
          <List.Item>
            When Purification reaches 100, the Shadow status clears automatically and both bars
            reset.
          </List.Item>
          <List.Item>
            You can cure it instantly with a <b>Shadow Vaccine</b> from your bag (the purify button
            appears on the pokemon), which clears the Shadow and banks the cleared amount as
            Purification.
          </List.Item>
        </List>
      </Section>

      <Section title="Shadow Moves">
        <Text c="gray.3" fz={14}>
          Shadow'ed pokemon can learn Shadow Moves, a special move class with its own rules. The full
          list and how they work live in the Shadow Codex.
        </Text>
        <Anchor component={Link} to="/Library?tab=moves" c="grape.3" fz={14} mt={6} display="inline-block">
          Open the Shadow Codex (all Shadow Moves) →
        </Anchor>
      </Section>

      <Divider color={PANEL_BORDER} />
      <Text c="gray.5" fz={12}>
        Looking for more? The <Anchor component={Link} to="/Library?tab=faq" c="blue.3">Help Desk</Anchor>{" "}
        answers common questions about experience, evolution and shadow status.
      </Text>
    </Stack>
  );
}
