import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { ThreadInformation } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";

export const dataRun = async (
  ForumWhich: string | undefined,
  archive: boolean
): Promise<ThreadInformation[]> => {
  const newData: ThreadInformation[] = [];
  
  // Get Threads for a specific Forum location
  const colRef = collection(db, "forum");
  const newRef = collection(colRef, `${ForumWhich}`, "threads");
  const q = query(newRef, orderBy("timePosted", "desc"), limit(200));

  try {
    const postsData = await getDocs(q);
    postsData.forEach((doc) => {
      if (Object.keys(doc.data()).length > 0) {
        if (doc.data().closed === archive) {
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
      }
    });
  } catch (error) {
    console.error("Error fetching threads:", error);
  }

  return newData;
}; 




