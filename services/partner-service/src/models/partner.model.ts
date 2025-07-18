import { Schema, model } from 'mongoose';
import { IPartner } from '@zf/types';

const partnerSchema = new Schema<IPartner>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    personalInfo: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
      dateOfBirth: {
        type: Date,
        required: true,
      },
      gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true,
      },
      profilePicture: String,
    },
    contact: {
      phone: {
        type: String,
        required: true,
      },
      email: String,
      emergencyContact: String,
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
        lat: Number,
        lng: Number,
      },
    },
    bankDetails: {
      accountHolderName: {
        type: String,
        required: true,
      },
      accountNumber: {
        type: String,
        required: true,
      },
      ifscCode: {
        type: String,
        required: true,
      },
      bankName: {
        type: String,
        required: true,
      },
      upiId: String,
    },
    services: [{
      type: String,
      ref: 'Service',
    }],
    operationalHubs: [{
      type: String,
      ref: 'Hub',
    }],
    availability: {
      isAvailable: {
        type: Boolean,
        default: false,
      },
      workingDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5, 6], // Monday to Saturday
        validate: {
          validator: (days: number[]) => days.every(d => d >= 0 && d <= 6),
          message: 'Working days must be between 0-6',
        },
      },
      workingHours: {
        start: {
          type: String,
          default: '09:00',
        },
        end: {
          type: String,
          default: '18:00',
        },
      },
      unavailableDates: [Date],
    },
    verification: {
      idProof: {
        type: {
          type: String,
          enum: ['aadhaar', 'pan', 'driving_license'],
        },
        number: String,
        verified: {
          type: Boolean,
          default: false,
        },
        frontPhoto: String,
        backPhoto: String,
      },
      backgroundCheck: {
        status: {
          type: String,
          enum: ['pending', 'completed', 'failed'],
          default: 'pending',
        },
        completedAt: Date,
      },
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    earnings: {
      totalEarned: {
        type: Number,
        default: 0,
      },
      pendingPayout: {
        type: Number,
        default: 0,
      },
      lastPayoutDate: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive', 'suspended'],
      default: 'pending',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
partnerSchema.index({ 'address.coordinates': '2dsphere' });
partnerSchema.index({ operationalHubs: 1, 'availability.isAvailable': 1 });
partnerSchema.index({ services: 1, status: 1 });

export const Partner = model<IPartner>('Partner', partnerSchema);