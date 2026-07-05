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

// Raw names are lowercase slugs ("beast", "ability-capsule") and balls/berries
// drop their suffix. Build a complete, human-readable display name.
function formatItemName(rawName: string, group: string): string {
  const titled = rawName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  if (group === "ball") return `${titled} Ball`;
  if (group === "berry") return `${titled} Berry`;
  if (group === "tm") return `TM ${titled}`;
  if (group === "tr") return `TR ${titled}`;
  return titled;
}

function formatItemJSONData(data: Record<string, any>): SingleItemData[] {
  const formattedData: SingleItemData[] = [];

  for (const key in data) {
    const itemData = data[key] as RawSingleJSONItemData;
    const sanitizedPokemon: SingleItemData = {
      id: itemData["Item ID"],
      name: formatItemName(itemData.Name, itemData.Group),
      category: itemData.Group,
      filePath: itemData.Filename,
    };
    formattedData.push(sanitizedPokemon);
  }

  return formattedData;
}

export const itemData = formatItemJSONData(itemJSONData);
