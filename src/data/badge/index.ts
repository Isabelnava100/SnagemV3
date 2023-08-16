import badgesJSONData from "./badges.json";

interface JSONBadgeData {
  Name: string;
  Label: string;
  Color1: string;
  Color2: string;
}

interface SingleBadgeData {
  id: string;
  name: string;
  background: string;
  description: string;
}

function formatBadgesJSONData(data: Record<string, any>) {
  const formattedData: SingleBadgeData[] = [];

  for (const key in data) {
    const badgeJsonData = data[key] as JSONBadgeData;
    const singleBadgeData: SingleBadgeData = {
      id: key,
      name: badgeJsonData.Name,
      description: badgeJsonData.Label,
      background: `linear-gradient(90deg, #${badgeJsonData.Color1} 0%, #${badgeJsonData.Color2} 100%)`,
    };
    formattedData.push(singleBadgeData);
  }

  return formattedData;
}

export const badgeData = formatBadgesJSONData(badgesJSONData);
