import { Container, Table, Text } from "@mantine/core";
import { useForumLink } from "./components/MiniNavForum";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeroText } from "./components/HeroSection";
import { ThreadInformation } from "../../../components/types/typesUsed";
import { dataRun } from "./components/getThreads";

function MainForum() {
  const [allThreads, setAllThreads] = useState<ThreadInformation[]>([]);
  const forumPlace = useForumLink();
  const place = forumPlace?.active;
  const placeSimpleName =place?.slice(7);

  useEffect(() => { 
    async function fetchData(){   
      const checkingThreads= await dataRun(placeSimpleName);
      setAllThreads(checkingThreads);
    }
    
    fetchData();
  }, [place]);

  return (
    <>
      <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <HeroText send={placeSimpleName} />
          <Table highlightOnHover>
            <thead>
              <tr>
                <th>TOPICS</th>
                <th>LAST POST</th>
              </tr>
            </thead>
            <tbody>
              {allThreads.map((thread) => (
                <tr key={thread.id}>
                  <td>
                    <Link
                      style={{ textDecoration: "none" }}
                      to={`${place}/thread/${thread.id}`}
                      // state={{ infoRead: thread }}
                    >
                      {thread.title}
                      <Text color="dimmed" size="sm">
                        Created by {thread.createdBy}
                      </Text>
                    </Link>
                  </td>
                  <td>
                    <Link
                      style={{ textDecoration: "none" }}
                      to={`${place}/thread/${thread.id}`}
                      // state={{ infoRead: thread }}
                    >
                      {thread.timePosted}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Container>
    </>
  );
}

export default MainForum;
