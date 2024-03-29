import { Container } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../../../components/navigation/loading";
import { PostsStructure, ThreadInformation } from "../../../components/types/typesUsed";
import { dataRun } from "../reusable-components/getThreadInfo";
import { dataRun2 } from "./components/getPosts";
import { PaginationWithEachPost } from "./components/paginationPosts";
import { FeaturesTitle } from "./components/setTitleperThread";

function isNumeric(n: any): boolean {
  return !isNaN(parseFloat(n)) && isFinite(n);
} // function that checks if string is a number

export function Threads() {
  const { forum, id: thethreadid, page } = useParams();
  const navigate = useNavigate();
  const [allPosts, setAllPosts] = useState<PostsStructure[]>([]);
  const [threadInfo, setThreadInfo] = useState<ThreadInformation[]>([]);

  const [currentPage, onChangePG] = useState<number>(isNumeric(page) ? Number(page) : 1);
  const postPerPage = 6;
  // const bookmarkBoolean=true;

  useEffect(() => {
    async function fetchData() {
      if (Number.isNaN(Number(thethreadid))) {
        navigate("/Forum/");
        console.log("Thread ID is invalid.");
        return true;
      } else {
        try {
          await dataRun(Number(thethreadid), forum || "Main-Forum").then(async (resultsThread) => {
            setThreadInfo(resultsThread);
            await dataRun2(Number(thethreadid), forum || "Main-Forum").then((resultsPosts) => {
              if (page === "last") {
                onChangePG(Math.ceil(resultsPosts.length / postPerPage));
                navigate(
                  `/Forum/${forum}/thread/${thethreadid}/${Math.ceil(
                    resultsPosts.length / postPerPage
                  )}`
                );
                setAllPosts(resultsPosts);
              } else {
                setAllPosts(resultsPosts);
              }
              return Promise.resolve();
            });
          });
        } catch (err) {
          console.error(err);
        } finally {
          return Promise.resolve();
        }
      }
    }
    fetchData();
  }, [thethreadid, currentPage]); //set to page

  return (
    <Container size="lg" style={{ marginTop: 20, paddingBottom: 100 }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          minHeight: "300px",
          flexDirection: "column",
        }}
      >
        {threadInfo.length ? <FeaturesTitle forum={forum} info={threadInfo} /> : ""}

        {allPosts.length ? (
          <PaginationWithEachPost
            currentPage={currentPage}
            onChangePG={onChangePG}
            allPosts={allPosts}
            postPerPage={postPerPage}
          />
        ) : (
          <LoadingSpinner />
        )}
      </div>
    </Container>
  );
}
