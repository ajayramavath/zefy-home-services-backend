// services/aggregator-service/src/schemas/aggregator.schema.ts
import { FastifySchema } from "fastify";

/**
 * Link an external aggregator account to a user
 */
export const linkAccountSchema: FastifySchema = {
  description:
    "Link an external aggregator (e.g., Uber, Ola, Gozo) to the authenticated user",
  tags: ["Aggregators"],
  body: {
    type: "object",
    required: ["userId", "aggregator"],
    properties: {
      userId: {
        type: "string",
        description: "MongoDB ObjectId of the user",
      },
      aggregator: {
        type: "string",
        description: "Key of the aggregator to link",
      },
    },
  },
  response: {
    200: {
      description: "Successfully linked aggregator",
      type: "object",
      properties: {
        success: { type: "boolean" },
      },
      required: ["success"],
    },
    400: {
      description: "Invalid input (bad userId or unknown aggregator)",
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
    409: {
      description: "Aggregator already linked for this user",
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
    500: {
      description: "Server error when linking aggregator",
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
  },
};

const coordinatesProps = {
  type: "object",
  properties: {
    latitude: { type: "number" },
    longitude: { type: "number" },
  },
  required: ["latitude", "longitude"],
};

const locationSchema = {
  type: "object",
  properties: {
    address: { type: "string" },
    name: { type: "string", nullable: true },
    coordinates: coordinatesProps,
    isAirport: { type: ["integer", "null"] },
  },
  required: ["address", "coordinates"],
};

const routeSchema = {
  type: "object",
  properties: {
    startDate: { type: "string", format: "date" },
    startTime: {
      type: "string",
      pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
    },
    source: locationSchema,
    destination: locationSchema,
  },
  required: ["startDate", "startTime", "source", "destination"],
};

/**
 * Fetch fare quotes from linked aggregators
 */
export const getFaresSchema: FastifySchema = {
  description:
    "Request fare quotes for outstation, airport, urban, or rental trips",
  tags: ["Aggregators"],
  body: {
    type: "object",
    required: [
      "tripType",
      "fromAddress",
      "fromLat",
      "fromLng",
      "toAddress",
      "toLat",
      "toLng",
      "startDate",
      "startTime",
      "vehicleType",
    ],
    properties: {
      tripType: {
        type: "string",
        enum: [
          "outstation",
          "airport",
          "urban",
          "dayRental4",
          "dayRental8",
          "dayRental12",
        ],
        description: "Type of trip",
      },
      subType: {
        type: "string",
        nullable: true,
        description:
          "For outstation: 'oneWay' or 'roundTrip'; for airport: 'pickup' or 'dropOff'",
      },
      returnDate: {
        type: "string",
        nullable: true,
        format: "date-time",
        description: "Return date/time for outstation roundTrip",
      },
      fromAddress: { type: "string" },
      fromLat: { type: "number" },
      fromLng: { type: "number" },
      toAddress: { type: "string" },
      toLat: { type: "number" },
      toLng: { type: "number" },
      startDate: { type: "string", format: "date" },
      startTime: {
        type: "string",
        pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
      },
      vehicleType: {
        type: "string",
        enum: ["hatchback", "sedan", "suv", "all"],
      },
      passengers: { type: "integer", minimum: 1, nullable: true },
    },
  },
  response: {
    200: {
      description: "Array of fare responses",
      type: "object",
      properties: {
        fares: {
          type: "array",
          items: {
            type: "object",
            required: [
              "aggregator",
              "price",
              "currency",
              "estimatedTimeMinutes",
              "vehicleType",
            ],
            properties: {
              aggregator: { type: "string" },
              price: { type: "number" },
              currency: { type: "string" },
              estimatedTimeMinutes: { type: "integer" },
              vehicleType: { type: "string" },
              vehicleCode: { type: "number" },
              rawVehicleType: { type: "string" },
              raw: { type: "object", nullable: true },
            },
          },
        },
      },
      required: ["fares"],
    },
    400: {
      description: "Invalid request payload",
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
    500: {
      description: "Server error fetching fares",
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
  },
};

/**
 * Create and confirm a booking via aggregator
 */
export const createBookingSchema: FastifySchema = {
  description: "Hold and then confirm a booking with a specified aggregator",
  tags: ["Aggregators"],
  body: {
    type: "object",
    required: [
      "tripType",
      "fromAddress",
      "fromLat",
      "fromLng",
      "toAddress",
      "toLat",
      "toLng",
      "startDate",
      "startTime",
      "vehicleType",
      "vehicleCode",
      "aggregator",
      "price",
      "currency",
      "estimatedTimeMinutes",
      "userId",
    ],
    properties: {
      tripType: { type: "string" },
      subType: { type: "string", nullable: true },
      returnDate: { type: "string", nullable: true },
      fromAddress: { type: "string" },
      fromLat: { type: "number" },
      fromLng: { type: "number" },
      toAddress: { type: "string" },
      toLat: { type: "number" },
      toLng: { type: "number" },
      startDate: { type: "string", format: "date" },
      startTime: { type: "string" },
      vehicleType: {
        type: "string",
        enum: ["hatchback", "sedan", "suv", "all"],
      },
      vehicleCode: { type: "number" },
      passengers: { type: "integer" },
      aggregator: { type: "string" },
      price: { type: "number" },
      currency: { type: "string" },
      estimatedTimeMinutes: { type: "integer" },
      userId: { type: "string" },
    },
  },
  response: {
    200: {
      description: "Booking confirmed successfully",
      type: "object",
      properties: {
        bookingId: { type: "string" },
        referenceId: { type: "string" },
        statusDesc: { type: "string" },
        statusCode: { type: "integer" },
      },
    },
    400: {
      description: "Hold or confirm error",
      type: "object",
      properties: {
        errorCode: { type: "integer" },
        errors: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
    500: {
      description: "Internal server error during booking",
      type: "object",
      properties: {
        error: { type: "string" },
        details: { type: "string" },
      },
    },
  },
};

export const getBookingDetailsSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["universalBookingId"],
    properties: {
      universalBookingId: {
        type: "string",
        description: "The universal booking ID generated by the aggregator",
      },
    },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: true,
      properties: {
        userId: { type: "string", description: "User ID from session" },
        universalBookingId: {
          type: "string",
          description: "Universal booking ID",
        },
        tripType: {
          type: "string",
          description: "Original tripType from booking request",
        },
        subType: {
          type: ["string", "null"],
          description: "Original subType if applicable",
        },
      },
    },
    400: {
      type: "object",
      properties: {
        errorCode: { type: "integer", description: "Error code from Gozo" },
        errors: {
          type: "array",
          items: { type: "string" },
          description: "List of error messages",
        },
      },
    },
    404: {
      type: "object",
      properties: {
        error: {
          type: "string",
          description: "Error message, e.g. 'Booking not found'",
        },
      },
    },
    500: {
      type: "object",
      properties: {
        error: {
          type: "string",
          description: "Error type, e.g. 'INTERNAL_SERVER_ERROR' or 'DB_ERROR'",
        },
        details: { type: "string", description: "Detailed error message" },
      },
    },
  },
};

export const getCancellationListSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["aggregator"],
    properties: {
      aggregator: {
        type: "string",
        description: "Name of the aggregator (e.g. 'gozo')",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        cancellationList: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "text", "placeholder"],
            properties: {
              id: {
                type: "integer",
                description: "Cancellation reason ID",
              },
              text: {
                type: "string",
                description: "Reason text",
              },
              placeholder: {
                type: "string",
                description: "Placeholder for additional details",
              },
            },
          },
        },
      },
      required: ["cancellationList"],
    },
    500: {
      type: "object",
      properties: {
        error: {
          type: "string",
          description: "Error type/message",
        },
        details: {
          type: "string",
          description: "Detailed error info (optional)",
        },
      },
      required: ["error"],
    },
  },
};

