// Type or Interface
// In general, interfaces and types are interchangeable in many contexts,
// but there are some differences in how they are used. For example,
// interfaces can be extended and implemented, whereas types can be aliased
// and merged. Additionally, some advanced features of TypeScript, such as
// conditional types and mapped types, can only be used with types.

import { Dispatch, SetStateAction } from "react";

export interface HeaderSearchProps {
  links: {
    link: string;
    label: string;
    icon: string;
    links?: { link: string; label: string }[];
  }[];
}
// This is for changing the navigation if the user is logged in or not

export interface PermissionsForForum {
  link: string;
  value: string;
  label: string;
}
//Interface for forum location listings

export interface ProviderForumSetup {
  value: string;
  label: string;
  link: string;
  description: string;
}
//Creating interface for forum provider interface

export const NewForumInfo: ProviderForumSetup[] = [
  {
    value: "1",
    label: "Main Forums",
    link: "Main-Forum",
    description: "This is where the roleplay happens.",
  },
  {
    value: "2",
    label: "Side Roleplay",
    link: "Side-Roleplay",
    description: "This space is for small, side roleplays.",
  },
  {
    value: "3",
    label: "Master Mission",
    link: "Master-Mission",
    description: "Here are where master missions happens.",
  },
  {
    value: "4",
    label: "Quests",
    link: "Quests",
    description: "Pick up quests to do on your own or with friends.",
  },
  {
    value: "5",
    label: "Events",
    link: "Events",
    description: "Participate in events and get prizes!",
  },
  {
    value: "6",
    label: "Private",
    link: "Private",
    description: "Keep a record of your own quests and roleplays here.",
  },
];
//replace all other with this

export const badgesColors = [
  { color1: "red", color2: "yellow", label: "Test" },
  { color1: "blue", color2: "green", label: "Legacy" },
];
//This is used for getting the static colors of badges

export interface EachPostInfo {
  //used to be Item
  id: string;
  character: string;
  owner: string;
  text: string;
  thread: number;
  otherinfo: SpecificUser | undefined;
}
//This is the set up for fetching each post

export interface EachPostVisual {
  newkey: string;
  image: string;
  bigText: string;
  chara: string;
  author: {
    name: string;
    avatar: string;
    badges: string[];
  };
}
//This is for showing each post on the threads

export interface InfoOnThreadVisual {
  info: ThreadInformation[];
  forum: number | string | undefined;
}
//This is for visually setting up the adjustments above each individual thread

export interface ThreadInformation {
  id: number;
  closed: boolean;
  createdBy: string;
  notifyviaDiscord: Array<string>;
  private: boolean;
  privateTo?: Array<string | null | undefined>;
  timePosted: string;
  title: string;
}

//This is the set up for reading a thread

export interface PostsStructure {
  id: string;
  badges: string[];
  character: string;
  owner: string;
  text: string;
  timePosted: {
    seconds: number;
    nanoseconds: number;
  };
}
//This is the set up for reading a post

export type User = {
  uid: string;
  email: string | null;
  avatar?: string;
  displayName: string | null;
  otherinfo?: SpecificUser;
};
//Database for Users

export type SpecificUser = {
  permissions: string;
  badges: string[];
  discordUID?: string;
};
//Extra details added about the user

export type AuthContextType = {
  user: User | undefined;
  setUser: Dispatch<SetStateAction<User | undefined>>;
};
//AuthContent

export interface myBookmarksInfo {
  where: string;
  name: string;
}

export interface Currencies {
  gengarcoin: string;
  pokecoin: string;
}

export type Categories = "held items" | "pokeball" | "Special";

export type Item = {
  name: string;
  category: Categories;
  image_url?: string;
  quantity: string;
  box_id?: string;
  action?: string;
};

export interface Draft {
  id: string;
  category: string;
  character_name: string;
  color: string;
  date_saved: {
    seconds: number;
    nanoseconds: number;
  };
  location_db: string;
  long_text: string;
  thread_id: string;
  title_thread: string;
}

export interface Character {
  id: string;
  age: string;
  birthday: string;
  height: string;
  moveset: string;
  name: string;
  short_description: string;
  species: string;
  type: "None" | "Hybrid" | "Channeler";
  imageURL: string;
  createdAt: {
    nt: number;
    seconds: number;
  };
}

export const characterTypes = ["None", "Hybrid", "Channeler"];

export interface Team {
  id: string;
  pokemon_ids: string[];
  pokemons: OwnedPokemon[];
  team_name: string;
  times_battled: string;
  created_at: {
    nt: number;
    seconds: number;
  };
}

export interface OwnedPokemon {
  id: string;
  date_caught: {
    nt: number;
    seconds: number;
  };
  image_url: string;
  name: string;
  pokedex: string;
  regiondex: string;
  species: string;
  type1: string;
  type2?: string;
}

export interface Profile {
  avatars: string[];
  coverBG: string;
  cover_backgrounds: string[];
  description: string;
  tags: string[];
}
