import mongoose, { Schema, Document, Types } from "mongoose";
import { IUser } from "@zf/types";

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String },
    gender: { type: String, enum: ["male", "female", "other"] },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    phoneNumberVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["admin", "user", "partner"], required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", UserSchema);
