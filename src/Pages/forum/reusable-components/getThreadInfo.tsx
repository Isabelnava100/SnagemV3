import {
  doc,
  getDoc,
} from "firebase/firestore";
import { ThreadInformation } from "../../../components/types/typesUsed";
import { db } from "../../../context/firebase";

//This is to fetch the needed info before making a new post and check permissions of the user
export const dataRun = async (
  thethreadid: number,
  forum:string,
  // user: User | undefined = undefined,
): Promise<ThreadInformation[]> => { 
  let newData: ThreadInformation[] = []; 
      //Option one where we are fetching data via thread uid end

      const colRef = doc(db, 'forum', `${forum}`, 'threads', `${thethreadid}`);
      // const threadRef=collection(newRef, `${thethreadid}`);
      const docSnap = await getDoc(colRef);
  
      if (docSnap.exists()) {          
        newData.push({
          id: thethreadid,
          closed: docSnap.data().closed,
          createdBy: docSnap.data().createdBy,
          notifyviaDiscord: docSnap.data().notifyviaDiscord,
          private: docSnap.data().private,
          timePosted: docSnap.data().timePosted,
          title: docSnap.data().title,
        });
      } else {
        console.log("This thread couldn't be found.");
        return newData;
      }
      
      switch (true) {
        case newData.some((mission) => mission.closed):
          console.log("This thread has been closed.");
          return newData;
        case newData.some((mission) => mission.private):
          console.log("This thread is private.");
          return newData;
        default:
          return newData;
      }
}; 
