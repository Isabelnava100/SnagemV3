import { Container } from "@mantine/core";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LoadingSpinner from "../../../components/navigation/loading";
import { PostsStructure, ThreadInformation } from "../../../components/types/typesUsed";
import { dataRun } from "../reusable-components/getThreadInfo";
import { dataRun2, getPostsCount } from "./components/getPosts";
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
  const [totalPosts, setTotalPosts] = useState<number | null>(null);

  const [currentPage, onChangePG] = useState<number>(isNumeric(page) ? Number(page) : 1);
  const postPerPage = 6;

  // Thread info + post count: once per thread, not per page.
  useEffect(() => {
    async function fetchThread() {
      if (Number.isNaN(Number(thethreadid))) {
        navigate("/Forum/");
        console.log("Thread ID is invalid.");
        return;
      }

      try {
        const [resultsThread, count] = await Promise.all([
          dataRun(Number(thethreadid), forum || "Main-Forum"),
          getPostsCount(Number(thethreadid), forum || "Main-Forum"),
        ]);
        setThreadInfo(resultsThread);
        setTotalPosts(count);

        if (page === "last") {
          const lastPage = Math.max(1, Math.ceil(count / postPerPage));
          onChangePG(lastPage);
          navigate(`/Forum/${forum}/thread/${thethreadid}/${lastPage}`);
        }
      } catch (err) {
        console.error("Error fetching thread data:", err);
      }
    }
    fetchThread();
  }, [thethreadid, forum, navigate, page]);

  // Posts: only the current page, refetched when the page changes.
  useEffect(() => {
    if (totalPosts === null || Number.isNaN(Number(thethreadid))) return;
    dataRun2(Number(thethreadid), forum || "Main-Forum", currentPage, postPerPage, totalPosts)
      .then(setAllPosts)
      .catch((err) => console.error("Error fetching posts:", err));
  }, [thethreadid, forum, currentPage, totalPosts]);

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
            posts={allPosts}
            totalPosts={totalPosts ?? allPosts.length}
            postPerPage={postPerPage}
          />
        ) : (
          <LoadingSpinner />
        )}
      </div>
    </Container>
  );
}
