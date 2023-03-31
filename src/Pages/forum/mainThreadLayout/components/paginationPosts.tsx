import { Pagination } from "@mantine/core";
import { PostsStructure } from "../../../../components/types/typesUsed";
import { ArticleCardVertical } from "./EachPost";

interface Props {
    currentPage: number;
    onChangePG: (page: number) => void;
    allPosts:PostsStructure[];
    postPerPage:number;
  }

export function PaginationWithEachPost(props:Props): JSX.Element {
    const { currentPage, onChangePG,allPosts,postPerPage } = props;
    const pagesCount = Math.ceil(allPosts.length / postPerPage);  
    const start = (currentPage - 1) * postPerPage;  
    const end = Math.min(currentPage * postPerPage, allPosts.length);

return(
    <>
    <Pagination
    total={pagesCount}
    color="#772976"
    withEdges
    page={currentPage}
    onChange={onChangePG}
    style={{ alignSelf: "end" }}
  />
  {allPosts.length>0&&allPosts.map(
    (apost, index) =>
      index >= start &&
      index + 1 <= end && (
        <ArticleCardVertical
        newkey={apost.id}
        key={apost.id}
          image={""}
          bigText={apost.text}
          chara={apost.character}
          author={{
            name: apost.owner,
            avatar: apost.id,
            badges: apost.badges,
          }}
        />
        // <div key={apost.id}>test{apost.id}</div>
      )
  )}
  <Pagination
    total={pagesCount}
    color="#772976"
    withEdges
    page={currentPage}
    onChange={onChangePG}
    style={{ alignSelf: "end" }}
  />
  </>
);
}