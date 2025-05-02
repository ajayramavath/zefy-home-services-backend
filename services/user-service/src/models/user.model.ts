// services/user-service/src/models/user.model.ts
import mongoose, { Schema, Document, Types } from "mongoose";

// Provider types that your app supports
export enum AuthProvider {
  PHONE = "phone",
  GOOGLE = "google",
  APPLE = "apple",
  // add more as needed
}

// Gender
export type Gender = "male" | "female" | "other";
// Favourite address
export type FavoriteType = "home" | "work" | "other";

// Sub-document for favourite locations
export interface ILocation {
  name: string;
  lat: number;
  lon: number;
}

// Sub-schema for a location
const LocationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
  },
  { _id: false }
);

// Sub-document for each provider linked to a user
export interface IAuthProvider {
  provider: AuthProvider;
  providerId: string; // e.g., Firebase UID, Google sub, Apple ID
  email?: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  isVerified: boolean; // whether Firebase has verified this credential
  createdAt: Date;
}

export interface IUser extends Document<Types.ObjectId> {
  // _id: mongoose.Schema.Types.ObjectId;
  providers: IAuthProvider[];
  metadata: Record<string, any>; // extensible field for custom data
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  favoriteLocations: Partial<Record<FavoriteType, ILocation>>;
  createdAt: Date;
  updatedAt: Date;
}

const AuthProviderSchema = new Schema<IAuthProvider>(
  {
    provider: {
      type: String,
      enum: Object.values(AuthProvider),
      required: true,
    },
    providerId: { type: String, required: true },
    email: { type: String },
    phoneNumber: { type: String },
    displayName: { type: String },
    photoURL: { type: String },
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    providers: {
      type: [AuthProviderSchema],
      validate: {
        // ensure no duplicate provider entries
        validator: (arr: IAuthProvider[]) => {
          const seen = new Set<string>();
          return arr.every((p) => {
            const key = `${p.provider}|${p.providerId}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        },
        message: "Duplicate auth provider entries are not allowed.",
      },
      required: true,
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    firstName: { type: String },
    middleName: { type: String },
    lastName: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["male", "female", "other"] },
    favoriteLocations: {
      home: { type: LocationSchema, default: null },
      work: { type: LocationSchema, default: null },
      other: { type: LocationSchema, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Unique index to prevent same providerId for a provider across users
UserSchema.index(
  { "providers.provider": 1, "providers.providerId": 1 },
  { unique: true, sparse: true }
);

export default mongoose.model<IUser>("User", UserSchema);
