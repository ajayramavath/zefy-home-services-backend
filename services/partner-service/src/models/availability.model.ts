import { IAvailability } from '@zf/types';
import { mongoose, Schema } from "@zf/common";

const availabilitySchema = new Schema<IAvailability>(
  {
    partnerId: {
      type: String,
      required: true,
    },
    isOnline: {
      type: Boolean,
      required: true,
      default: false,
    },
    status: {
      type: String,
      enum: ['OFFLINE', 'IDLE', 'ASSIGNED', 'ENROUTE', 'ARRIVED', 'BUSY', 'BREAK'],
      required: true,
    },
    location: {
      coordinates: {
        type: [Number],
        required: true,
      },
      updatedAt: {
        type: Date,
      }
    },
    workingSchedule: {
      workingDays: {
        type: [Number],
        required: true,
      },
      workingHours: {
        start: {
          type: String,
          required: true,
        },
        end: {
          type: String,
          required: true,
        }
      }
    },
    todayStats: {
      completedJobs: {
        type: [String],
        required: true,
      },
      scheduledJobs: {
        type: [String],
        required: true,
      }
    },
    serviceIDs: {
      type: [String],
      ref: 'Service',
      required: true,
    },
    operationalHubId: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
  }
)

export const Availability = mongoose.model<IAvailability>('Availability', availabilitySchema);

