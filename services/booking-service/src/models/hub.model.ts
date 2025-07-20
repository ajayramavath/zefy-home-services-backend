import { Schema, model } from 'mongoose';
import { IHub } from '@zf/types';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

const hubSchema = new Schema<IHub>(
  {
    hubId: {
      type: String,
      unique: true,
      default: () => `HUB${nanoid()}`,
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
        enum: ['Polygon', 'MultiPolygon'],
        required: true,
      },
      coordinates: {
        type: [[[Number]]],
        required: true,
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

hubSchema.virtual('services', {
  ref: 'HubService',
  localField: 'hubId',
  foreignField: 'hubId',
});

export const Hub = model<IHub>('Hub', hubSchema);