import { createContext, ReactNode, useState } from 'react';
import { ProviderForumSetup, NewForumInfo as basicThreadLocationData } from '../../../components/types/typesUsed';

interface ForumProviderProps {
    children: ReactNode;
  }

interface ForumContextType {
    forumTitle: ProviderForumSetup[];
    setForumTitle: React.Dispatch<React.SetStateAction<ProviderForumSetup[]>>;
  } 

/*const basicThreadLocationData: ProviderForumSetup[] = [
  { value: '1', label: 'Main Forums', link: '/Forum/Main-Forum', description: 'This is where the roleplay happens.' },
  { value: '2', label: 'Side Roleplay', link:'/Forum/Side-Roleplay',description:'This space is for small, side roleplays.'},
  { value: '3', label: 'Master Mission', link:'/Forum/Master-Mission',description:'Here are where master missions happens.'},
  { value: '4', label: 'Quests', link:'/Forum/Quests',description:'Pick up quests to do on your own or with friends.'},
  { value: '5', label: 'Events', link:'/Forum/Events',description:'Participate in events and get prizes!'},
  { value: '6', label: 'Private', link:'/Forum/Private',description:'Keep a record of your own quests and roleplays here.'},
  { value: '7', label: 'Archived', link:'/Forum/Archived',description:'Any old, closed roleplay.'},
  ];*/

export const ForumContext = createContext<ForumContextType | null>(null);

export function ForumProvider({ children }: ForumProviderProps) {
    const [forumTitle, setForumTitle] = useState<ProviderForumSetup[]>(basicThreadLocationData);
  
    return (
      <ForumContext.Provider value={{ forumTitle, setForumTitle }}>
        {children}
      </ForumContext.Provider>
    );
  }