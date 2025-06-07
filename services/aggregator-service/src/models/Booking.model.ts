// src/models/booking.ts
import { Schema, model, Document } from "mongoose";

export enum BookingStatus {
  CREATED = "created",
  QUOTED = "quoted", // after Hold succeeds
  CONFIRMED = "confirmed", // after Confirm succeeds
  DRIVER_ASSIGNED = "driver_assigned",
  STARTED = "started",
  COMPLETED = "completed",
  CANCELED = "canceled",
  FAILED = "failed", // if hold or confirm errors out
}

// 1. Universal Booking interface
export interface IUniversalBooking extends Document {
  universalBookingId: string; // our own UUID (e.g. "AGG-xxxxxx")
  adapter: string; // e.g. "gozo", "otherProvider"
  adapterBookingId?: string; // Gozo’s bookingId (populated after Hold)
  status: BookingStatus;

  // we store the original request payload sent to Gozo
  requestPayload: any;

  // raw responses from Gozo:
  holdResponse?: any;
  confirmResponse?: any;

  // Common fields you may want to index/search on:
  tripType: number;
  cabType: number;
  vehicleType: string;
  startDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm:ss"
  raw?: any;
  // Timestamps:
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IUniversalBooking>(
  {
    universalBookingId: { type: String, required: true, unique: true },
    adapter: { type: String, required: true },
    adapterBookingId: { type: String }, // Gozo’s “bookingId”
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.CREATED,
      required: true,
    },

    requestPayload: { type: Schema.Types.Mixed, required: true },
    holdResponse: { type: Schema.Types.Mixed },
    confirmResponse: { type: Schema.Types.Mixed },

    // Optional: flatten out some search keys
    tripType: { type: Number, required: true },
    cabType: { type: Number, required: true },
    startDate: { type: String, required: true },
    startTime: { type: String, required: true },
    raw: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

BookingSchema.index({ universalBookingId: 1 });
BookingSchema.index({ adapterBookingId: 1 });

export const BookingModel = model<IUniversalBooking>("Booking", BookingSchema);
