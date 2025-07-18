import { Schema, model } from 'mongoose';
import { IHub } from '@zf/types';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

const hubSchema = new Schema<IHub>(
  {
    hubId: {
      type: String,
      unique: true,
      default: () => `HUB${nanoid(4)}`,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        required: true,
      },
      coordinates: {
        lat: {
          type: Number,
          required: true,
        },
        lng: {
          type: Number,
          required: true,
        },
      },
    },
    serviceArea: {
      type: {
        type: String,
        enum: ['Polygon'],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
      },
    },
    operationalHours: {
      start: {
        type: String,
        required: true,
        default: '08:00',
      },
      end: {
        type: String,
        required: true,
        default: '20:00',
      },
    },
    services: [{
      type: String,
      ref: 'Service',
    }],
    partnerCount: {
      type: Number,
      default: 0,
    },
    managers: [{
      name: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      email: String,
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

hubSchema.index({ serviceArea: '2dsphere' });
hubSchema.index({ 'address.coordinates': '2dsphere' });

export const Hub = model<IHub>('Hub', hubSchema);