export const cancelBookingSchema: FastifySchema = {
  body: {
    type: "object",
    required: ["aggregator", "bookingId", "reasonId", "reason"],
    properties: {
      aggregator: {
        type: "string",
        description: "Name of the aggregator (e.g. 'gozo')",
      },
      bookingId: {
        type: "string",
        description: "The adapter’s booking ID to cancel",
      },
      reasonId: {
        type: "integer",
        description: "Selected cancellation reason ID",
      },
      reason: {
        type: "string",
        description: "User‐provided cancellation text",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        bookingId: {
          type: "string",
          description: "Cancelled booking ID",
        },
        message: {
          type: "string",
          description: "Success message",
        },
        cancellationCharge: {
          type: "number",
          description: "Amount charged for cancellation",
        },
        refundAmount: {
          type: "number",
          description: "Amount refunded to the user",
        },
      },
      required: ["bookingId", "message", "cancellationCharge", "refundAmount"],
    },
    400: {
      type: "object",
      properties: {
        errorCode: {
          type: "integer",
          description: "Error code from cancellation API",
        },
        errors: {
          type: "array",
          items: { type: "string" },
          description: "List of error messages",
        },
      },
      required: ["errorCode", "errors"],
    },
    500: {
      type: "object",
      properties: {
        error: {
          type: "string",
          description: "Error type/message",
        },
        details: {
          type: "string",
          description: "Detailed error info (optional)",
        },
      },
      required: ["error"],
    },
  },
};
