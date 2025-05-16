import { IAuthProvider } from "./auth";

export type Gender = "male" | "female" | "other";

export interface IUserProfile {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string; // ISO date string
  gender?: Gender;
  email?: string;
  phoneNumber?: string;
}

export interface ILocation {
  name: string;
  lat: number;
  lon: number;
}

export type FavoriteType = "home" | "work" | "other";

export type IUserFavorites = {
  [key in FavoriteType]: ILocation | null;
};

export interface IUser extends IUserProfile {
  _id: string;
  providers: IAuthProvider[];
  metadata: Record<string, any>;
  favoriteLocations: IUserFavorites;
  createdAt: Date;
  updatedAt: Date;
}
