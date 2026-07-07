import {
  Avatar,
  Badge,
  Box,
  Card,
  Container,
  Grid,
  Group,
  Image,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconBrandDiscord } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { useParams } from "react-router-dom";
import { SectionLoader } from "../../components/navigation/loading";
import { Character, OwnedPokemon } from "../../components/types/typesUsed";
import { getColor1, getColor2 } from "../../components/user-forum/getColorBadges";
import { db } from "../../context/firebase";
import { useAuth } from "../../context/AuthContext";
import { getPokemonImageURL } from "../../helpers";
import {
  getCharacters,
  getOwnedPokemons,
  getProfile,
  getTeamsRaw,
  hydrateTeams,
} from "../../queries/dashboard";

interface PublicUser {
  uid: string;
  username: string;
  avatar?: string;
  permissions?: string;
  badges?: string[];
  joinedAt?: { seconds: number };
  signature?: string;
  emojis?: string[];
}

// Reads the WORLD-safe projection (publicProfiles), never the users doc, so a
// logged-out visitor can view the profile without exposing email or Discord.
const getPublicUser = async (username: string): Promise<PublicUser | null> => {
  const { collection, getDocs, limit, query, where } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "publicProfiles"), where("username", "==", username), limit(1))
  );
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
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
  };
};

// Discord handle lives only on the members-only users doc, so it is fetched
// separately and only when the viewer is signed in (never shown to the world).
const getMemberDiscord = async (
  uid: string
): Promise<{ discordName?: string; discordPublic?: boolean }> => {
  const { doc, getDoc } = await import("firebase/firestore");
  const data = (await getDoc(doc(db, "users", uid))).data();
  return { discordName: data?.discordName, discordPublic: !!data?.discordPublic };
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

/** Small labeled stat tile for the right-column stat row. */
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card withBorder radius="md" p="md" bg="#1f1e20">
      <Text fz={26} fw={700} c="white" lh={1.1}>
        {value}
      </Text>
      <Text fz={11} c="dimmed" tt="uppercase" mt={4}>
        {label}
      </Text>
    </Card>
  );
}

function PokemonSprite({ pokemon, size = 56 }: { pokemon: OwnedPokemon; size?: number }) {
  return (
    <Image
      src={getPokemonImageURL(pokemon.image_slug, pokemon.shiny)}
      alt={`${pokemon.name ?? pokemon.species ?? "Pokemon"} sprite`}
      w={size}
      h={size}
      fit="contain"
    />
  );
}

/**
 * Public member profile: cover band, sidebar (identity, featured picks, badges,
 * emotes) and a right column of stats, description, characters, pokemon box and
 * teams. Every section is empty-safe so a sparse profile still renders cleanly.
 */
