import { useEffect, useState } from "react";
import { Container, Pagination, LoadingOverlay, Button } from "@mantine/core";
import { ArticleCardVertical } from "./components/EachPost";
import { useParams, Navigate, useLocation } from "react-router-dom";
import { FeaturesTitle } from "./components/setTitleperThread";
import {
  ThreadInformation,
  PostsStructure,
} from "../../../components/types/typesUsed";
import { dataRun } from "../reusable-components/getThreadInfo";
import { dataRun2 } from "./components/getPosts";
import { UserAuth } from "../../../context/AuthContext";

export default function Threads() {
  const { state } = useLocation();
  const { id: thethreadid, page: thecurrentpage } = useParams();
  const { user } = UserAuth();
  const [allPosts, setAllPosts] = useState<PostsStructure[]>([]);
  const [threadInfo, setThreadInfo] = useState<ThreadInformation[]>([]);
  const [totalItemsCount, setTots] = useState<number>(0);
  const [page, onChangePG] = useState<number>(
    thecurrentpage ? Number(thecurrentpage) : 1
  ); //if last then pages = pagesCount
  const checkingLoc = state && state.newlocation ? true : false;

  const postPerPage = 6;
  const pagesCount = Math.ceil(totalItemsCount / postPerPage);

  const start = (page - 1) * postPerPage;
  const end = Math.min(page * postPerPage, totalItemsCount);

  useEffect(() => {
    async function fetchData() {
      if (Number.isNaN(Number(thethreadid))) {
        // setShouldNavigate(true);
        console.log(thethreadid);
      } else {
        const checkingThreads = await dataRun(
          Number(thethreadid),
          false,
          "",
          user
        ).then(async (resultsThread) => {
          setThreadInfo(resultsThread);
          await dataRun2(resultsThread)
              .then((resultsPosts) => {
                setAllPosts(resultsPosts);
                setTots(resultsPosts.length);
              });
        });
      }
    }
    fetchData();
  }, [thethreadid, page]); //set to page

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <div id="loadingContainer">
        {threadInfo.length ? (
          <FeaturesTitle
            info={threadInfo}
            threadID={checkingLoc ? state.newlocation : null}
          />
        ) : (
          ""
        )}

        <Pagination
          total={pagesCount}
          color="violet"
          withEdges
          page={page}
          onChange={onChangePG}
          style={{ alignSelf: "end" }}
        />
        {allPosts.map(
          (apost, index) =>
            index >= start &&
            index + 1 <= end && (
              <ArticleCardVertical
                key={apost.id}
                image={""}
                bigText={apost.text}
                chara={apost.character}
                author={{
                  name: apost.owner,
                  avatar: "avie",
                  badges: apost.badges,
                }}
              />
            )
        )}
        <Pagination
          total={pagesCount}
          color="violet"
          withEdges
          page={page}
          onChange={onChangePG}
          style={{ alignSelf: "end" }}
        />
        {/* {user&&
          <Button
          variant="gradient"
          gradient={{ deg: 133, from: 'grape', to: 'violet' }}
          size="lg"
          radius="md"
          mt="xl"
          style={{alignSelf: 'end'}}
          component={Link} to={`/Forum/thread/${id}/post`}
        >
          Make a New Post
        </Button>
           } */}
      </div>
    </Container>
  );
}
