import {
  Avatar,
  Box,
  Card,
  Center,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "@tabler/icons-react";
import { PageHero } from "../../components/common/PageHero";
import { SectionLoader } from "../../components/navigation/loading";
import { clickable } from "../../lib/a11y";
import { getMembers, MemberCard } from "../../queries/members";

/**
 * Snagem Members: public directory of everyone in the users collection. Each
 * card links to that member's public profile (/Users/:username). Read-only.
 */

const ROLES = ["All", "Admin", "Director", "Master", "Verified", "New", "Applicant", "Disabled"];

const ROLE_COLOR: Record<string, string> = {
  Admin: "#F79292",
  Director: "#E599F7",
  Master: "#B197FC",
  Verified: "#63E6BE",
  New: "#8CE99A",
  Applicant: "#ADB5BD",
  Disabled: "#FF8787",
};

const CARD_GRADIENTS = [
  "linear-gradient(90deg, #104459 0%, #3B7A57 100%)",
  "linear-gradient(90deg, #2C5364 0%, #203A43 100%)",
  "linear-gradient(90deg, #614385 0%, #516395 100%)",
  "linear-gradient(90deg, #8E2DE2 0%, #4A00E0 100%)",
  "linear-gradient(90deg, #7B4397 0%, #DC2430 100%)",
  "linear-gradient(90deg, #355C7D 0%, #6C5B7B 100%)",
];

const gradientFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % CARD_GRADIENTS.length;
  return CARD_GRADIENTS[h];
};

const monthYear = (seconds?: number) => {
  if (!seconds) return null;
  return new Date(seconds * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

type SortKey = "active" | "posts" | "az";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "active", label: "Recently active" },
  { key: "posts", label: "Most posts" },
  { key: "az", label: "A-Z" },
];

function Stat(props: { value: number | null; label: string }) {
  return (
    <Stack gap={0} align="center">
      <Text c="white" fw={700} fz={20} lh={1.1}>
        {props.value ?? "-"}
      </Text>
      <Text c="dimmed" fz={14} tt="uppercase" fw={600}>
        {props.label}
      </Text>
    </Stack>
  );
}

function MemberGridCard({ member }: { member: MemberCard }) {
  const navigate = useNavigate();
  const go = () => navigate(`/Users/${encodeURIComponent(member.username)}`);
  const role = member.permissions && ROLE_COLOR[member.permissions] ? member.permissions : undefined;
  const joined = monthYear(member.joinedAt?.seconds);

  return (
    <Card
      {...clickable(go)}
      aria-label={`View ${member.username}'s profile`}
      bg="#232122"
      radius="lg"
      p={0}
      withBorder
      style={{ overflow: "hidden", cursor: "pointer" }}
    >
      <Box h={54} style={{ background: gradientFor(member.username) }} />
      <Stack gap={6} align="center" px={14} pb={14} mt={-28}>
        <Avatar src={member.avatar} size={72} radius="50%" style={{ border: "3px solid #232122" }}>
          {member.username.slice(0, 2).toUpperCase()}
        </Avatar>
        <Stack gap={0} align="center">
          <Text c="white" fw={600} fz={20} lineClamp={1}>
            {member.username || "Unnamed"}
          </Text>
          {role && (
            <Text fz={14} fw={700} tt="uppercase" style={{ color: ROLE_COLOR[role], letterSpacing: 0.5 }}>
              {role}
            </Text>
          )}
        </Stack>

        {member.featured && (
          <Group gap={8} wrap="nowrap" w="100%" mt={4} bg="#1c1a1b" py={6} px={10} style={{ borderRadius: 8 }}>
            <Avatar src={member.featured.imageURL} size={26} radius="sm">
              {member.featured.name.slice(0, 1)}
            </Avatar>
            <Box style={{ minWidth: 0 }}>
              <Text c="dimmed" fz={14} tt="uppercase" fw={700}>
                Featured
              </Text>
              <Text c="white" fz={14} lineClamp={1}>
                {member.featured.name}
              </Text>
            </Box>
          </Group>
        )}

        <Group justify="space-between" w="100%" mt={6} px={4}>
          <Stat value={member.postCount} label="Posts" />
          <Stat value={member.charCount} label="Chars" />
          <Stat value={member.pokemonCount} label="Pokemon" />
        </Group>

        {joined && (
          <Text c="dimmed" fz={14} mt={2}>
            Joined {joined}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export default function Users() {
  const { data, isPending } = useQuery({ queryKey: ["members"], queryFn: getMembers });
  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState("All");
  const [sort, setSort] = React.useState<SortKey>("active");

  const members = React.useMemo(() => {
    let list = data ?? [];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((m) => m.username.toLowerCase().includes(q));
    if (role !== "All") list = list.filter((m) => m.permissions === role);
    const sorted = [...list];
    if (sort === "az") sorted.sort((a, b) => a.username.localeCompare(b.username));
    else if (sort === "posts") sorted.sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0));
    else sorted.sort((a, b) => (b.joinedAt?.seconds ?? 0) - (a.joinedAt?.seconds ?? 0));
    return sorted;
  }, [data, search, role, sort]);

  const total = data?.length ?? 0;

  return (
    <Box>
      <Container size="xl" pt={{ base: 24, sm: 40 }} px={{ base: 12, sm: 20 }}>
        <PageHero
          eyebrow="The Guild Roster"
          title="Snagem Members"
          subtitle={isPending ? "Loading the roster..." : `${members.length} of ${total} trainers`}
          aside={
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder="Search by username..."
              aria-label="Search members by username"
              leftSection={<IconSearch size={16} />}
              radius="xl"
              w={{ base: "100%", sm: 320 }}
              styles={{ input: { background: "rgba(0,0,0,0.25)", border: "none", color: "white" } }}
            />
          }
          mb={0}
        />
      </Container>

      <Container size="xl" py={20} px={{ base: 12, sm: 20 }}>
        <Group justify="space-between" align="center" mb={18} wrap="wrap" gap={12}>
          <Group gap={8}>
            {ROLES.map((r) => (
              <Box
                key={r}
                {...clickable(() => setRole(r))}
                aria-label={`Filter by ${r}`}
                px={14}
                py={6}
                style={{
                  borderRadius: 999,
                  cursor: "pointer",
                  background: role === r ? "#8C2595" : "#2b2a2b",
                }}
              >
                <Text fz={14} fw={600} c={role === r ? "white" : "dimmed"}>
                  {r}
                </Text>
              </Box>
            ))}
          </Group>
          <Group gap={12}>
            <Text fz={14} c="dimmed" tt="uppercase" fw={700}>
              Sort
            </Text>
            {SORTS.map((s) => (
              <Box key={s.key} {...clickable(() => setSort(s.key))} aria-label={`Sort by ${s.label}`} style={{ cursor: "pointer" }}>
                <Text fz={14} fw={600} c={sort === s.key ? "grape.2" : "dimmed"}>
                  {s.label}
                </Text>
              </Box>
            ))}
          </Group>
        </Group>

        {isPending ? (
          <SectionLoader />
        ) : !members.length ? (
          <Center py={60}>
            <Text c="dimmed">No members match your filters.</Text>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5 }} spacing="md">
            {members.map((m) => (
              <MemberGridCard key={m.id} member={m} />
            ))}
          </SimpleGrid>
        )}
      </Container>
    </Box>
  );
}
