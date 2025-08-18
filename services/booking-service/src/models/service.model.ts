import { Schema, mongoose } from '@zf/common';
import { IService, IServiceVersion } from '@zf/types';
import { customAlphabet } from 'nanoid';


const serviceVersion = new Schema<IServiceVersion>({
  version: {
    type: String,
    required: true,
  }
});

const serviceSchema = new Schema<IService>(
  {
    serviceId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: String,
    isPackage: {
      type: Boolean,
      default: false,
      required: true,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    ratePerMinute: {
      type: Number,
      required: true,
      default: 3,
    },
    estimatedDuration: {
      type: Number,
      required: true,
    },
    tasksIncluded: [{
      type: String,
      required: true,
    }],
    tasksExcluded: [{
      type: String,
      required: true,
    }],
    isAvailable: {
      type: Boolean,
      default: true,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['SWEEPING_MOPPING', 'KITCHEN_UTENSILS', 'CAR_CLEANING', 'LAUNDRY', 'BATHROOM', 'KITCHEN_PREP', 'DAILY_ESSENTIALS'],
    }
  },
  {
    timestamps: true,
  }
);

serviceSchema.virtual('hubs', {
  ref: 'HubService',
  localField: 'serviceId',
  foreignField: 'serviceId',
});

export const ServiceVersion = mongoose.model<IServiceVersion>('ServiceVersion', serviceVersion);
export const Service = mongoose.model<IService>('Service', serviceSchema);