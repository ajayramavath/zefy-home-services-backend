import { Schema, mongoose } from '@zf/common';
import { IPartner } from '@zf/types';

const partnerSchema = new Schema<IPartner>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },

    personalInfo: {
      type: {
        fullName: {
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
        phoneNumber: String,
      },
      required: function () { return this.completionStep >= 1; }
    },


    serviceIDs: {
      type: [String],
      required: function () { return this.completionStep >= 2; },
      validate: {
        validator: function (v: string[]) {
          return this.completionStep < 2 || (v && v.length > 0);
        },
        message: 'At least one service must be selected'
      }
    },
    operationalHubId: {
      type: String,
      required: function () { return this.completionStep >= 2; }
    },


    availabilityId: {
      type: String,
      ref: 'Availability',
      required: function () { return this.completionStep >= 3; }
    },


    bankDetails: {
      type: {
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
        }
      },
      required: function () { return this.completionStep >= 4; }
    },


    verification: {
      type: {
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
          selfiePhoto: String,
          idFrontPhoto: String,
          idBackPhoto: String,
        },
        backgroundCheck: {
          status: {
            type: String,
            enum: ['pending', 'completed', 'failed'],
            default: 'pending',
          },
          completedAt: Date,
        }
      },
      required: function () { return this.completionStep >= 5; }
    },
    status: {
      type: String,
      enum: ['incomplete', 'pending_approval', 'approved', 'rejected'],
      default: 'incomplete',
    },
    completionStep: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    approvedAt: Date,
    training: {
      video: {
        type: Boolean,
        default: false,
      },
      quiz: {
        type: Boolean,
        default: false,
      }
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
    }
  },
  {
    timestamps: true,
  }
);

partnerSchema.methods.isStepComplete = function (step: number): boolean {
  return this.completionStep >= step;
};

partnerSchema.methods.canProceedToStep = function (step: number): boolean {
  return this.completionStep >= (step - 1);
};

partnerSchema.methods.markStepComplete = function (step: number) {
  if (step > this.completionStep) {
    this.completionStep = step;

    if (step === 5) {
      this.status = 'pending_approval';
    }
  }
};

partnerSchema.pre('save', function (next) {
  if (this.completionStep === 5 && this.status === 'incomplete') {
    this.status = 'pending_approval';
  }
  next();
});

export const Partner = mongoose.model<IPartner>('Partner', partnerSchema);