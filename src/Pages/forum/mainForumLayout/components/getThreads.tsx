import {
    collection,
    getDocs,
  } from "firebase/firestore";
import { ThreadInformation } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";
  


export const dataRun = async (
  ForumWhich: string|undefined,
  archive:boolean,
): Promise<ThreadInformation[]> => {
  const newData: ThreadInformation[] = [];
      //Get Threads for a specific Forum location start
      const colRef = collection(db, 'forum'); 
      const newRef=collection (colRef, `${ForumWhich}`, 'threads')
      await getDocs(newRef)
          .then((postsData) => {
            postsData.forEach((doc) => {
               if(Object.keys(doc.data()).length > 0) {
                          const date = new Date(doc.data().timePosted.seconds * 1000);
                          if(doc.data().closed===archive){
                          newData.push({
                            id: Number(doc.id),
                            closed: doc.data().closed,
                            createdBy: doc.data().createdBy,
                            notifyviaDiscord: doc.data().notifyviaDiscord,
                            private: doc.data().private,
                            timePosted: date.toLocaleString("en-US", { 
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "numeric",
                              minute: "numeric",
                              hour12: false,
                            }),
                            title: doc.data().title,
                          });
                        }
                      }
            });
          })
          .finally(() => {
            return newData;
          });
          return newData;
}; 




