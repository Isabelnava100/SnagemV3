import { Button, Container, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { NewForumInfo as forumLinks } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import "/src/assets/styles/forumHeroSection.css";

export function HeroText({ send }: { send: string | undefined }) {
  const { user } = useAuth();
  return (
    <Container style={{ background: "none" }}>
      <Title order={1} color={"white"}>
        Welcome to the{" "}
        <Text component="span" color={"#772976"} inherit>
          Snagem Forums
        </Text>
      </Title>

      <Text size="lg" color="dimmed">
        {forumLinks.find((link) => link.link === send)?.description}
      </Text>

      {user && (
        <div className="forumButtonContainerHero">
          <Button size="lg" variant="default" color="gray">
            Check Your Bookmarks
          </Button>
          <Button size="lg" component={Link} to={`new`}>
            Create a New Topic
          </Button>
        </div>
      )}
    </Container>
  );
}
