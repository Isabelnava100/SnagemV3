import { User } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";

//Submits a new Topic 
export const handleSubmit = async (
    title: string,
    forum: string,
    postas: string,
    firstpost: string,
    user: User | undefined = undefined,
    valueNewThread:number | undefined = undefined,
    ) => {
      const dataRef = db.collection('threads');
      const dataRef2 = db.collection('posts');
      const checkBadges=user?.otherinfo?.badges;
      const docRef = await dataRef.add({
        closed: false,
        createdBy: user?.displayName,
        location: Number(forum),
        private: false,
        timePosted: new Date(),
        threadLink:valueNewThread,
        title: title
      });      
     const docId = docRef.id;
      const docRef2 = await dataRef2.add({
        character: postas,
        owner: user?.displayName,
        text: firstpost,
        thread: docId,
        threadLink:valueNewThread, //url number
        timePosted: new Date(),
        badges:checkBadges?user?.otherinfo?.badges:null,
      });
      if (docRef && docRef2){
        return true
      }
      
  };