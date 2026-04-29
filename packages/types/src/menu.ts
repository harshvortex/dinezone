import type { ID, Timestamps, Money } from "./common";

export type MenuCategory =
  | "starters"
  | "mains"
  | "breads"
  | "rice_and_biryani"
  | "soups"
  | "salads"
  | "desserts"
  | "beverages"
  | "cocktails"
  | "mocktails"
  | "kids_menu"
  | "specials";

export type DietaryTag = "veg" | "non_veg" | "vegan" | "jain" | "gluten_free" | "contains_nuts";

export interface MenuItem extends Timestamps {
  id: ID;
  restaurantId: ID;
  category: MenuCategory;
  name: string;
  description?: string;
  price: Money;
  imageUrl?: string;
  dietaryTags: DietaryTag[];
  isAvailable: boolean;
  isSignatureDish: boolean;
  allergens: string[];
  calories?: number;
  preparationTimeMinutes?: number;
  sortOrder: number;
}

export interface CreateMenuItemDto
  extends Omit<MenuItem, "id" | "createdAt" | "updatedAt"> {}

export type UpdateMenuItemDto = Partial<CreateMenuItemDto>;
