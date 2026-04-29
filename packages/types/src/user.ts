import type { ID, Timestamps, SoftDelete } from "./common";

export type UserRole = "customer" | "restaurant_owner" | "admin" | "super_admin";
export type AuthProvider = "email" | "google" | "facebook" | "apple";

export interface User extends Timestamps, SoftDelete {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  authProvider: AuthProvider;
  authProviderId?: string;
  lastLoginAt?: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  dietaryRestrictions: ("vegetarian" | "vegan" | "gluten_free" | "halal" | "kosher")[];
  cuisinePreferences: string[];
  maxTravelDistanceKm: number;
  notificationsEnabled: boolean;
  marketingEmailsEnabled: boolean;
  smsAlertsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  defaultCurrency: string;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  authProvider?: AuthProvider;
  authProviderId?: string;
}

export type UpdateUserDto = Partial<
  Pick<User, "firstName" | "lastName" | "phone" | "avatarUrl" | "preferences">
>;

export type PublicUser = Omit<
  User,
  "authProviderId" | "deletedAt" | "isActive" | "preferences"
>;
