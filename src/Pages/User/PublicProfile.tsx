import { Avatar, Badge, Container, Group, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { SectionLoader } from "../../components/navigation/loading";
import { getColor1, getColor2 } from "../../components/user-forum/getColorBadges";
import { db } from "../../context/firebase";
import { getPokemonImageURL } from "../../helpers";
import {
  getCharacters,
  getOwnedPokemons,
  getProfile,
  getTeamsRaw,
} from "../../queries/dashboard";

interface PublicUser {
  uid: string;
  username: string;
  avatar?: string;
  permissions?: string;
  badges?: string[];
  joinedAt?: { seconds: number };
  discordName?: string;
  discordPublic?: boolean;
}

const getPublicUser = async (username: string): Promise<PublicUser | null> => {
  const { collection, getDocs, limit, query, where } = await import("firebase/firestore");
  const snap = await getDocs(
    query(collection(db, "users"), where("username", "==", username), limit(1))
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
    discordName: data.discordName,
    discordPublic: !!data.discordPublic,
  };
};

function formatJoined(ts?: { seconds: number }): string {
  if (!ts?.seconds) return "";
  return new Date(ts.seconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

/**
 * Public user profile (Q6). Header + featured picks placeholder. Full visual
 * design (cover, layout of characters/teams/collections) lands later; the
 * data wiring is here so the design just needs styling.
 */
export default function PublicProfile() {
  const { username } = useParams();
  const { data: profile, isPending } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => getPublicUser(username!),
    enabled: !!username,
  });

  const uid = profile?.uid;
  // Featured picks + their source data (only fetched once the user resolves).
  const { data: bagProfile } = useQuery({
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

  if (isPending) {
    return (
      <Container size="sm" mt={40}>
        <SectionLoader />
      </Container>
    );
  }
  if (!profile) {
    return (
      <Container size="sm" mt={40}>
        <Text c="white" ta="center">
          No member named &quot;{username}&quot; was found.
        </Text>
      </Container>
    );
  }

  const featuredCharacter = characters?.sortedData.find(
    (c) => c.id === bagProfile?.featuredCharacterId
  );
  const featuredTeam = teams?.find((t) => t.id === bagProfile?.featuredTeamId);
  const featuredPokemon = owned?.sortedData.find((p) => p.id === bagProfile?.featuredPokemonId);
  const teamSprites =
    featuredTeam && owned
      ? owned.sortedData.filter((p) => featuredTeam.pokemon_ids.includes(p.id))
      : [];

  return (
    <Container size="sm" style={{ marginTop: 60, paddingBottom: 100 }}>
      <Stack align="center" gap={12}>
        <Avatar src={profile.avatar || undefined} size={120} radius="100%" />
        <Title order={1} c="white" fw={400}>
          {profile.username}
        </Title>
        <Group gap={8} justify="center">
          {profile.permissions && (
            <Badge variant="light" color="cyan.0" size="lg">
              {profile.permissions}
            </Badge>
          )}
          {profile.joinedAt?.seconds && (
            <Text fz={12} c="dimmed">
              Member since {formatJoined(profile.joinedAt)}
            </Text>
          )}
        </Group>

        {profile.discordPublic && profile.discordName && (
          <Text fz={13} c="dimmed">
            Discord: <span style={{ color: "#8C9EFF" }}>{profile.discordName}</span>
          </Text>
        )}

        {!!profile.badges?.length && (
          <Group gap={6} justify="center">
            {profile.badges.map((badge) => (
              <Badge
                key={badge}
                variant="gradient"
                gradient={{ from: getColor1(badge), to: getColor2(badge) }}
              >
                {badge}
              </Badge>
            ))}
          </Group>
        )}

        {/* Featured picks — placeholder layout until the real design lands. */}
        {(featuredCharacter || featuredTeam || featuredPokemon) && (
          <Stack gap={10} w="100%" mt={10}>
            <Text c="white" fw={600} ta="center">
              Featured
            </Text>
            <Group justify="center" gap={20} wrap="wrap">
              {featuredCharacter && (
                <Stack gap={4} align="center">
                  <Avatar src={featuredCharacter.imageURL || undefined} size={72} radius="xl" />
                  <Text fz={12} c="white">
                    {featuredCharacter.name}
                  </Text>
                  <Text fz={10} c="dimmed">
                    Character
                  </Text>
                </Stack>
              )}
              {featuredPokemon && (
                <Stack gap={4} align="center">
                  <Avatar
                    src={getPokemonImageURL(featuredPokemon.image_slug)}
                    size={72}
                    radius="xl"
                    bg="#2b2a2b"
                  />
                  <Text fz={12} c="white">
                    {featuredPokemon.name}
                  </Text>
                  <Text fz={10} c="dimmed">
                    Pokemon
                  </Text>
                </Stack>
              )}
              {featuredTeam && (
                <Stack gap={4} align="center">
                  <Group gap={2}>
                    {teamSprites.slice(0, 6).map((p) => (
                      <Avatar
                        key={p.id}
                        src={getPokemonImageURL(p.image_slug)}
                        size={26}
                        radius="xl"
                        bg="#2b2a2b"
                      />
                    ))}
                  </Group>
                  <Text fz={12} c="white">
                    {featuredTeam.team_name || "Team"}
                  </Text>
                  <Text fz={10} c="dimmed">
                    Team
                  </Text>
                </Stack>
              )}
            </Group>
          </Stack>
        )}

        <Text fz={13} c="dimmed" ta="center" maw={380} mt={10}>
          Full public profiles — cover background, description, tags and collections — are on
          the way.
        </Text>
      </Stack>
    </Container>
  );
}
