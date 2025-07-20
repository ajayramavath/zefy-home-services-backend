import { Schema, model } from 'mongoose';
import { IService } from '@zf/types';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

const serviceSchema = new Schema<IService>(
  {
    serviceId: {
      type: String,
      unique: true,
      default: () => `SVC${nanoid(6)}`,
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

export const Service = model<IService>('Service', serviceSchema);