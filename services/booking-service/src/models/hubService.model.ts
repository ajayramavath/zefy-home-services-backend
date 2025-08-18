import { Schema, mongoose } from '@zf/common';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

interface IHubService {
  hubServiceId: string;
  hubId: string;
  serviceId: string;
  customPrice?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hubServiceSchema = new Schema<IHubService>(
  {
    hubServiceId: {
      type: String,
      unique: true,
      default: () => `HSV${nanoid(6)}`,
    },
    hubId: {
      type: String,
      ref: 'Hub',
      required: true,
    },
    serviceId: {
      type: String,
      ref: 'Service',
      required: true,
    },
    customPrice: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

hubServiceSchema.index({ hubId: 1, serviceId: 1 }, { unique: true });

export const HubService = mongoose.model<IHubService>('HubService', hubServiceSchema);
