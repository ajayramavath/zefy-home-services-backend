import { Schema, model } from 'mongoose';
import { IBooking } from '@zf/types';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

const bookingSchema = new Schema<IBooking>(
  {
    bookingId: {
      type: String,
      unique: true,
      default: () => `BK${nanoid(8)}`,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    partnerId: {
      type: String,
      index: true,
    },
    hubId: {
      type: String,
      required: true,
      index: true,
    },
    service: {
      serviceId: {
        type: String,
        required: true,
      },
      serviceName: {
        type: String,
        required: true,
      },
      serviceType: {
        type: String,
        enum: ['one-time', 'daily', 'weekly'],
        required: true,
      },
      tasks: [{
        type: String,
        required: true,
      }],
      addOns: [String],
    },
    schedule: {
      bookingType: {
        type: String,
        enum: ['instant', 'scheduled'],
        required: true,
      },
      scheduledDate: {
        type: Date,
        required: true,
      },
      scheduledTime: {
        type: String,
        required: true,
      },
      duration: {
        type: Number,
        required: true,
        min: 45, // Minimum 45 minutes
      },
      recurringDays: [Number],
    },
    address: {
      street: {
        type: String,
        required: true,
      },
      unit: String,
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
      propertyDetails: {
        bedrooms: {
          type: Number,
          required: true,
          min: 0,
        },
        bathrooms: {
          type: Number,
          required: true,
          min: 0,
        },
        balconies: {
          type: Number,
          default: 0,
          min: 0,
        },
        kitchens: {
          type: Number,
          default: 1,
          min: 0,
        },
        livingRooms: {
          type: Number,
          default: 1,
          min: 0,
        },
      },
    },
    pricing: {
      basePrice: {
        type: Number,
        required: true,
      },
      ratePerMinute: {
        type: Number,
        required: true,
        default: 3,
      },
      estimatedTotal: {
        type: Number,
        required: true,
      },
      finalTotal: Number,
      discount: {
        type: Number,
        default: 0,
      },
      taxes: {
        type: Number,
        required: true,
      },
    },
    payment: {
      method: {
        type: String,
        enum: ['prepaid', 'cod'],
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
      },
      transactionId: String,
      paidAt: Date,
    },
    otp: {
      startOtp: String,
      endOtp: String,
      startOtpGeneratedAt: Date,
      endOtpGeneratedAt: Date,
    },
    timeline: {
      bookedAt: {
        type: Date,
        default: Date.now,
      },
      confirmedAt: Date,
      partnerAssignedAt: Date,
      partnerArrivedAt: Date,
      startedAt: Date,
      completedAt: Date,
      cancelledAt: Date,
    },
    status: {
      type: String,
      enum: [
        'pending_payment',
        'confirmed',
        'partner_assigned',
        'partner_enroute',
        'partner_arrived',
        'in_progress',
        'completed',
        'cancelled',
        'failed',
      ],
      default: 'pending_payment',
      index: true,
    },
    cancellation: {
      reason: String,
      cancelledBy: {
        type: String,
        enum: ['user', 'partner', 'system'],
      },
      refundAmount: Number,
    },
    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      review: String,
      ratedAt: Date,
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
bookingSchema.index({ 'address.coordinates': '2dsphere' });
bookingSchema.index({ 'schedule.scheduledDate': 1, status: 1 });
bookingSchema.index({ partnerId: 1, 'timeline.startedAt': -1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

// Generate OTP method
bookingSchema.methods.generateOTP = function (type: 'start' | 'end') {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  if (type === 'start') {
    this.otp.startOtp = otp;
    this.otp.startOtpGeneratedAt = new Date();
  } else {
    this.otp.endOtp = otp;
    this.otp.endOtpGeneratedAt = new Date();
  }
  return otp;
};

export const Booking = model<IBooking>('Booking', bookingSchema);