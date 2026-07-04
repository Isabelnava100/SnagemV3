import {
  NewForumInfo as data,
  PermissionsForForum,
  User,
} from "../../../components/types/typesUsed";
import { allowedForumValues } from "../../../lib/permissions";

// Forums this user may see. Default-DENY via allowedForumValues (see lib/permissions):
// base members get the standard forums, Master/SeeMasterForums adds the master-only
// forum, Admin sees all, Applicant/Disabled see none.
export const filteredData = (
  user: User | undefined = undefined
): Array<PermissionsForForum> => {
  const allowed = allowedForumValues(user);
  return data.filter((item) => allowed.includes(item.value));
};
