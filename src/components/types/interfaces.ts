export interface Todo { //Todo
  id: number;
  title: string;
  body: string;
}

export interface TodoState {
    
    AllMarketplaces:AllMarketplaces[];
}

export interface Items {
  id:number;
  name:string;
  category:string;
  description:string;
}

export interface AllMarketplaces {
  storeID:number;
  storeName:string;
stock:Stores[];
}

export interface Stores {
itemID:number;
price:number;
discount:number;
quantity:number;
role?:Roles[];
}

export interface Alchemy {
  price:string;
}

export interface Roles {
  id:number;
  name:string;
  userActive:boolean;
}


export interface HeaderTabsProps {
  links: { link: string; label: string }[];

}
export interface ForumPlaceInterface {
  forumPlace:string;

}