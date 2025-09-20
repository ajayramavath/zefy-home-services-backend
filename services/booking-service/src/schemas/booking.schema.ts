import { Type, Static } from '@sinclair/typebox';

// Create Booking Request Schema
export const CreateBookingSchema = Type.Object({
  schedule: Type.Object({
    type: Type.Union([Type.Literal('instant'), Type.Literal('scheduled')]),
    date: Type.String({
      format: 'date',
      description: 'Date in YYYY-MM-DD format'
    }),
    time: Type.String({
      pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
      description: 'Time in HH:MM format (24-hour)'
    })
  }),

  serviceIds: Type.Array(
    Type.String({
      minLength: 1,
      description: 'MongoDB ObjectId of the service'
    }),
    {
      minItems: 1,
      maxItems: 10,
      description: 'Array of service IDs to book'
    }
  ),

  user: Type.Object({
    id: Type.String({
      minLength: 1,
      description: 'User ID from authentication'
    }),
    name: Type.String({
      minLength: 2,
      maxLength: 100,
      description: 'User full name'
    }),
    phoneNumber: Type.String({
      pattern: '^[+]?[1-9]\\d{1,14}$',
      description: 'Valid phone number with country code'
    }),
    address: Type.Object({
      id: Type.String({
        minLength: 1,
        description: 'Address ID from user addresses'
      }),
      addressString: Type.String({
        minLength: 10,
        maxLength: 500,
        description: 'Complete address string'
      }),
      coordinates: Type.Object({
        lat: Type.Number({
          minimum: -90,
          maximum: 90,
          description: 'Latitude coordinate'
        }),
        lng: Type.Number({
          minimum: -180,
          maximum: 180,
          description: 'Longitude coordinate'
        })
      }),
      details: Type.Object({
        bedrooms: Type.Number({
          minimum: 0,
          maximum: 20,
          description: 'Number of bedrooms'
        }),
        bathrooms: Type.Number({
          minimum: 0,
          maximum: 20,
          description: 'Number of bathrooms'
        }),
        balconies: Type.Number({
          minimum: 0,
          maximum: 10,
          description: 'Number of balconies'
        })
      })
    })
  }),

  hubId: Type.String({
    minLength: 1,
    description: 'Hub ID where service will be provided'
  }),

  amount: Type.Object({
    baseAmount: Type.Number({
      minimum: 0,
      description: 'Base service amount'
    }),
    totalAmount: Type.Number({
      minimum: 0,
      description: 'Total amount to be paid'
    })
  }),

  razorpayOrderId: Type.String({
    minLength: 1,
  }),
  razorpayPaymentId: Type.String({
    minLength: 1,
  }),
  specialInstructions: Type.Optional(Type.String({
    maxLength: 500,
    description: 'Special instructions for the service'
  }))
}, {
  additionalProperties: false,
  description: 'Schema for creating a new booking'
});

// Update Booking Status Schema
export const UpdateBookingStatusSchema = Type.Object({
  bookingStatus: Type.Optional(Type.Union([
    Type.Literal('created'),
    Type.Literal('readyForAssignment'),
    Type.Literal('tracking'),
    Type.Literal('ongoing'),
    Type.Literal('completed'),
    Type.Literal('cancelled')
  ])),

  partnerStatus: Type.Optional(Type.Union([
    Type.Literal('not_assigned'),
    Type.Literal('assigned'),
    Type.Literal('enroute'),
    Type.Literal('arrived')
  ])),

  paymentStatus: Type.Optional(Type.Union([
    Type.Literal('pending'),
    Type.Literal('baseAmountPaid'),
    Type.Literal('fullAmountPaid'),
    Type.Literal('refunded')
  ]))
}, {
  additionalProperties: false,
  minProperties: 1
});

// Assign Partner Schema
export const AssignPartnerSchema = Type.Object({
  partnerId: Type.String({
    minLength: 1,
    description: 'Partner ID to assign to the booking'
  }),

  partnerDetails: Type.Object({
    name: Type.String({
      minLength: 2,
      maxLength: 100
    }),
    photoUrl: Type.String({
      format: 'uri',
      description: 'Partner profile photo URL'
    }),
    ratings: Type.Number({
      minimum: 0,
      maximum: 5
    }),
    reviewCount: Type.Number({
      minimum: 0
    }),
    phoneNumber: Type.String({
      pattern: '^[+]?[1-9]\\d{1,14}$'
    })
  })
}, {
  additionalProperties: false
});

// Verify OTP Schema
export const VerifyOTPSchema = Type.Object({
  otp: Type.String({
    pattern: '^[0-9]{4}$',
    description: '4-digit OTP'
  }),

  type: Type.Union([
    Type.Literal('start'),
    Type.Literal('end')
  ]),

  location: Type.Optional(Type.Object({
    lat: Type.Number({ minimum: -90, maximum: 90 }),
    lng: Type.Number({ minimum: -180, maximum: 180 })
  }))
}, {
  additionalProperties: false
});

// Update Partner Location Schema
export const UpdatePartnerLocationSchema = Type.Object({
  location: Type.Object({
    lat: Type.Number({
      minimum: -90,
      maximum: 90
    }),
    lng: Type.Number({
      minimum: -180,
      maximum: 180
    })
  })
}, {
  additionalProperties: false
});

// Submit Review Schema
export const SubmitFeedbackSchema = Type.Object({
  rating: Type.Number({
    minimum: 1,
    maximum: 5,
    description: 'Rating from 1 to 5 stars'
  }),
  comment: Type.Optional(Type.String({
    maxLength: 1000,
    description: 'Review comment'
  })),
  user: Type.Object({
    id: Type.String({
      minLength: 1,
    }),
    name: Type.String({
      minLength: 2,
    }),
    profilePhoto: Type.Optional(Type.String({
      format: 'uri',
    })),
  }),
  partnerId: Type.String({
    minLength: 1,
  }),
});

// TypeScript types from schemas
export type CreateBookingRequest = Static<typeof CreateBookingSchema>;
export type UpdateBookingStatusRequest = Static<typeof UpdateBookingStatusSchema>;
export type AssignPartnerRequest = Static<typeof AssignPartnerSchema>;
export type VerifyOTPRequest = Static<typeof VerifyOTPSchema>;
export type UpdatePartnerLocationRequest = Static<typeof UpdatePartnerLocationSchema>;
export type SubmitFeedbackRequest = Static<typeof SubmitFeedbackSchema>;

// Query parameters schema for GET requests
export const GetBookingsQuerySchema = Type.Object({
  status: Type.Optional(Type.Union([
    Type.Literal('created'),
    Type.Literal('readyForAssignment'),
    Type.Literal('tracking'),
    Type.Literal('ongoing'),
    Type.Literal('completed'),
    Type.Literal('cancelled')
  ])),

  userId: Type.Optional(Type.String()),
  partnerId: Type.Optional(Type.String()),
  hubId: Type.Optional(Type.String()),

  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),

  startDate: Type.Optional(Type.String({ format: 'date' })),
  endDate: Type.Optional(Type.String({ format: 'date' }))
}, {
  additionalProperties: false
});

export type GetBookingsQuery = Static<typeof GetBookingsQuerySchema>;