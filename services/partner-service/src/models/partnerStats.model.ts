import { model, Schema } from "mongoose";
import { IPartnerStats } from "@zf/types";

const partnerStatsSchema = new Schema<IPartnerStats>(
  {
    partnerId: {
      type: String,
      required: true,
    },
    hubId: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    bookingsAssigned: {
      type: [String],
      required: true,
    },
    bookingsCompleted: {
      type: [String],
      required: true,
    },
    metrics: {
      onlineTime: {
        type: Number,
        required: true,
      },
      idleTime: {
        type: Number,
        required: true,
      },
      breakTime: {
        type: Number,
        required: true,
      },
      activeTime: {
        type: Number,
        required: true,
      }
    },

    curruntBookingId: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
)

const PartnerStats = model<IPartnerStats>('PartnerStats', partnerStatsSchema);