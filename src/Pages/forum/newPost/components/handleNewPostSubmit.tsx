import { doc, updateDoc } from "firebase/firestore";
import { ThreadInformation, User } from "../../../../components/types/typesUsed";
import { db } from "../../../../context/firebase";
import { sendMessage } from "../../../../Discord/NewPost";

//This creates a new post, updates last time posted on the thread and sends a discord bot msg
export const handleSubmit = async (
    character: string,
    text: string,
    allThreads:ThreadInformation[],
    thethreadid:string|undefined,
    user: User | undefined = undefined,
    ) => {
    
  const nextLocation=(allThreads.map(item => item.id))[0];
  const checkBadges=user?.otherinfo?.badges;
  const usernamePosting=user?.displayName||'';

  const thedate=new Date();
  const batch = db.batch();

  const newPostRef = db.collection("posts").doc();
  batch.set(newPostRef, {
    character: character,
    thread: nextLocation,
    threadLink: Number(thethreadid),
    owner: usernamePosting,
    text: text,
    timePosted: thedate,
    badges: checkBadges ? user?.otherinfo?.badges : null,
  });

  const threadRef = db.collection("threads").doc(nextLocation);
  batch.update(threadRef, { timePosted: thedate });

  await batch.commit();
  await sendMessage(allThreads, usernamePosting);
  //   console.log(await sendMessage(allThreads, usernamePosting));
    
};