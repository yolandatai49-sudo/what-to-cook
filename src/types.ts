export const CATEGORIES = [
  "家常菜",
  "主食",
  "快手菜",
  "减脂餐",
  "汤",
  "甜品",
  "其他",
] as const;
export type Category = (typeof CATEGORIES)[number];
export type Ingredient = { name: string; amount: string; unit: string };
export type Recipe = {
  id: string;
  title: string;
  category: Category;
  minutes: number | null;
  image: string;
  ingredients: Ingredient[];
  steps: string[];
  sourceUrl: string;
  notes: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
};
export type ShoppingItem = {
  id: string;
  name: string;
  amount: string;
  unit: string;
  recipes: string[];
  checked: boolean;
};
export type ShoppingState = {
  id: "current";
  recipeIds: string[];
  items: ShoppingItem[];
  updatedAt: number;
};
export type Backup = {
  app: "what-to-cook";
  version: 1;
  exportedAt: string;
  recipes: Recipe[];
  shopping?: ShoppingState;
};
export type Page = "home" | "recipes" | "import" | "shopping" | "settings";
