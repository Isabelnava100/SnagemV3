import emotesJSONData from "./emotes.json";

interface JSONEmoteData {
  Name: string;
  Description: string;
  Filename: string;
  GemCost: number;
  CoinCost: number;
  Timeline: string;
}

interface SingleEmoteData extends JSONEmoteData {
  id: string;
}

function formatEmotesJSONData(data: Record<string, any>) {
  const formattedData: SingleEmoteData[] = [];

  for (const key in data) {
    const emoteJSONData = data[key] as JSONEmoteData;
    const singleEmoteData: SingleEmoteData = {
      id: key,
      ...emoteJSONData,
    };
    formattedData.push(singleEmoteData);
  }

  return formattedData;
}

export const emojiData = formatEmotesJSONData(emotesJSONData);

export function getEmoteImageURL(FileName: string) {
  return `https://firebasestorage.googleapis.com/v0/b/snagemguild.appspot.com/o/emotes%2F${FileName}?alt=media`;
}
