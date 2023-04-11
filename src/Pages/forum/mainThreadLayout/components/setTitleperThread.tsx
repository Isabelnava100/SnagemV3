import { Button, Col, Grid, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { InfoOnThreadVisual } from "../../../../components/types/typesUsed";
import { useAuth } from "../../../../context/AuthContext";
import { BookmarkButton } from "./BookmarkButton";

export function FeaturesTitle({ info, forum }: InfoOnThreadVisual) {
  const { user } = useAuth();
  return (
    <Grid gutter={20} style={{ padding: "16px 8px", background: "none" }}>
      <Col span={12} p={0} sm={9} className="titleBox">
        <Title mb={1} order={1}>
          {info[0]["title"]}
        </Title>
        {user && (
          <BookmarkButton
            user={user}
            listofnotify={info[0].notifyviaDiscord}
            name={info[0]["title"]}
          />
        )}
      </Col>
      <Col span={12} p={0} sm={3} style={{ display: "flex", justifyContent: "end" }}>
        {user && (
          <Button
            variant="gradient"
            gradient={{ deg: 133, from: "#933592", to: "#651764" }}
            size="lg"
            radius="md"
            mt="sm"
            mb="sm"
            component={Link}
            to={`/Forum/${forum}/thread/${info[0]["id"]}/post`}
          >
            Make a New Post
          </Button>
        )}
      </Col>
    </Grid>
  );
}
