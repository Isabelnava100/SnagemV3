import { Avatar, Badge, Container, Group, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { SectionLoader } from "../../components/navigation/loading";
import { getColor1, getColor2 } from "../../components/user-forum/getColorBadges";
import { db } from "../../context/firebase";

interface PublicUser {
  uid: string;
  username: string;
  avatar?: string;
  permissions?: string;
  badges?: string[];
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
  };
};

/**
 * Public user profile (Q6) — placeholder scope: avatar, name, role and
 * inserted badges. Cover background, description, tags and collections join
 * once the public-profile design lands.
 */
export default function PublicProfile() {
  const { username } = useParams();
  const { data: profile, isPending } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: () => getPublicUser(username!),
    enabled: !!username,
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

  return (
    <Container size="sm" style={{ marginTop: 60, paddingBottom: 100 }}>
      <Stack align="center" gap={12}>
        <Avatar src={profile.avatar || undefined} size={120} radius="100%" />
        <Title order={1} c="white" fw={400}>
          {profile.username}
        </Title>
        {profile.permissions && (
          <Badge variant="light" color="cyan.0" size="lg">
            {profile.permissions}
          </Badge>
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
        <Text fz={13} c="dimmed" ta="center" maw={380}>
          Full public profiles — cover background, description, tags and collections — are on
          the way.
        </Text>
      </Stack>
    </Container>
  );
}
