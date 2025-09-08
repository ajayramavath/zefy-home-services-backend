import { mongoose, Schema } from "@zf/common";

const recurringPatternSchema = new Schema({
  userId: { type: String, required: true },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  schedule: {
    time: { type: String, required: true },
    daysOfWeek: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    datesOfMonth: [{
      type: Number,
      min: 1,
      max: 30
    }],
  },

  serviceIds: [{ type: Schema.Types.ObjectId, ref: 'Service', required: true }],

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
  },

  hubId: { type: String, required: true },

  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled'],
    default: 'active'
  },

  nextScheduleDate: { type: Date },
  createdBookings: { type: Number, default: 0 }
}, { timestamps: true });

export const RecurringPattern = mongoose.model('RecurringPattern', recurringPatternSchema);