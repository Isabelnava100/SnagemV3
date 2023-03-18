import { useEffect, useState } from "react";
import { Container } from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { FeaturesTitle } from "./components/setTitleperThread";
import {
  ThreadInformation,
  PostsStructure,
} from "../../../components/types/typesUsed";
import { dataRun } from "../reusable-components/getThreadInfo";
import { dataRun2 } from "./components/getPosts";
import { PaginationWithEachPost } from "./components/paginationPosts";

function isNumeric(n:any):boolean {
  return !isNaN(parseFloat(n)) && isFinite(n);
} // function that checks if string is a number

export default function Threads() {
  const { forum, id: thethreadid, page } = useParams();
  const navigate=useNavigate(); 
  const [allPosts, setAllPosts] = useState<PostsStructure[]>([]);
  const [threadInfo, setThreadInfo] = useState<ThreadInformation[]>([]);
  
  const [currentPage, onChangePG] = useState<number>(
    isNumeric(page) ? Number(page) :  1
  ); 
  const postPerPage = 6;
    const bookmarkBoolean=true;

  useEffect(() => {
    async function fetchData() {
      if (Number.isNaN(Number(thethreadid))) {
        navigate('/Forum/');
        console.log('Thread ID is invalid.');
        return true;
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
                if(page==='last'){
                navigate(`/Forum/${forum}/thread/${thethreadid}/${Math.ceil(resultsPosts.length / postPerPage)}`);
                onChangePG(Math.ceil(resultsPosts.length / postPerPage));
                }else {                  
                setAllPosts(resultsPosts);
                }
                return true;
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
        
        {allPosts.length ?
        <PaginationWithEachPost 
        currentPage={currentPage}
        onChangePG={onChangePG}
        allPosts={allPosts}
        postPerPage={postPerPage}
        />
      :
      <img
              src="https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/mewdumpy-compress.gif?alt=media&token=95a14be6-6495-43fd-a72a-a120f55e0bf8"
              alt="mew loading" width='100' height='100'
            />
      }
        
      </div>
    </Container>
  );
}
