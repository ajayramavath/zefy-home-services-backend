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
    category: {
      type: String,
      enum: ['cleaning', 'laundry', 'car_care'],
      required: true,
    },
    type: {
      type: String,
      enum: ['house_cleaning', 'dishwashing', 'car_cleaning', 'laundry', 'bathroom_cleaning'],
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: String,
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
    minimumDuration: {
      type: Number,
      required: true,
      default: 45,
    },
    maximumDuration: {
      type: Number,
      required: true,
      default: 240,
    },
    availablePackages: [{
      type: {
        type: String,
        enum: ['one-time', 'daily', 'weekly'],
        required: true,
      },
      discount: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
      },
      minDays: Number,
    }],
    tasks: [{
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      description: String,
      isDefault: {
        type: Boolean,
        default: false,
      },
    }],
    addOns: [{
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      description: String,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Service = model<IService>('Service', serviceSchema);