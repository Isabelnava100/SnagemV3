import axios from "axios";
import { ThreadInformation } from "../components/types/typesUsed";

export const sendMessage = async (
    allThreads:ThreadInformation[],
    displayName:string,
    forumName:string,
    thethreadid:string
    ) => {
  if (allThreads[0].notifyviaDiscord) {
    console.log(allThreads[0].notifyviaDiscord);
    const message = {
      "usernames":['375276983766089731'], 
      "url": `http://localhost:5173/Forum/${forumName}/thread/${thethreadid}`,
      "via": "Bookmarked by",
      "nameThread": allThreads[0].title,
      "from": displayName,
  };
      const response = await axios
      .post('https://TediousAvariciousTasks.isabelnava.repl.co/', message,
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://snagemguild.com',
        },
      });
      return(response.data);
  } 
  else {
    return('theres no one to notify');
  }
}
//send notification to discord bot
