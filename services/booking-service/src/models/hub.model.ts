import { Schema, mongoose } from '@zf/common';
import { IHub } from '@zf/types';
import { v4 as uuidv4 } from 'uuid';


const hubSchema = new Schema<IHub>(
  {
    hubId: {
      type: String,
      unique: true,
      default: () => `HUB${uuidv4()}`,
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

hubSchema.virtual('hubServices', {
  ref: 'HubService',
  localField: 'hubId',
  foreignField: 'hubId',
});

hubSchema.virtual('availableServices', {
  ref: 'HubService',
  localField: 'hubId',
  foreignField: 'hubId',
  match: { isActive: true }
});

hubSchema.set('toJSON', { virtuals: true });
hubSchema.set('toObject', { virtuals: true });

export const Hub = mongoose.model<IHub>('Hub', hubSchema);