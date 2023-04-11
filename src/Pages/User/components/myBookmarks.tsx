import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User, myBookmarksInfo } from "../../../components/types/typesUsed";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../context/firebase";

async function fetchMyBookmarks(user: User | undefined = undefined): Promise<myBookmarksInfo[]> {
  let newData: myBookmarksInfo[] = [];
  const colRef = doc(db, "users", `${user?.uid}`);
  const docSnap = await getDoc(colRef);

  if (docSnap.exists()) {
    const str = docSnap.data().myBookmarks;
    // console.log(str);
    if (typeof str !== "undefined") {
      // it exists
      if (str.some((str1: string) => str1.trim().length > 0)) {
        // there's data
        str.forEach((bookmark: { match: (arg0: RegExp) => string[] }) => {
          const where = bookmark.match(/where\[(.*?)\]/)[1];
          const name = bookmark.match(/name\[(.*?)\]/)[1];
          newData.push({ where, name });
        });
      }
    }
    // return newData;
  }

  return newData;
}

const BookmarkModule: React.FC = () => {
  const { user } = useAuth();
  const [myBookmarks, setMyBookmarks] = useState<myBookmarksInfo[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const bookmarks = await fetchMyBookmarks(user);
        bookmarks !== null && setMyBookmarks(bookmarks);
      } catch (err) {
        console.error(err);
      } finally {
        return Promise.resolve();
      } //add to all promises
    }
    fetchData();
  }, []);
  return (
    <div>
      {myBookmarks.length > 0
        ? myBookmarks.map((bookmark, index) => (
            <p key={index + bookmark.name}>
              <Link to={"/" + bookmark.where}>{bookmark.name}</Link>
            </p>
          ))
        : "No Bookmarks found."}
    </div>
  );
};

export default BookmarkModule;
