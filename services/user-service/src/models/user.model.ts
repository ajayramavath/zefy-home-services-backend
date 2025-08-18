import { Schema, mongoose } from "@zf/common";
import { IUser } from "@zf/types";

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String },
    gender: { type: String, enum: ["male", "female", "other"] },
    phoneNumber: { type: String, required: true },
    dateOfBirth: { type: Date },
    phoneNumberVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["admin", "user", "partner"], required: true },
    addressIds: { type: [String], default: [], ref: 'Address' },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", UserSchema);
