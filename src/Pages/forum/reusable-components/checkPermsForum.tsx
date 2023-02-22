import {
  basicForumLocationData as data,
  PermissionsForForum,
  User,
} from "../../../components/types/typesUsed";

//This ensures that the forum location is available to the user.
export const filteredData = ( 
  user: User | undefined = undefined
): Array<PermissionsForForum> => {
  switch (user?.otherinfo?.permissions) {
    case "Master":
      return data.filter((item) => ["2", "3", "6"].includes(item.value));
    case "Admin":
      return data.filter((item) =>
        ["1", "2", "3", "4", "5", "6"].includes(item.value)
      );
    case "User":
      return data.filter((item) => ["2", "6"].includes(item.value));
    default:
      return data;
  }
};
