import { Anchor, Badge, Group, Stack, Table, Text, Title, Box, ScrollArea } from "@mantine/core";
import { Link } from "react-router-dom";
import { FORUM_CATEGORIES } from "../forum/config";

/**
 * Library wing: what each forum category is for, who can create threads in
 * it, and where gated things actually start (e.g. missions start from the
 * Missions page, not the forum). Meant to answer the "why can't I make a
 * thread here?" questions before anyone has to ask.
 */

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={6}>
      <Title order={3} c="white" size={18} fw={600}>
        {props.title}
      </Title>
      <Box c="rgba(255,255,255,0.75)" fz={14} style={{ lineHeight: 1.7 }}>
        {props.children}
      </Box>
    </Stack>
  );
}

const CREATE_LABEL: Record<string, string> = {
  admin: "Admins only",
  any: "Any member",
  "event-host": "Admins & event hosts",
  "main-host": "Admins & directors",
  master: "Master members",
  none: "No one directly",
};

export default function ForumGuideTab() {
  return (
    <Stack gap={20}>
      <Section title="The forum categories">
        <Text mb={8}>
          Every category has its own purpose and its own rules about who can
          start threads. Anyone can read and (unless the host restricted a
          thread) reply; creating threads is what differs.
        </Text>
        <ScrollArea type="auto">
          <Table withTableBorder withColumnBorders fz={13} miw={560}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Category</Table.Th>
                <Table.Th>What it is for</Table.Th>
                <Table.Th>Who creates threads</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {FORUM_CATEGORIES.map((c) => (
                <Table.Tr key={c.link}>
                  <Table.Td fw={600} c="white">
                    {c.label}
                  </Table.Td>
                  <Table.Td>{c.description}</Table.Td>
                  <Table.Td>
                    {c.questGated ? (
                      <>
                        {CREATE_LABEL[c.create]} — pick up a mission from the{" "}
                        <Anchor component={Link} to="/Missions" c="blue.3">
                          Missions page
                        </Anchor>{" "}
                        and your thread is created for you.
                      </>
                    ) : (
                      CREATE_LABEL[c.create]
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
              <Table.Tr>
                <Table.Td fw={600} c="white">
                  Master Missions
                </Table.Td>
                <Table.Td>
                  Hybrid and Channeler progression missions. Visible to Master-tier
                  members; request clearance from the Research page.
                </Table.Td>
                <Table.Td>Master members</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Section>

      <Section title="Things that start OUTSIDE the forum">
        <Stack gap={6}>
          <Text>
            <Text span fw={600} c="white">Missions:</Text> never created in the forum
            directly. Go to the{" "}
            <Anchor component={Link} to="/Missions" c="blue.3">
              Missions page
            </Anchor>
            , pick one up, and the Quests thread is created for you with the
            briefing and its encounter list attached.
          </Text>
          <Text>
            <Text span fw={600} c="white">Training posts:</Text> start from the{" "}
            <Anchor component={Link} to="/Colosseum" c="blue.3">
              Colosseum
            </Anchor>{" "}
            (Log a Training Post), which opens the shared Super Training Room
            thread with your target attached. Direct replies bounce back there.
          </Text>
          <Text>
            <Text span fw={600} c="white">Safari Contests:</Text> launched by staff
            from Admin &gt; Manage &gt; Safari Contest into the Events category.
          </Text>
          <Text>
            <Text span fw={600} c="white">Challenges &amp; badge runs:</Text>{" "}
            requested from the{" "}
            <Anchor component={Link} to="/Challenges" c="blue.3">
              Challenges page
            </Anchor>
            ; staff resolve the request and set up the battle.
          </Text>
        </Stack>
      </Section>

      <Section title="Inside a thread">
        <Stack gap={6}>
          <Text>
            <Text span fw={600} c="white">Hosts</Text> (the thread creator) manage
            their thread from the Host Menu: edit details, restrict who can post,
            run boss battles, and close the thread when the story wraps.
          </Text>
          <Text>
            <Text span fw={600} c="white">Team lock:</Text> on normal roleplay
            threads you keep the team from your first post (see the Battle Guide
            wing). Hosts can allow team changes only when creating the thread.
          </Text>
          <Text>
            <Text span fw={600} c="white">Rolls lock when made:</Text> dice, random
            numbers and encounters bind to your next post the moment you roll
            them; abandoning a draft does not discard a bad roll.
          </Text>
          <Text>
            <Text span fw={600} c="white">Closing:</Text> archives the thread
            read-only and sends it to the staff reward review. Mission threads
            require every set foe beaten first; paused (team-wiped) threads wait
            for a staff decision.
          </Text>
        </Stack>
      </Section>

      <Group gap={8}>
        <Badge color="grape" variant="light" size="sm">
          Full conduct rules: Policies
        </Badge>
        <Badge color="cyan" variant="light" size="sm">
          Battle numbers: Battle Guide wing
        </Badge>
      </Group>
    </Stack>
  );
}
