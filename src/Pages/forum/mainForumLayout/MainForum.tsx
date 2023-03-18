import { Container, Switch, Table, Text } from "@mantine/core";
import { useForumLink } from "./components/MiniNavForum";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HeroText } from "./components/HeroSection";
import { ThreadInformation } from "../../../components/types/typesUsed";
import { dataRun } from "./components/getThreads";

function MainForum() {
  const [allThreads, setAllThreads] = useState<ThreadInformation[]|undefined>([]);
  const { forum } = useParams();
  const placeSimpleName= forum&&forum!='Forum'?forum:'Main-Forum';
  const [archive, setArchive]= useState<boolean>(false);

  useEffect(() => { 
    async function fetchData(){ 
        const checkingThreads= await dataRun(placeSimpleName,archive);
        setAllThreads(checkingThreads);        
    }    
    fetchData();
  }, [forum,archive]);

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
          <Switch aria-label="View Archived Threads" onLabel="Archived Threads" offLabel="Open Threads" size="xl" 
          className='self-end' onChange={() => setArchive(!archive)}/>
          
          <Table highlightOnHover>
            <thead>
              <tr>
                <th>TOPICS</th>
                <th>LAST POST</th>
              </tr>
            </thead>
            <tbody>
              {allThreads&&allThreads.map((thread) => (
                <tr key={thread.id}>
                  <td>
                    <Link
                      style={{ textDecoration: "none" }}
                      to={`/Forum/${placeSimpleName}/thread/${thread.id}`}
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
                      to={`/Forum/${placeSimpleName}/thread/${thread.id}/last`}
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
