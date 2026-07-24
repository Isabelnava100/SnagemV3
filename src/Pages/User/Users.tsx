import {
  Avatar,
  Box,
  Center,
  Container,
  Group,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "@tabler/icons-react";
import { PageHero } from "../../components/common/PageHero";
import Seo from "../../components/common/Seo";
import { SectionLoader } from "../../components/navigation/loading";
import { clickable } from "../../lib/a11y";
import useMediaQuery from "../../hooks/useMediaQuery";
import { getMembers, MemberCard } from "../../queries/members";

/**
 * Snagem Members: public directory of everyone in the users collection. Each
 * card links to that member's public profile (/Users/:username). Read-only.
 */

const DISPLAY_FONT = "var(--font-display, 'Quantico', sans-serif)";

const ROLES = ["All", "Admin", "Director", "Master", "Verified", "New", "Applicant", "Disabled"];

const ROLE_COLOR: Record<string, string> = {
  Admin: "#E54156",
  Director: "#E599F7",
  Master: "#B197FC",
  Verified: "#12B7B6",
  New: "#8CE99A",
  Applicant: "#ADB5BD",
  Disabled: "#FF8787",
};

/** Redesign-palette banner gradients, hashed per member for a stable look. */
const CARD_GRADIENTS = [
  "linear-gradient(90deg, #912691 0%, #4D14C4 100%)",
  "linear-gradient(90deg, #772976 0%, #E54156 100%)",
  "linear-gradient(90deg, #14252A 0%, #1F6F7A 55%, #12B7B6 100%)",
  "linear-gradient(90deg, #1C2A4A 0%, #2C5234 100%)",
  "linear-gradient(90deg, #912691 0%, #474D9B 100%)",
  "linear-gradient(90deg, #3A1D63 0%, #1C2A4A 100%)",
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

function StatCell(props: { value: React.ReactNode; label: string; divider?: boolean }) {
  return (
    <Box
      style={{
        flex: 1,
        borderLeft: props.divider ? "1px solid #2a2637" : undefined,
      }}
    >
      <Text c="#fff" fw={800} fz={18} lh={1.2}>
        {props.value}
      </Text>
      <Text
        c="#b6b1bc"
        fz={14}
        fw={700}
        tt="uppercase"
        style={{ letterSpacing: "0.12em" }}
      >
        {props.label}
      </Text>
    </Box>
  );
}

function MemberGridCard({ member }: { member: MemberCard }) {
  const navigate = useNavigate();
  const go = () => navigate(`/Users/${encodeURIComponent(member.username)}`);
  const role = member.permissions && ROLE_COLOR[member.permissions] ? member.permissions : undefined;
  const joined = monthYear(member.joinedAt?.seconds);
  const initials = member.username.slice(0, 2).toUpperCase() || "??";

  return (
    <Box
      {...clickable(go)}
      aria-label={`View ${member.username}'s profile`}
      className="dc-card"
      style={{ display: "block", overflow: "hidden", cursor: "pointer", textDecoration: "none" }}
    >
      <Box
        h={64}
        style={{
          background: gradientFor(member.username),
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 14px), 0 100%)",
        }}
      />
      <Box
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 18px 22px",
          marginTop: -34,
          textAlign: "center",
        }}
      >
        <Avatar
          src={member.avatar}
          size={68}
          radius="50%"
          styles={{
            root: { border: "3px solid #17151c", background: "#141318" },
            placeholder: {
              background: "#141318",
              color: "#fff",
              fontFamily: DISPLAY_FONT,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.04em",
            },
          }}
        >
          {initials}
        </Avatar>

        <Text
          fz={18}
          fw={700}
          c="#fff"
          mt={10}
          lineClamp={1}
          w="100%"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {member.username || "Unnamed"}
        </Text>

        {role && (
          <Text
            fz={14}
            fw={700}
            tt="uppercase"
            mt={4}
            style={{ color: ROLE_COLOR[role], fontFamily: DISPLAY_FONT, letterSpacing: "0.16em" }}
          >
            {role}
          </Text>
        )}

        {member.featured && (
          <Group
            gap={10}
            wrap="nowrap"
            w="100%"
            mt={12}
            p={0}
            style={{
              background: "#141318",
              border: "1px solid #2a2637",
              padding: "8px 12px",
            }}
          >
            <Avatar src={member.featured.imageURL} size={28} radius={0}>
              {member.featured.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <Box style={{ minWidth: 0, textAlign: "left" }}>
              <Text
                c="#FFD074"
                fz={14}
                fw={700}
                tt="uppercase"
                style={{ fontFamily: DISPLAY_FONT, letterSpacing: "0.14em" }}
              >
                Featured
              </Text>
              <Text c="#fff" fz={14} lineClamp={1}>
                {member.featured.name}
              </Text>
            </Box>
          </Group>
        )}

        <Box
          style={{
            display: "flex",
            gap: 0,
            width: "100%",
            borderTop: "1px solid #2a2637",
            marginTop: 14,
            paddingTop: 14,
          }}
        >
          <StatCell value={member.postCount || "-"} label="Posts" />
          <StatCell value={member.charCount} label="Chars" divider />
          <StatCell value={member.pokemonCount} label="Pokemon" divider />
        </Box>

        {joined && (
          <Text c="#b6b1bc" fz={14} mt={14}>
            Joined {joined}
          </Text>
        )}
      </Box>
    </Box>
  );
}

