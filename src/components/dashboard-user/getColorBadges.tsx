import { badgesColors } from "../types/typesUsed";
export const getColor1 = (labelToFind: string):string => {
  const badge = badgesColors.find(b => b.label === labelToFind);
  return badge?.color1 ?? '';
};
export const getColor2 = (labelToFind: string):string => {
  const badge = badgesColors.find(b => b.label === labelToFind);
  return badge?.color2 ?? '';
};