import itemJSONData from "./item.json";

interface SingleItemData {
  id: string;
  name: string;
  category: string;
  filePath: string;
}

interface RawSingleJSONItemData {
  "Item ID": string;
  Name: string;
  Group: string;
  Filename: string;
}

function formatItemJSONData(data: Record<string, any>): SingleItemData[] {
  const formattedData: SingleItemData[] = [];

  for (const key in data) {
    const itemData = data[key] as RawSingleJSONItemData;
    const sanitizedPokemon: SingleItemData = {
      id: itemData["Item ID"],
      name: itemData.Name,
      category: itemData.Group,
      filePath: itemData.Filename,
    };
    formattedData.push(sanitizedPokemon);
  }

  return formattedData;
}

export const itemData = formatItemJSONData(itemJSONData);
