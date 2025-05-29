import mongoose, { Schema, Document, Types } from "mongoose";
import { Credentials } from "@zf/types";

/**
 * Represents a linked aggregator account for a given user.
 */
export interface IAggregatorAccount extends Document<Types.ObjectId> {
  /** MongoDB ObjectId of the user who linked this account */
  userId: Types.ObjectId | string;
  /** Key of the aggregator (e.g. "uber", "ola") */
  aggregator: string;
  /** Stored credentials needed to call the aggregator’s APIs */
  creds: Credentials;
  /** When the account was linked */
  linkedAt: Date;
}

const AggregatorAccountSchema = new Schema<IAggregatorAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    aggregator: {
      type: String,
      required: true,
      enum: ["uber", "ola", "gozo"], // expand as you add more adapters
    },
    creds: {
      type: Schema.Types.Mixed,
    },
    linkedAt: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Prevent a user from linking the same aggregator twice
AggregatorAccountSchema.index({ userId: 1, aggregator: 1 }, { unique: true });

export default mongoose.model<IAggregatorAccount>(
  "AggregatorAccount",
  AggregatorAccountSchema
);
