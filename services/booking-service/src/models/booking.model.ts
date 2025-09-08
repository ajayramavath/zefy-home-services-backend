import { mongoose, Schema, Types } from '@zf/common';
import { IBooking } from '@zf/types';

const bookingSchema = new Schema<IBooking>({
  schedule: {
    type: {
      type: String,
      enum: ['instant', 'scheduled'],
      required: true
    },
    date: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    scheduledDateTime: {
      type: Date,
      required: true,
      index: true
    }
  },

  serviceIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  }],

  user: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: {
      id: { type: Schema.Types.ObjectId, required: true },
      addressString: { type: String, required: true },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
      },
      details: {
        bedrooms: { type: Number, default: 0 },
        bathrooms: { type: Number, default: 0 },
        balconies: { type: Number, default: 0 },
      }
    }
  },

  hubId: {
    type: String,
    // ref: 'Hub',
    // required: true,
    // index: true
  },

  metadata: {
    isRecurring: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },
    parentRecurringId: { type: String, ref: 'RecurringPattern' }
  },

  amount: {
    baseAmount: { type: Number, required: true },
    extraAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }
  },

  bookingStatus: {
    type: String,
    enum: ['created', 'readyForAssignment', 'tracking', 'ongoing', 'completed', 'cancelled'],
    default: 'created',
    index: true
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'baseAmountPaid', 'fullAmountPaid', 'refunded'],
    default: 'pending',
    index: true
  },

  payment: {
    baseAmountPaid: { type: Boolean, default: false },
    fullAmountPaid: { type: Boolean, default: false },
    baseAmountPaymentId: { type: String },
    fullAmountPaymentId: { type: String },
  },

  partnerStatus: {
    type: String,
    enum: ['not_assigned', 'assigned', 'enroute', 'arrived'],
    default: 'not_assigned',
    index: true
  },

  partner: {
    id: { type: Schema.Types.ObjectId, ref: 'Partner' },
    name: String,
    photoUrl: String,
    bookingsCount: Number,
    phoneNumber: String,
    feedbacks: [{
      _id: {
        type: String
      },
      user: {
        id: {
          type: String,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        profilePhoto: String
      },
      partnerId: {
        type: String,
        required: true
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      comment: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    location: {
      lat: Number,
      lng: Number,
      lastUpdated: Date
    }
  },

  serviceDetails: {
    startTime: Date,
    endTime: Date,
    duration: Number,
    startOtp: {
      type: String,
      default: () => Math.floor(1000 + Math.random() * 9000).toString()
    },
    endOtp: {
      type: String,
      default: () => Math.floor(1000 + Math.random() * 9000).toString()
    },
    isStartOtpVerified: { type: Boolean, default: false },
    isEndOtpVerified: { type: Boolean, default: false }
  },
  feedback: {
    type: String,
    ref: 'Feedback'
  }
}, {
  timestamps: true
});

bookingSchema.index({ hubId: 1, bookingStatus: 1, scheduledDateTime: 1 });
bookingSchema.index({ partnerStatus: 1, createdAt: 1 });
bookingSchema.index({ 'user.id': 1, bookingStatus: 1 });
bookingSchema.index({ 'partner.id': 1, bookingStatus: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);