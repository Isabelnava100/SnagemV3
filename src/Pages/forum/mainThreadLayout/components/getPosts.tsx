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
export const dataRun2=async(  
  thethreadid: number,
  forum:string,
  ):Promise<PostsStructure[]>=>{
    const newdataPosts:PostsStructure[]=[];

    const colRef = collection(db, 'forum', `${forum}`, 'threads', `${thethreadid}`, 'posts');
        
        await getDocs(colRef)
          .then((postsData) => {
            postsData.forEach((doc) => {
              newdataPosts.push({
                id: doc.id, 
                badges:doc.data().badges,
                character:doc.data().character,
                owner: doc.data().owner,  
                text:doc.data().text, 
                timePosted:doc.data().timePosted, 
              });
            });
          })
          .finally(() => {
            return(sortPostsByTime(newdataPosts));
          });
   
   return newdataPosts;
}