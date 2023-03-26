import {
    doc,
    getDoc,
  } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
  import { myBookmarksInfo, User } from "../../../components/types/typesUsed";
import { UserAuth } from "../../../context/AuthContext";
  import { db } from "../../../context/firebase";
  
async function fetchMyBookmarks(user: User | undefined = undefined): Promise<myBookmarksInfo[]> {
    let newData: myBookmarksInfo[] = []; 
    const colRef = doc(db, 'users', `${user?.uid}`);
    const docSnap = await getDoc(colRef);
  
    if (docSnap.exists()) {      
      const str=docSnap.data().myBookmarks;
      str.forEach((bookmark: { match: (arg0: RegExp) => string[]; }) => {
        const where = bookmark.match(/where\[(.*?)\]/)[1];
        const name = bookmark.match(/name\[(.*?)\]/)[1];
        newData.push({where, name});
      });
      return newData;
    } else {
      console.log("No Bookmarks.");
    }
  
    return newData;
  }


const BookmarkModule: React.FC = () => {
    const {user}=UserAuth();
  const [myBookmarks, setMyBookmarks] = useState<myBookmarksInfo[]>([]);

  useEffect(() => {
    async function fetchData() {
        try{ 
            const bookmarks = await fetchMyBookmarks(user);
            setMyBookmarks(bookmarks);
        }catch (err){console.error(err)}finally{return Promise.resolve()} //add to all promises
    }
    fetchData();
  }, []);

  return (
    <div>
      {myBookmarks.length === 0?"No Bookmarks found.":
      myBookmarks.map((bookmark, index) => {
        return (
          <p key={index + bookmark.name}>
            <Link to={"/" + bookmark.where}>{bookmark.name}</Link>
          </p>
        );
      })}
    </div>
  );
};

export default BookmarkModule;
