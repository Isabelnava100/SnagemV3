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
        return;
      }

      try {
        const resultsThread = await dataRun(Number(thethreadid), forum || "Main-Forum");
        setThreadInfo(resultsThread);

        const resultsPosts = await dataRun2(Number(thethreadid), forum || "Main-Forum");
        if (page === "last") {
          const lastPage = Math.ceil(resultsPosts.length / postPerPage);
          onChangePG(lastPage);
          navigate(`/Forum/${forum}/thread/${thethreadid}/${lastPage}`);
        }
        setAllPosts(resultsPosts);
      } catch (err) {
        console.error("Error fetching thread data:", err);
      }
    }
    fetchData();
  }, [thethreadid, currentPage, forum, navigate, page]); // full dependency array

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
