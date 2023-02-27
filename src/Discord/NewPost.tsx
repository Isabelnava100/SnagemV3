import axios from "axios";
import { ThreadInformation } from "../components/types/typesUsed";

export const sendMessage = async (
    allThreads:ThreadInformation[],
    displayName:string,
    forumName:string,
    thethreadid:string
    ) => {
  if (allThreads[0].notifyviaDiscord) {
    console.log();
    const message = {
      "usernames":allThreads[0].notifyviaDiscord, 
      "url": `http://snagemguild.com/Forum/${forumName}/thread/${thethreadid}`,
      "via": "Bookmarked by",
      "nameThread": allThreads[0].title,
      "from": displayName,
  };
      const response = await axios
      .post( import.meta.env.VITE_BACKEND_DISCORD_BOT, message,
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
