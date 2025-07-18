import { FastifySchema } from "fastify";

export const createBookingSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['userId', 'partnerId', 'hubId', 'service', 'schedule', 'address', 'payment', 'pricing', 'otp', 'timeline', 'status'],
    properties: {
      userId: { type: 'string' },
      partnerId: { type: 'string' },
      hubId: { type: 'string' },
      service: {
        type: 'object',
        required: ['serviceId', 'tasks', 'serviceType'],
        properties: {
          serviceId: { type: 'string' },
          serviceType: { type: 'string', enum: ['one-time', 'daily', 'weekly'] },
          tasks: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
          },
          addOns: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      schedule: {
        type: 'object',
        required: ['bookingType', 'scheduledDate', 'scheduledTime', 'duration'],
        properties: {
          bookingType: { type: 'string', enum: ['instant', 'scheduled'] },
          scheduledDate: { type: 'string', format: 'date' },
          scheduledTime: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
          duration: { type: 'number', minimum: 45 },
          recurringDays: {
            type: 'array',
            items: { type: 'number', minimum: 0, maximum: 6 },
          },
        },
      },
      address: {
        type: 'object',
        required: ['street', 'city', 'state', 'pincode', 'coordinates', 'propertyDetails'],
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          pincode: { type: 'string', pattern: '^[0-9]{6}$' },
          coordinates: {
            type: 'object',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            },
          },
          propertyDetails: {
            type: 'object',
            required: ['bedrooms', 'bathrooms', 'balconies', 'kitchens', 'livingRooms'],
            properties: {
              bedrooms: { type: 'number', minimum: 0 },
              bathrooms: { type: 'number', minimum: 0 },
              balconies: { type: 'number', minimum: 0 },
              kitchens: { type: 'number', minimum: 0 },
              livingRooms: { type: 'number', minimum: 0 },
            }
          }
        },
      },
      pricing: {
        type: 'object',
        required: ['basePrice', 'ratePerMinute', 'estimatedTotal', 'taxes'],
        properties: {
          basePrice: { type: 'number', minimum: 0 },
          ratePerMinute: { type: 'number', minimum: 0 },
          estimatedTotal: { type: 'number', minimum: 0 },
          finalTotal: { type: 'number', minimum: 0 },
          discount: { type: 'number', minimum: 0 },
          taxes: { type: 'number', minimum: 0 },
        }
      },
      payment: {
        type: 'object',
        required: ['method', 'status'],
        properties: {
          method: { type: 'string', enum: ['prepaid', 'cod'] },
          status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
          transactionId: { type: 'string' },
          paidAt: { type: 'string', format: 'date-time' },
        }
      },
      otp: {
        type: 'object',
        required: [],
        properties: {
          startOtp: { type: 'string' },
          endOtp: { type: 'string' },
          startOtpGeneratedAt: { type: 'string', format: 'date-time' },
          endOtpGeneratedAt: { type: 'string', format: 'date-time' },
        }
      },
      timeline: {
        type: 'object',
        required: ['bookedAt'],
        properties: {
          bookedAt: { type: 'string', format: 'date-time' },
          confirmedAt: { type: 'string', format: 'date-time' },
          partnerAssignedAt: { type: 'string', format: 'date-time' },
          partnerArrivedAt: { type: 'string', format: 'date-time' },
          startedAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' },
          cancelledAt: { type: 'string', format: 'date-time' },
        }
      },
      status: {
        type: 'string',
        enum: [
          'pending_payment'
          , 'confirmed'
          , 'partner_assigned'
          , 'partner_enroute'
          , 'partner_arrived'
          , 'in_progress'
          , 'completed'
          , 'cancelled'
          , 'failed'
        ]
      },
      cancellation: {
        type: 'object',
        required: ['reason', 'cancelledBy', 'refundAmount'],
        properties: {
          reason: { type: 'string' },
          cancelledBy: { type: 'string', enum: ['user', 'partner', 'system'] },
          refundAmount: { type: 'number', minimum: 0 },
        }
      },
      rating: {
        type: 'object',
        required: ['score', 'ratedAt'],
        properties: {
          score: { type: 'number', minimum: 1, maximum: 5 },
          review: { type: 'string', maxLength: 500 },
          ratedAt: { type: 'string', format: 'date-time' },
        }
      }
    },
  },
}
