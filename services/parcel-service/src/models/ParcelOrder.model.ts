import mongoose, { Schema, Document, Types } from "mongoose";

export interface IParcelOrder extends Document {
  _id: string | Types.ObjectId;
  provider: string;
  requestId: string;
  status: string; // Porter statuses
  pickup: any;
  drop: any;
  deliveryInstructions?: any;
  rawResponse: any;
  partnerInfo?: {
    name: string;
    vehicle_number: string;
    vehicle_type: string;
    mobile: {
      country_code: string;
      mobile_number: string;
    };
    partner_secondary_mobile?: {
      country_code: string;
      mobile_number: string;
    };
    location?: {
      lat: number;
      long: number;
    } | null;
  } | null;
  orderTimings?: {
    pickup_time: number;
    order_accepted_time: number | null;
    order_started_time: number | null;
    order_ended_time: number | null;
  };
  fareDetails?: {
    estimated_fare_details?: {
      currency: string;
      minor_amount: number;
    } | null;
    actual_fare_details?: {
      currency: string;
      minor_amount: number;
    } | null;
  };
  createdAt: Date;
}

const ParcelOrderSchema = new Schema<IParcelOrder>(
  {
    provider: { type: String, required: true },
    requestId: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "live", "cancelled", "ended"],
      default: "open",
    },
    pickup: { type: Schema.Types.Mixed, required: true },
    drop: { type: Schema.Types.Mixed, required: true },
    deliveryInstructions: { type: Schema.Types.Mixed },
    rawResponse: { type: Schema.Types.Mixed },

    partnerInfo: {
      name: String,
      vehicle_number: String,
      vehicle_type: String,
      mobile: {
        country_code: String,
        mobile_number: String,
      },
      partner_secondary_mobile: {
        country_code: String,
        mobile_number: String,
      },
      location: {
        lat: Number,
        long: Number,
      },
    },

    orderTimings: {
      pickup_time: Number,
      order_accepted_time: Number,
      order_started_time: Number,
      order_ended_time: Number,
    },

    fareDetails: {
      estimated_fare_details: {
        currency: String,
        minor_amount: Number,
      },
      actual_fare_details: {
        currency: String,
        minor_amount: Number,
      },
    },
  },
  { timestamps: true }
);

export const ParcelOrder = mongoose.model<IParcelOrder>(
  "ParcelOrder",
  ParcelOrderSchema
);
