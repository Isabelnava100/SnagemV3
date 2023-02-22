import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ThreadInformation, User } from "../../../components/types/typesUsed";
import { db } from "../../../context/firebase";
import { filteredData } from "./checkPermsForum";

//This is to fetch the needed info before making a new post and check permissions of the user
export const dataRun = async (
  ThreadLocation: number,
  checkingLoc: boolean,
  newlocation: string,
  user: User | undefined = undefined,
  newWhat:string,
): Promise<ThreadInformation[]> => { 
  const newData: ThreadInformation[] = [];
    if (checkingLoc) {
      //Option one where we are fetching data via thread uid end
      await getDoc(doc(db, "threads", newlocation))
        .then((currentThread) => {
          newData.push({
            id: currentThread.id,
            timePosted: currentThread.data()?.timePosted,
            location: currentThread.data()?.location,
            private: currentThread.data()?.private,
            title: currentThread.data()?.title,
            closed: currentThread.data()?.closed,
            notifyviaDiscord: currentThread.data()?.notifyviaDiscord,
          });
        })
        .finally(() => {
          switch (true) {
            case newData.some((mission) => mission.closed):
              alert("This is thread has been closed.");
              return newData;
            case newData.some((mission) => mission.private):
              alert("This is thread is private.");
              return newData;
              //below is only for new topic, not new posts
                  // case newData.some(
                  //   (mission) =>
                  //     !filteredData(user).some(
                  //       (item) => item.value === mission.location.toString()
                  //     )
                  // ):
                  //   alert("You don't have permissions to post in this thread.");
                 // return newData;
              //above is only for new topic, not new posts
            default:
              return newData;
          }
        });
      //Option one where we are fetching data via thread uid end
    } else {
      //Option two where we are fetching data via thread url start
      const colRef = collection(db, "threads");
      const q = query(
        colRef,
        where("threadLink", "==", ThreadLocation)
      );
      await getDocs(q)
        .then((postsData) => {
          postsData.forEach((doc) => {
            newData.push({
              id: doc.id,
              timePosted: doc.data()?.timePosted,
              private: doc.data().private,
              title: doc.data().title,
              closed: doc.data().closed,
              location: doc.data().location,
              notifyviaDiscord: doc.data()?.notifyviaDiscord,
            });
          });
        })
        .finally(() => {
          return newData;
        });
        //Option two where we are fetching data via thread url end
    }
  return newData;
}; 
