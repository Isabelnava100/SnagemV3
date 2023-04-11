import { createContext, ReactNode, useState } from "react";
import {
  NewForumInfo as basicThreadLocationData,
  ProviderForumSetup,
} from "../../../components/types/typesUsed";

interface ForumProviderProps {
  children: ReactNode;
}

interface ForumContextType {
  forumTitle: ProviderForumSetup[];
  setForumTitle: React.Dispatch<React.SetStateAction<ProviderForumSetup[]>>;
}

export const ForumContext = createContext<ForumContextType | null>(null);

export function ForumProvider({ children }: ForumProviderProps) {
  const [forumTitle, setForumTitle] = useState<ProviderForumSetup[]>(basicThreadLocationData);

  return (
    <ForumContext.Provider value={{ forumTitle, setForumTitle }}>{children}</ForumContext.Provider>
  );
}
