import { Pagination } from "@mantine/core";
import type { JSX } from "react";
import { PostsStructure } from "../../../../components/types/typesUsed";
import { ArticleCardVertical } from "./EachPost";

interface Props {
    currentPage: number;
    onChangePG: (page: number) => void;
    posts: PostsStructure[]; // already page-sized (fetched server-side)
    totalPosts: number;
    postPerPage: number;
  }

export function PaginationWithEachPost(props:Props): JSX.Element {
    const { currentPage, onChangePG, posts, totalPosts, postPerPage } = props;
    const pagesCount = Math.max(1, Math.ceil(totalPosts / postPerPage));

return(
    <>
    <Pagination
    total={pagesCount}
    color="#772976"
    withEdges
    value={currentPage}
    onChange={onChangePG}
    style={{ alignSelf: "end" }}
  />
  {posts.map((apost) => (
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
  ))}
  <Pagination
    total={pagesCount}
    color="#772976"
    withEdges
    value={currentPage}
    onChange={onChangePG}
    style={{ alignSelf: "end" }}
  />
  </>
);
}
