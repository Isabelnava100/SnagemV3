import type { ReactNode } from "react";
import {
  Anchor,
  Avatar,
  Badge,
  Box,
  Container,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconBrandDiscord, IconLock } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Link, useParams } from "react-router-dom";
import Seo from "../../components/common/Seo";
import {
  HERO_BORDER,
  HERO_GRADIENT,
  HERO_STRIPES,
} from "../../components/common/PageHero";
import { SectionLoader } from "../../components/navigation/loading";
import { withSuffix } from "../../lib/seo/site";
import { truncate } from "../../lib/seo/text";
import useMediaQuery from "../../hooks/useMediaQuery";
import { Character, OwnedPokemon } from "../../components/types/typesUsed";
import { getColor1, getColor2 } from "../../components/user-forum/getColorBadges";
import { getDb } from "../../context/firebase";
import { useAuth } from "../../context/AuthContext";
import OwnedPokemonAvatar from "../../components/pokemon/OwnedPokemonAvatar";
import {
  getCharacters,
  getOwnedPokemons,
  getProfile,
  getTeamsRaw,
  hydrateTeams,
} from "../../queries/dashboard";
import { autoBadgeIdsFor, getBadgeCatalog } from "../../queries/badges";
import { emojiData, getEmoteImageURL } from "../../data/emote";

// Redesign surface tokens (mirrors src/assets/styles/redesign.css so this page
// reads like the rest of the cinematic redesign: flat angular panels, dark
// inner wells, Quantico display face).
const DISPLAY_FONT = "var(--font-display, 'Quantico', sans-serif)";
const PANEL_BG = "#17151c";
const PANEL_BORDER = "#2a2637";
const WELL_BG = "#141318";
const DIM = "#b6b1bc";

interface PublicUser {
  uid: string;
  username: string;
  avatar?: string;
  permissions?: string;
  badges?: string[];
  joinedAt?: { seconds: number };
  signature?: string;
  emojis?: string[];
  /** Mirrored only when the member opted in via discordPublic. */
  discordUID?: string;
  discordUsername?: string;
}

// Reads the WORLD-safe projection (publicProfiles), never the users doc, so a
// logged-out visitor can view the profile without exposing email. The mirror
// carries Discord (discordUID/discordUsername) only for members who opted in
// via discordPublic; it is still shown to signed-in viewers only (below).
const getPublicUser = async (username: string): Promise<PublicUser | null> => {
  const { collection, getDocs, limit, query, where } = await import("firebase/firestore");
  const db = await getDb();
  const snap = await getDocs(
    query(collection(db, "publicProfiles"), where("username", "==", username), limit(1))
  );
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  if (!docSnap) return null;
  const data = docSnap.data();
  return {
    uid: docSnap.id,
    username: data.username,
    avatar: data.avatar,
    permissions: data.permissions,
    badges: (data.badges as string[]) ?? [],
    joinedAt: data.joinedAt,
    signature: data.signature,
    emojis: (data.emojis as string[]) ?? [],
    discordUID: data.discordUID,
    discordUsername: data.discordUsername,
  };
};

/**
 * Best-effort forum activity counts. Firestore is billed per aggregation, but
 * getCountFromServer is a single cheap read. Any failure (missing index, no
 * collection group) resolves to null so the card shows a dash instead of
 * breaking the page.
 */
const getActivityCounts = async (
  uid: string
): Promise<{ posts: number | null; threads: number | null }> => {
  const { collectionGroup, getCountFromServer, query, where } = await import(
    "firebase/firestore"
  );
  const db = await getDb();
  const countPosts = async () => {
    try {
      const agg = await getCountFromServer(
        query(collectionGroup(db, "posts"), where("ownerUid", "==", uid))
      );
      return agg.data().count;
    } catch {
      return null;
    }
  };
  const countThreads = async () => {
    try {
      const agg = await getCountFromServer(
        query(collectionGroup(db, "threads"), where("hostUid", "==", uid))
      );
      return agg.data().count;
    } catch {
      try {
        const agg = await getCountFromServer(
          query(collectionGroup(db, "threads"), where("ownerUid", "==", uid))
        );
        return agg.data().count;
      } catch {
        return null;
      }
    }
  };
  const [posts, threads] = await Promise.all([countPosts(), countThreads()]);
  return { posts, threads };
};

