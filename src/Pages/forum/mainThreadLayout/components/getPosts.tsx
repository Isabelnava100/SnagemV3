import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { PostsStructure } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";

//Get all posts to a specific thread
export const dataRun2 = async (
  thethreadid: number,
  forum: string
): Promise<PostsStructure[]> => {
  const newdataPosts: PostsStructure[] = [];

  const colRef = collection(db, "forum", `${forum}`, "threads", `${thethreadid}`, "posts");
  const q = query(colRef, orderBy("timePosted", "asc"));

  try {
    const postsData = await getDocs(q);
    postsData.forEach((doc) => {
      newdataPosts.push({
        id: doc.id,
        badges: doc.data().badges,
        character: doc.data().character,
        owner: doc.data().owner,
        text: doc.data().text,
        timePosted: doc.data().timePosted,
      });
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
  }

  return newdataPosts;
};