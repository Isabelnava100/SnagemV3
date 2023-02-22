import { collection, getDocs, query, where } from "firebase/firestore";
import { PostsStructure,ThreadInformation } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";


const sortPostsByTime = (posts: PostsStructure[]): PostsStructure[] => {
    return posts.sort((a, b) => {
      const timeA:number = a.timePosted.seconds + a.timePosted.nanoseconds / 1e9;
      const timeB:number = b.timePosted.seconds + b.timePosted.nanoseconds / 1e9;
      return timeA - timeB;
    });
  };
  
//Get all posts to a specific thread
export const dataRun2=async(newdata2:ThreadInformation[]):Promise<PostsStructure[]>=>{
    const newdataPosts:PostsStructure[]=[];
   if(Object.keys(newdata2).length===0){
    return newdataPosts;
   }else{
        const colRef = collection(db, "posts");
        const q = query(
          colRef,
          where("thread", "==", newdata2[0].id)
        );
        await getDocs(q)
          .then((postsData) => {
            postsData.forEach((doc) => {
              newdataPosts.push({
                id: doc.id, 
                character:doc.data().character,
                owner: doc.data().owner,  
                text:doc.data().text, 
                thread:doc.data().thread, 
                threadLink:doc.data().threadLink, 
                timePosted:doc.data().timePosted, 
                badges:doc.data().badges,
              });
            });
          })
          .finally(() => {
            return(sortPostsByTime(newdataPosts));
          });
   }
   return newdataPosts;
}