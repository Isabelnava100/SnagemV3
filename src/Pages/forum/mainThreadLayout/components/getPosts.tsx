import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { PostsStructure } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";

function toPost(doc: QueryDocumentSnapshot): PostsStructure {
  return {
    id: doc.id,
    badges: doc.data().badges,
    character: doc.data().character,
    owner: doc.data().owner,
    text: doc.data().text,
    timePosted: doc.data().timePosted,
  };
}

function postsRef(thethreadid: number, forum: string) {
  return collection(db, "forum", `${forum}`, "threads", `${thethreadid}`, "posts");
}

// One aggregation read instead of fetching every post document.
export const getPostsCount = async (thethreadid: number, forum: string): Promise<number> => {
  const snapshot = await getCountFromServer(query(postsRef(thethreadid, forum)));
  return snapshot.data().count;
};

// Fetch a single page of posts. For the last page we query in reverse with a
// small limit so deep threads never load from the start; for other pages we
// only read up to the requested page (page 1 = postPerPage docs).
export const dataRun2 = async (
  thethreadid: number,
  forum: string,
  page: number,
  postPerPage: number,
  totalCount: number
): Promise<PostsStructure[]> => {
  try {
    const colRef = postsRef(thethreadid, forum);
    const lastPage = Math.max(1, Math.ceil(totalCount / postPerPage));
    const safePage = Math.min(Math.max(1, page), lastPage);

    if (safePage === lastPage) {
      const tailCount = totalCount - (lastPage - 1) * postPerPage || postPerPage;
      const snapshot = await getDocs(
        query(colRef, orderBy("timePosted", "desc"), limit(tailCount))
      );
      return snapshot.docs.map(toPost).reverse();
    }

    const snapshot = await getDocs(
      query(colRef, orderBy("timePosted", "asc"), limit(safePage * postPerPage))
    );
    return snapshot.docs.map(toPost).slice((safePage - 1) * postPerPage);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
};
