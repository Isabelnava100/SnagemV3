import { collection, doc, updateDoc, writeBatch } from "firebase/firestore";
import { ThreadInformation, User } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";
import { sendMessage } from "../../../../Discord/NewPost";

//This creates a new post, updates last time posted on the thread and sends a discord bot msg
export const handleSubmit = async (
    character: string,
    text: string,
    thethreadid:string|undefined,
    user: User | undefined = undefined,
    forumName:string|undefined,
    allThreads:ThreadInformation[]
    ):Promise<boolean> => {
  
      
  const checkBadges=user?.otherinfo?.badges;
  const usernamePosting=user?.displayName||'';
  const timePosted=new Date();
  const batch = writeBatch(db);
  if (forumName&&thethreadid){
  
    const colRefCount = collection(db, 'forum', `${forumName}`, 'threads');
    const colRef = doc(colRefCount,`${thethreadid}`);
    const colPost = collection(colRef, 'posts');


    batch.set(colRef, {
      timePosted,
      }, { merge: true });

      

    batch.set(doc(colPost), {
      badges:checkBadges?user?.otherinfo?.badges:null,
      character,
      owner: user?.displayName,
      text,
      timePosted,
  });
  
    await batch.commit();
    //below for discord
    // if(allThreads[0].notifyviaDiscord) {
    //   await sendMessage(allThreads, usernamePosting,forumName,thethreadid); 
    //   return true;
    // }else {
    // return true; 
    // }
    return true; //for now
  }else {
    return false;
  }
  
    
};