export default function Users() {
  const { data, isPending } = useQuery({
    queryKey: ["members"],
    queryFn: getMembers,
    // The directory costs 3 Firestore reads per member and changes rarely,
    // so keep it fresh for 30 minutes instead of the 2 minute default.
    staleTime: 30 * 60 * 1000,
  });
  const { isOverSm } = useMediaQuery();
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
      <Seo noindex title="Members Hub | Snagem Guild" />
      <Container size="lg" pt={{ base: 24, sm: 40 }} px={{ base: 12, sm: 20 }}>
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
              radius={0}
              w={isOverSm ? 300 : "100%"}
              styles={{
                input: {
                  background: "rgba(10,9,13,0.5)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "#fff",
                  height: 50,
                  fontSize: 15,
                },
              }}
            />
          }
          mb={0}
        />
      </Container>

      <Container size="lg" py={20} px={{ base: 12, sm: 20 }}>
        <Group justify="space-between" align="center" mb={20} wrap="wrap" gap={16}>
          <Group gap={8} wrap="wrap">
            {ROLES.map((r) => {
              const on = role === r;
              return (
                <UnstyledButton
                  key={r}
                  onClick={() => setRole(r)}
                  aria-label={`Filter by ${r}`}
                  aria-pressed={on}
                  className="dc-card"
                  style={{
                    flex: "none",
                    background: on ? "linear-gradient(90deg, #912691, #4D14C4)" : undefined,
                    border: on ? "1px solid transparent" : undefined,
                    color: "#fff",
                    fontFamily: DISPLAY_FONT,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    padding: "11px 20px",
                  }}
                >
                  {r.toUpperCase()}
                </UnstyledButton>
              );
            })}
          </Group>

          <Group gap={14} align="center" wrap="wrap">
            <Text
              fz={14}
              fw={700}
              c="#b6b1bc"
              tt="uppercase"
              style={{ fontFamily: DISPLAY_FONT, letterSpacing: "0.16em" }}
            >
              Sort
            </Text>
            {SORTS.map((s) => {
              const on = sort === s.key;
              return (
                <UnstyledButton
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  aria-label={`Sort by ${s.label}`}
                  aria-pressed={on}
                  style={{
                    background: "transparent",
                    color: on ? "#FFD074" : "#b6b1bc",
                    fontFamily: DISPLAY_FONT,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    padding: "4px 2px",
                    borderBottom: `2px solid ${on ? "#FFD074" : "transparent"}`,
                  }}
                >
                  {s.label.toUpperCase()}
                </UnstyledButton>
              );
            })}
          </Group>
        </Group>

        {isPending ? (
          <SectionLoader />
        ) : !members.length ? (
          <Center py={60}>
            <Text fz={15} c="#b6b1bc" ta="center">
              No trainers match that search.
            </Text>
          </Center>
        ) : (
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {members.map((m) => (
              <MemberGridCard key={m.id} member={m} />
            ))}
          </Box>
        )}
      </Container>
    </Box>
  );
}