export default function PublicProfile() {
  const { username } = useParams();
  const { user: viewer } = useAuth();
  const { data: user, isPending } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => getPublicUser(username!),
    enabled: !!username,
  });

  const uid = user?.uid;
  // Discord is members-only: only fetched when the viewer is signed in.
  const { data: discord } = useQuery({
    queryKey: ["public-discord", uid],
    queryFn: () => getMemberDiscord(uid!),
    enabled: !!uid && !!viewer,
  });
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

  const coverStyle = profile?.coverBG
    ? { backgroundImage: `url(${profile.coverBG})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: "linear-gradient(120deg, #3b2f63 0%, #1f3a5f 100%)" };

  return (
    <Container size="lg" px={{ base: "sm", sm: "md" }} pb={80}>
      {/* Cover band */}
      <Box
        mt="md"
        style={{
          position: "relative",
          height: 140,
          borderRadius: 12,
          overflow: "hidden",
          ...coverStyle,
        }}
      >
        {profile?.coverBG && (
          <Text
            fz={10}
            c="rgba(255,255,255,0.6)"
            ff="monospace"
            style={{ position: "absolute", bottom: 6, right: 10 }}
          >
            profile.coverBG
          </Text>
        )}
      </Box>

      <Grid style={{ marginTop: -56 }}>
        {/* LEFT sidebar */}
        <Grid.Col span={{ base: 12, sm: 4, md: 3 }}>
          <Card withBorder radius="md" p="md" bg="#1a191b">
            <Stack align="center" gap={6}>
              <Avatar
                src={user.avatar || undefined}
                alt={`${user.username ?? "User"} avatar`}
                size={110}
                radius="100%"
                style={{ border: "4px solid #1a191b" }}
              />
              <Title order={1} c="white" fw={600} fz={22} ta="center">
                {user.username}
              </Title>
              {user.permissions && (
                <Text fz={11} c="dimmed" tt="uppercase" fw={600}>
                  {user.permissions}
                </Text>
              )}
              {user.joinedAt?.seconds && (
                <Text fz={12} c="dimmed">
                  Joined {formatJoined(user.joinedAt)}
                </Text>
              )}
              {discord?.discordPublic && discord?.discordName && (
                <Badge
                  variant="light"
                  color="indigo"
                  leftSection={<IconBrandDiscord size={13} />}
                  radius="sm"
                >
                  {discord.discordName}
                </Badge>
              )}
              {!!tags.length && (
                <Group gap={6} justify="center" mt={4}>
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" color="gray" radius="sm" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </Group>
              )}
            </Stack>

            {/* Featured picks */}
            {(featuredCharacter || featuredPokemon || featuredTeam) && (
              <Stack gap={10} mt="lg">
                <Text fz={11} c="dimmed" tt="uppercase" fw={700}>
                  Featured
                </Text>
                {featuredCharacter && (
                  <Group gap={10} wrap="nowrap">
                    <Avatar
                      src={featuredCharacter.imageURL || undefined}
                      alt={`${featuredCharacter.name ?? "Character"} avatar`}
                      size={44}
                      radius="md"
                    />
                    <Box style={{ minWidth: 0 }}>
                      <Text fz={14} c="white" truncate>
                        {featuredCharacter.name}
                      </Text>
                      <Text fz={11} c="dimmed">
                        Character
                      </Text>
                    </Box>
                  </Group>
                )}
                {featuredPokemon && (
                  <Group gap={10} wrap="nowrap">
                    <PokemonSprite pokemon={featuredPokemon} size={44} />
                    <Box style={{ minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        <Text fz={14} c="white" truncate>
                          {featuredPokemon.name}
                        </Text>
                        {featuredPokemon.shiny && (
                          <Badge size="xs" color="yellow" variant="light">
                            SHINY
                          </Badge>
                        )}
                      </Group>
                      <Text fz={11} c="dimmed">
                        Pokemon
                      </Text>
                    </Box>
                  </Group>
                )}
                {featuredTeam && (
                  <Group gap={10} wrap="nowrap">
                    <Group gap={2} wrap="nowrap">
                      {(featuredTeam.pokemons ?? []).slice(0, 3).map((p) => (
                        <PokemonSprite key={p.id} pokemon={p} size={28} />
                      ))}
                    </Group>
                    <Box style={{ minWidth: 0 }}>
                      <Text fz={14} c="white" truncate>
                        {featuredTeam.team_name || "Team"}
                      </Text>
                      <Text fz={11} c="dimmed">
                        Team - {featuredTeam.times_battled || 0} battles
                      </Text>
                    </Box>
                  </Group>
                )}
              </Stack>
            )}

            {/* Badges */}
            {!!user.badges?.length && (
              <Stack gap={8} mt="lg">
                <Text fz={11} c="dimmed" tt="uppercase" fw={700}>
                  Badges
                </Text>
                <Group gap={6}>
                  {user.badges.map((badge) => (
                    <Badge
                      key={badge}
                      variant="gradient"
                      gradient={{ from: getColor1(badge), to: getColor2(badge) }}
                    >
                      {badge}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            )}

            {/* Emotes */}
            {!!emojis.length && (
              <Stack gap={8} mt="lg">
                <Text fz={11} c="dimmed" tt="uppercase" fw={700}>
                  Emotes
                </Text>
                <Group gap={6}>
                  {emojis.map((emote) => (
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
                  ))}
                </Group>
              </Stack>
            )}
          </Card>
        </Grid.Col>

        {/* RIGHT column */}
        <Grid.Col span={{ base: 12, sm: 8, md: 9 }}>
          <Stack gap="md" mt={{ base: 0, sm: 56 }}>
            {/* Stat row */}
            <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="sm">
              <StatCard label="Posts" value={counts?.posts ?? "-"} />
              <StatCard label="Threads" value={counts?.threads ?? "-"} />
              <StatCard label="Characters" value={characterList.length} />
              <StatCard label="Pokemon" value={ownedList.length} />
            </SimpleGrid>

            {/* Description */}
            {profile?.description && (
              <Card withBorder radius="md" p="md" bg="#1f1e20">
                <Box
                  c="gray.3"
                  style={{ wordBreak: "break-word" }}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(profile.description),
                  }}
                />
              </Card>
            )}

            {/* Characters */}
            <Card withBorder radius="md" p="md" bg="#1f1e20">
              <Text fz={13} c="dimmed" tt="uppercase" fw={700} mb="sm">
                Characters
              </Text>
              {characterList.length ? (
                <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
                  {characterList.map((c) => (
                    <Card key={c.id} withBorder radius="md" p="sm" bg="#26252700">
                      <Group gap={10} wrap="nowrap" align="flex-start">
                        <Avatar
                          src={c.imageURL || undefined}
                          alt={`${c.name ?? "Character"} avatar`}
                          size={48}
                          radius="md"
                        />
                        <Box style={{ minWidth: 0 }}>
                          <Text fz={14} c="white" fw={600} truncate>
                            {c.name}
                          </Text>
                          <Badge
                            size="xs"
                            color={characterTypeColor(c.type)}
                            variant="light"
                            mt={2}
                          >
                            {c.type ?? "None"}
                          </Badge>
                          <Text fz={11} c="dimmed" mt={4} lineClamp={2}>
                            {[c.species, c.pronouns, c.age].filter(Boolean).join(" · ")}
                          </Text>
                        </Box>
                      </Group>
                    </Card>
                  ))}
                </SimpleGrid>
              ) : (
                <Text fz={13} c="dimmed">
                  No characters yet.
                </Text>
              )}
            </Card>

            {/* Pokemon box */}
            <Card withBorder radius="md" p="md" bg="#1f1e20">
              <Text fz={13} c="dimmed" tt="uppercase" fw={700} mb="sm">
                Pokemon Box
              </Text>
              {ownedList.length ? (
                <SimpleGrid cols={{ base: 4, xs: 6, sm: 8 }} spacing="xs">
                  {ownedList.map((p) => (
                    <Box key={p.id} title={p.name || p.species} style={{ textAlign: "center" }}>
                      <PokemonSprite pokemon={p} size={48} />
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Text fz={13} c="dimmed">
                  No Pokemon yet.
                </Text>
              )}
            </Card>

            {/* Teams */}
            <Card withBorder radius="md" p="md" bg="#1f1e20">
              <Text fz={13} c="dimmed" tt="uppercase" fw={700} mb="sm">
                Teams
              </Text>
              {teamList.length ? (
                <Stack gap="sm">
                  {teamList.map((team) => (
                    <Group key={team.id} justify="space-between" wrap="nowrap" gap="sm">
                      <Box style={{ minWidth: 0 }}>
                        <Text fz={14} c="white" fw={600} truncate>
                          {team.team_name || "Team"}
                        </Text>
                        <Group gap={2} mt={4} wrap="nowrap">
                          {(team.pokemons ?? []).slice(0, 6).map((p) => (
                            <PokemonSprite key={p.id} pokemon={p} size={30} />
                          ))}
                        </Group>
                      </Box>
                      <Text fz={12} c="dimmed" style={{ whiteSpace: "nowrap" }}>
                        {team.times_battled || 0} battles
                      </Text>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text fz={13} c="dimmed">
                  No teams yet.
                </Text>
              )}
            </Card>

            {/* Recent activity (best-effort placeholder) */}
            <Card withBorder radius="md" p="md" bg="#1f1e20">
              <Text fz={13} c="dimmed" tt="uppercase" fw={700} mb="sm">
                Recent Activity
              </Text>
              <Text fz={13} c="dimmed">
                No recent activity.
              </Text>
            </Card>

            {/* Signature footer */}
            {user.signature && (
              <Box ta="center" mt="sm">
                <Box
                  c="gray.5"
                  fz={13}
                  style={{ wordBreak: "break-word" }}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(user.signature),
                  }}
                />
                <Text fz={10} c="dimmed" ff="monospace" mt={4}>
                  signature
                </Text>
              </Box>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
