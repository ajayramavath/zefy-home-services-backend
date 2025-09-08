import { mongoose, Schema } from '@zf/common';
import { IFeedback } from '@zf/types';

const feedbackSchema = new Schema<IFeedback>({
  user: {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    profilePhoto: String
  },
  partnerId: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: String,
},
  {
    timestamps: true
  }
);

export const Feedback = mongoose.model('Feedback', feedbackSchema);