function formatJoined(ts?: { seconds: number }): string {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function characterTypeColor(type?: Character["type"]): string {
  if (type === "Hybrid") return "grape";
  if (type === "Channeler") return "violet";
  return "gray";
}

/** Flat angular panel surface (the #17151c bordered card). */
function Panel({
  children,
  px = 28,
  py = 24,
}: {
  children: ReactNode;
  px?: number;
  py?: number;
}) {
  return (
    <Box px={px} py={py} style={{ background: PANEL_BG, border: `1px solid ${PANEL_BORDER}` }}>
      {children}
    </Box>
  );
}

/** Panel sub-header: a short colored rule + uppercase Quantico H2. */
function PanelHeader({
  accent,
  children,
  mb = 16,
}: {
  accent: string;
  children: ReactNode;
  mb?: number;
}) {
  return (
    <Group gap={10} align="center" mb={mb} wrap="nowrap">
      <Box w={22} h={3} style={{ background: accent, flexShrink: 0 }} />
      <Text
        component="h2"
        c="white"
        fz={16}
        fw={700}
        tt="uppercase"
        style={{ margin: 0, letterSpacing: "0.12em", fontFamily: DISPLAY_FONT }}
      >
        {children}
      </Text>
    </Group>
  );
}

/** Small uppercase Quantico eyebrow used inside the identity card. */
function MiniLabel({ children, color = "#FFD074" }: { children: ReactNode; color?: string }) {
  return (
    <Text
      fz={14}
      fw={700}
      tt="uppercase"
      c={color}
      style={{ letterSpacing: "0.16em", fontFamily: DISPLAY_FONT }}
    >
      {children}
    </Text>
  );
}

/** Stat tile: colored left border, big value, uppercase label. */
function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <Box
      px={20}
      py={16}
      style={{
        background: PANEL_BG,
        border: `1px solid ${PANEL_BORDER}`,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <Text fz={{ base: 22, sm: 24 }} fw={800} c="white" style={{ lineHeight: 1.1 }}>
        {value}
      </Text>
      <Text fz={14} fw={700} c={DIM} tt="uppercase" mt={4} style={{ letterSpacing: "0.14em" }}>
        {label}
      </Text>
    </Box>
  );
}

function PokemonSprite({ pokemon, size = 56 }: { pokemon: OwnedPokemon; size?: number }) {
  return <OwnedPokemonAvatar pokemon={pokemon} size={size} />;
}

/**
 * Public member profile: striped cover banner, an identity card that overlaps
 * the banner (collapsing gracefully on mobile) and a right column of stat
 * tiles, description, characters, pokemon box, teams and recent activity.
 * Every section is empty-safe so a sparse profile still renders cleanly.
 */
export default function PublicProfile() {
  const { username } = useParams();
  const { user: viewer } = useAuth();
  const { isOverSm } = useMediaQuery();
  const { data: user, isPending } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => getPublicUser(username!),
    enabled: !!username,
  });

  const uid = user?.uid;
  const { data: profile } = useQuery({
    queryKey: ["get-profile", uid],
    queryFn: () => getProfile(uid!),
    enabled: !!uid,
  });
  const { data: characters } = useQuery({
    queryKey: ["get-characters", uid],
    queryFn: () => getCharacters(uid!),
    enabled: !!uid,
  });
  const { data: teams } = useQuery({
    queryKey: ["get-teams", uid],
    queryFn: () => getTeamsRaw(uid!),
    enabled: !!uid,
  });
  const { data: owned } = useQuery({
    queryKey: ["get-owned-pokemons", uid],
    queryFn: () => getOwnedPokemons(uid!),
    enabled: !!uid,
  });
  const { data: counts } = useQuery({
    queryKey: ["public-activity-counts", uid],
    queryFn: () => getActivityCounts(uid!),
    enabled: !!uid,
  });
  // Status badges (admin/master/new member) derived from the public role, so
  // the Collections "hide from public profile" toggle has something to hide.
  const { data: badgeCatalog } = useQuery({
    queryKey: ["badge-catalog"],
    queryFn: getBadgeCatalog,
    enabled: !!uid,
  });
  const hiddenAuto = new Set(
    ((profile as { hiddenAutoBadges?: string[] } | undefined)?.hiddenAutoBadges ?? []) as string[]
  );
  const autoBadges = (badgeCatalog ?? []).filter(
    (b) =>
      autoBadgeIdsFor({ permissions: user?.permissions }).includes(b.id) && !hiddenAuto.has(b.id)
  );

  if (isPending) {
    return (
      <Container size="lg" mt={40}>
        <SectionLoader />
      </Container>
    );
  }
  if (!user) {
    return (
      <Container size="sm" mt={60}>
        <Stack align="center" gap={8}>
          <Title order={1} c="white" fw={500}>
            Member not found
          </Title>
          <Text c="dimmed" ta="center">
            No member named &quot;{username}&quot; was found.
          </Text>
          <Anchor
            component={Link}
            to="/Users"
            underline="never"
            c={DIM}
            display="inline-block"
            mt={10}
            style={{ fontFamily: DISPLAY_FONT, fontSize: 14, fontWeight: 700, letterSpacing: "0.14em" }}
          >
            ← GUILD ROSTER
          </Anchor>
        </Stack>
      </Container>
    );
  }

  const characterList = characters?.sortedData ?? [];
  const ownedList = owned?.sortedData ?? [];
  const teamList = owned ? hydrateTeams(teams ?? [], ownedList) : teams ?? [];

  const featuredCharacter = characterList.find((c) => c.id === profile?.featuredCharacterId);
  const featuredPokemon = ownedList.find((p) => p.id === profile?.featuredPokemonId);
  const featuredTeam = teamList.find((t) => t.id === profile?.featuredTeamId);

  const tags = (profile?.tags ?? []).slice(0, 6);
  const emojis = user.emojis ?? [];
  const initials = (user.username ?? "?").slice(0, 2).toUpperCase();

  // Custom cover art (profile.coverBG) wins; otherwise the striped hero band.
  const coverBackground = profile?.coverBG
    ? { backgroundImage: `url(${profile.coverBG})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `${HERO_STRIPES}, ${HERO_GRADIENT}` };

  return (
    <Container size="lg" px={{ base: "sm", sm: "md" }} pt="md" pb={80}>
      {/* Profiles are crawl-blocked in robots.txt; meta covers tabs/shares. */}
      <Seo
        title={withSuffix(`${user.username}'s Trainer Profile`)}
        description={truncate(
          `${user.username}'s trainer profile in the Snagem Guild Pokemon roleplay community: characters, Pokemon teams, and roleplay history.`,
          160,
        )}
        canonicalPath={`/Users/${encodeURIComponent(user.username)}`}
        ogType="article"
        schema={{
          "@type": "ProfilePage",
          mainEntity: { "@type": "Person", name: user.username },
        }}
      />

      {/* Back to roster */}
      <Anchor
        component={Link}
        to="/Users"
        underline="never"
        c={DIM}
        display="inline-block"
        mb={18}
        style={{ fontFamily: DISPLAY_FONT, fontSize: 14, fontWeight: 700, letterSpacing: "0.14em" }}
      >
        ← GUILD ROSTER
      </Anchor>

      {/* Cover band: striped gradient with an angled bottom-right corner. */}
      <Box
        style={{
          position: "relative",
          height: isOverSm ? 170 : 120,
          overflow: "hidden",
          border: `1px solid ${HERO_BORDER}`,
          clipPath:
            "polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%)",
          ...coverBackground,
        }}
      />

      {/* Identity card overlaps the banner on desktop; on mobile it stacks with
          a lighter overlap so nothing collides. */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: isOverSm ? "320px 1fr" : "1fr",
          gap: 22,
          alignItems: "start",
          marginTop: isOverSm ? -70 : -40,
          position: "relative",
        }}
      >
        {/* LEFT: identity card */}
        <Box
          px={26}
          py={28}
          style={{
            background: PANEL_BG,
            border: `1px solid ${PANEL_BORDER}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Avatar
            src={user.avatar || undefined}
            alt={`${user.username ?? "User"} avatar`}
            size={110}
            radius="100%"
            styles={{
              root: { border: "3px solid #772976", background: WELL_BG },
              placeholder: {
                background: WELL_BG,
                color: "#fff",
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: 34,
              },
            }}
          >
            {initials}
          </Avatar>

          <Text
            component="h1"
            c="white"
            fw={700}
            fz={26}
            mt={14}
            style={{ fontFamily: DISPLAY_FONT, letterSpacing: "0.02em", lineHeight: 1.15 }}
          >
            {user.username}
          </Text>

          {user.permissions && (
            <Text
              fz={14}
              fw={700}
              tt="uppercase"
              c="#E54156"
              mt={6}
              style={{ letterSpacing: "0.16em", fontFamily: DISPLAY_FONT }}
            >
              {user.permissions}
            </Text>
          )}

          {user.joinedAt?.seconds && (
            <Text fz={14} c={DIM} mt={8}>
              Joined {formatJoined(user.joinedAt)}
            </Text>
          )}

          {/* Opted-in Discord handle, mirrored onto publicProfiles. Shown to
              signed-in members only, matching the pre-mirror behavior. */}
          {viewer && user.discordUsername && (
            <Badge
              variant="filled"
              color="indigo"
              leftSection={<IconBrandDiscord size={13} />}
              radius="sm"
              mt={10}
            >
              {user.discordUsername}
            </Badge>
          )}

          {!!tags.length && (
            <Group gap={6} justify="center" mt={14} wrap="wrap">
              {tags.map((tag) => (
                <Box
                  key={tag}
                  px={14}
                  py={5}
                  style={{
                    background: "#3C3A3C",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    borderRadius: 50,
                  }}
                >
                  {tag}
                </Box>
              ))}
            </Group>
          )}

          {/* Featured picks */}
          {(featuredCharacter || featuredPokemon || featuredTeam) && (
            <Box w="100%" mt={20} pt={18} style={{ borderTop: `1px solid ${PANEL_BORDER}`, textAlign: "left" }}>
              <MiniLabel>Featured</MiniLabel>
              <Stack gap={8} mt={12}>
                {featuredCharacter && (
                  <Group
                    gap={12}
                    wrap="nowrap"
                    px={12}
                    py={10}
                    style={{ background: WELL_BG, border: `1px solid ${PANEL_BORDER}` }}
                  >
                    <Avatar
                      src={featuredCharacter.imageURL || undefined}
                      alt={`${featuredCharacter.name ?? "Character"} portrait`}
                      size={38}
                      radius={0}
                    />
                    <Box style={{ minWidth: 0 }}>
                      <Text fz={15} fw={700} c="#fff" truncate>
                        {featuredCharacter.name}
                      </Text>
                      <Text fz={14} c={DIM}>
                        Character
                      </Text>
                    </Box>
                  </Group>
                )}
                {featuredPokemon && (
                  <Group
                    gap={12}
                    wrap="nowrap"
                    px={12}
                    py={10}
                    style={{ background: WELL_BG, border: `1px solid ${PANEL_BORDER}` }}
                  >
                    <PokemonSprite pokemon={featuredPokemon} size={38} />
                    <Box style={{ minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        <Text fz={15} fw={700} c="#fff" truncate>
                          {featuredPokemon.name}
                        </Text>
                        {featuredPokemon.shiny && (
                          <Badge size="xs" color="gold.0" variant="filled">
                            SHINY
                          </Badge>
                        )}
                      </Group>
                      <Text fz={14} c={DIM}>
                        Pokemon
                      </Text>
                    </Box>
                  </Group>
                )}
                {featuredTeam && (
                  <Box
                    px={12}
                    py={10}
                    style={{ background: WELL_BG, border: `1px solid ${PANEL_BORDER}` }}
                  >
                    <Text fz={15} fw={700} c="#fff" truncate>
                      {featuredTeam.team_name || "Team"}
                    </Text>
                    <Text fz={14} c={DIM}>
                      Team · {featuredTeam.times_battled || 0} battles
                    </Text>
                  </Box>
                )}
              </Stack>
            </Box>
          )}

          {/* Badges */}
          {(!!user.badges?.length || !!autoBadges.length) && (
            <Box w="100%" mt={18} pt={18} style={{ borderTop: `1px solid ${PANEL_BORDER}`, textAlign: "left" }}>
              <MiniLabel color="#12B7B6">Badges</MiniLabel>
              <Group gap={6} mt={12}>
                {(user.badges ?? []).map((badge) => (
                  <Badge
                    key={badge}
                    variant="gradient"
                    gradient={{ from: getColor1(badge), to: getColor2(badge) }}
                  >
                    {badge}
                  </Badge>
                ))}
                {autoBadges.map((badge) => (
                  <Badge
                    key={badge.id}
                    variant="gradient"
                    gradient={{ from: getColor1(badge.name), to: getColor2(badge.name) }}
                  >
                    {badge.name}
                  </Badge>
                ))}
              </Group>
            </Box>
          )}

          {/* Emotes */}
          {!!emojis.length && (
            <Box w="100%" mt={18} pt={18} style={{ borderTop: `1px solid ${PANEL_BORDER}`, textAlign: "left" }}>
              <MiniLabel color="#772976">Emotes</MiniLabel>
              <Group gap={6} mt={12}>
                {emojis.map((emote) => {
                  const data = emojiData.find((e) => e.id === emote || e.Name === emote);
                  return data ? (
                    <Image
                      key={emote}
                      src={getEmoteImageURL(data.Filename)}
                      alt={`${data.Name} guild emote`}
                      title={data.Name}
                      w={28}
                      h={28}
                      fit="contain"
                      loading="lazy"
                      style={{ borderRadius: 6 }}
                    />
                  ) : (
                    <Box
                      key={emote}
                      aria-label={`Emote ${emote}`}
                      title={emote}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: "#2b2a2b",
                        border: "1px solid #3a393b",
                      }}
                    />
                  );
                })}
              </Group>
            </Box>
          )}
        </Box>

        {/* RIGHT: stats + content panels */}
        <Stack gap={18} style={{ minWidth: 0 }}>
          {/* Stat row */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={14}>
            <StatTile label="Posts" value={counts?.posts ?? "-"} accent="#772976" />
            <StatTile label="Threads" value={counts?.threads ?? "-"} accent="#4049C9" />
            <StatTile label="Characters" value={characterList.length} accent="#FFD074" />
            <StatTile label="Pokemon" value={ownedList.length} accent="#12B7B6" />
          </SimpleGrid>

          {/* Description */}
          {profile?.description && (
            <Panel>
              <Box
                c="gray.3"
                style={{ wordBreak: "break-word" }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(profile.description),
                }}
              />
            </Panel>
          )}

          {/* Characters */}
          <Panel>
            <PanelHeader accent="#E54156">Characters</PanelHeader>
            {characterList.length ? (
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                {characterList.map((c) => (
                  <Group
                    key={c.id}
                    gap={16}
                    wrap="nowrap"
                    align="center"
                    px={16}
                    py={14}
                    style={{ background: WELL_BG, border: `1px solid ${PANEL_BORDER}` }}
                  >
                    <Avatar
                      src={c.imageURL || undefined}
                      alt={`${c.name ?? "Character"} portrait`}
                      size={52}
                      radius={0}
                    />
                    <Box style={{ minWidth: 0 }}>
                      <Group gap={10} wrap="nowrap" align="center">
                        <Text fz={16} fw={700} c="#fff" truncate>
                          {c.name}
                        </Text>
                        <Badge
                          color={characterTypeColor(c.type)}
                          radius="xl"
                          size="sm"
                          tt="uppercase"
                          style={{ fontFamily: DISPLAY_FONT, letterSpacing: "0.12em", flexShrink: 0 }}
                        >
                          {c.type ?? "None"}
                        </Badge>
                      </Group>
                      <Text fz={14} c={DIM} mt={4} lineClamp={1}>
                        {[c.species, c.pronouns, c.age].filter(Boolean).join(" · ")}
                      </Text>
                    </Box>
                  </Group>
                ))}
              </SimpleGrid>
            ) : (
              <Text fz={14} c={DIM}>
                No characters yet.
              </Text>
            )}
          </Panel>

          {/* Pokemon box */}
          <Panel>
            <PanelHeader accent="#12B7B6" mb={12}>
              Pokemon Box
            </PanelHeader>
            {ownedList.length ? (
              <SimpleGrid cols={{ base: 4, xs: 6, sm: 8 }} spacing="xs">
                {ownedList.map((p) => (
                  <Box key={p.id} title={p.name || p.species} style={{ textAlign: "center" }}>
                    <PokemonSprite pokemon={p} size={48} />
                  </Box>
                ))}
              </SimpleGrid>
            ) : (
              <Text fz={14} c={DIM}>
                No Pokemon yet.
              </Text>
            )}
          </Panel>

          {/* Teams */}
          <Panel>
            <PanelHeader accent="#FFD074" mb={12}>
              Teams
            </PanelHeader>
            {teamList.length ? (
              <Stack gap="sm">
                {teamList.map((team) => (
                  <Group
                    key={team.id}
                    justify="space-between"
                    wrap="nowrap"
                    gap="sm"
                    px={16}
                    py={12}
                    style={{ background: WELL_BG, border: `1px solid ${PANEL_BORDER}` }}
                  >
                    <Box style={{ minWidth: 0 }}>
                      <Text fz={15} fw={700} c="#fff" truncate>
                        {team.team_name || "Team"}
                      </Text>
                      <Group gap={2} mt={4} wrap="nowrap">
                        {(team.pokemons ?? []).slice(0, 6).map((p) => (
                          <PokemonSprite key={p.id} pokemon={p} size={28} />
                        ))}
                      </Group>
                    </Box>
                    <Text fz={14} c={DIM} style={{ whiteSpace: "nowrap" }}>
                      {team.times_battled || 0} battles
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text fz={14} c={DIM}>
                No teams yet.
              </Text>
            )}
          </Panel>

          {/* Recent activity: members-only. Logged-out visitors see a locked
              placeholder; signed-in members see the section. */}
          <Panel>
            <Group gap={8} mb={12} align="center" wrap="nowrap">
              <Box w={22} h={3} style={{ background: "#772976", flexShrink: 0 }} />
              <Text
                component="h2"
                c="white"
                fz={16}
                fw={700}
                tt="uppercase"
                style={{ margin: 0, letterSpacing: "0.12em", fontFamily: DISPLAY_FONT }}
              >
                Recent Activity
              </Text>
              {!viewer && <IconLock size={13} color="var(--mantine-color-dimmed)" />}
            </Group>
            {viewer ? (
              <Text fz={14} c={DIM}>
                No recent activity.
              </Text>
            ) : (
              <Text fz={14} c={DIM}>
                Sign in to see this member's recent activity.
              </Text>
            )}
          </Panel>

          {/* Signature footer */}
          {user.signature && (
            <Box ta="center" mt="sm">
              <Box
                c="gray.5"
                fz={14}
                style={{ wordBreak: "break-word" }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(user.signature),
                }}
              />
              <Text fz={14} c={DIM} ff="monospace" mt={4}>
                signature
              </Text>
            </Box>
          )}
        </Stack>
      </Box>
    </Container>
  );
}
