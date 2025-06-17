import { Schema, model, Document } from "mongoose";

export enum BookingStatus {
  CREATED = "created",
  QUOTED = "quoted", // after Hold succeeds
  CONFIRMED = "confirmed", // after Confirm succeeds
  LEFTFORPICKUP = "leftforpickup",
  ARRIVED = "arrived",
  STARTED = "started",
  COMPLETED = "completed",
  CANCELED = "canceled",
  FAILED = "failed", // if hold or confirm errors out
}

export interface CarDetails {
  isAttached: number;
  id: number;
  model: string;
  number: string;
  hasCNG: number;
  roofTop: number;
  licensePlate: any;
  category: any;
  hasElectric: number;
}

export interface DriverDetails {
  name: string;
  contact: {
    code: string;
    number: string;
  };
}

//  Universal Booking interface
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
  otp?: string;
  assigedVehicle?: CarDetails;
  driverDetails?: DriverDetails;
  vehicleType: string;
  startDate: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm:ss"
  raw?: any;
  // Timestamps:
  createdAt: Date;
  updatedAt: Date;
  rideStatusUpdates?: {
    status: string;
    timesatamp: Date;
    assignedTo: string | null;
  };
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
    otp: { type: String },
    driverDetails: { type: Schema.Types.Mixed },
    assigedVehicle: { type: Schema.Types.Mixed },
    raw: { type: Schema.Types.Mixed },
    rideStatusUpdates: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

BookingSchema.index({ universalBookingId: 1 });
BookingSchema.index({ adapterBookingId: 1 });

export const BookingModel = model<IUniversalBooking>("Booking", BookingSchema);
