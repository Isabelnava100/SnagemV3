import { useEffect, useState } from "react";
import { Container, Pagination } from "@mantine/core";
import { ArticleCardVertical } from "./components/EachPost";
import { useParams } from "react-router-dom";
import { FeaturesTitle } from "./components/setTitleperThread";
import {
  ThreadInformation,
  PostsStructure,
} from "../../../components/types/typesUsed";
import { dataRun } from "../reusable-components/getThreadInfo";
import { dataRun2 } from "./components/getPosts";

export default function Threads() {
  const { forum, id: thethreadid, page } = useParams();
  const [allPosts, setAllPosts] = useState<PostsStructure[]>([]);
  const [threadInfo, setThreadInfo] = useState<ThreadInformation[]>([]);
  const [currentPage, onChangePG] = useState<number>(
    page ? Number(page) : 1
  ); //if last then pages = pagesCount

  const postPerPage = 6;
  const pagesCount = Math.ceil(allPosts.length / postPerPage);

  const start = (currentPage - 1) * postPerPage;
  const end = Math.min(currentPage * postPerPage, allPosts.length);

  useEffect(() => {
    async function fetchData() {
      if (Number.isNaN(Number(thethreadid))) {
        // navigate('/Forum/');
        console.log('Thread ID is invalid.')
      } else {
        await dataRun(
          Number(thethreadid),
          (forum||'Main-Forum')
        ).then(async (resultsThread) => {
          setThreadInfo(resultsThread);
          await dataRun2(
            Number(thethreadid),
            (forum||'Main-Forum')
            ).then((resultsPosts) => {
                setAllPosts(resultsPosts);                
              });
        });
      }
    }
    fetchData();
  }, [thethreadid, currentPage]); //set to page

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <div id="loadingContainer">
        {threadInfo.length ? (
          <FeaturesTitle
            forum={forum}
            info={threadInfo}
          />
        ) : (
          ""
        )}


        <Pagination
          total={pagesCount}
          color="violet"
          withEdges
          page={currentPage}
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
          page={currentPage}
          onChange={onChangePG}
          style={{ alignSelf: "end" }}
        />
      </div>
    </Container>
  );
}
