// services/user-service/src/models/user.model.ts
import mongoose, { Schema, Document } from "mongoose";

// Provider types that your app supports
export enum AuthProvider {
  PHONE = "phone",
  GOOGLE = "google",
  APPLE = "apple",
  // add more as needed
}

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

export interface IUser extends Document {
  providers: IAuthProvider[];
  metadata: Record<string, any>; // extensible field for custom data
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
