import {
    collection,
    getDocs,
  } from "firebase/firestore";
import { ThreadInformation } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";
  


export const dataRun = async (
  ForumWhich: string|undefined,
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
            });
          })
          .finally(() => {
            return newData;
          });
          return newData;
}; 

















  // //This is to fetching list of threads in a specific forum location
  // export const dataRunOLD = async (
  //   ForumWhich: string|undefined,
  // ): Promise<ThreadInformation[]> => {
  //   const newData: ThreadInformation[] = [];
  //       //Get Threads for a specific Forum location start
  //       const colRef = collection(db, "threads");
  //       const q = query(
  //         colRef,
  //         where("location", "==", ForumWhich)
  //       );
  //       await getDocs(q)
  //         .then((postsData) => {
  //           postsData.forEach((doc) => {
  //               newData.push({
  //                   id: doc.id,
  //                   createdBy: doc.data().createdBy,
  //                   location: doc.data().location,
  //                   timePosted: new Date(doc.data().timePosted.seconds * 1000)
  //                   .toLocaleString("en-US", { 
  //                     year: "numeric",
  //                     month: "long",
  //                     day: "numeric",
  //                     hour: "numeric",
  //                     minute: "numeric",
  //                     hour12: false,
  //                   }),
  //                   threadLink: doc.data().threadLink,
  //                   private: doc.data().private,
  //                   title: doc.data().title,
  //                   closed: doc.data().closed,
  //                 });
  //           });
  //         })
  //         .finally(() => {
  //           return newData;
  //         });
  //         //Get Threads for a specific Forum location end
      
 
  //   return newData;
  // }; 
  // /*
  //   try {   } catch (error) {
  //     alert("There has been an error, please inform the administrator.");
  //   } */