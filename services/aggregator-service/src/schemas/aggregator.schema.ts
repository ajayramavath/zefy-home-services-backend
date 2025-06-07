// services/aggregator-service/src/schemas/aggregator.schema.ts
import { FastifySchema } from "fastify";

/**
 * Link an external aggregator account to a user
 */
export const linkAccountSchema: FastifySchema = {
  description: "Link an external aggregator (e.g., Uber, Ola, Gozo) to the authenticated user",
  tags: ["Aggregators"],
  body: {
    type: "object",
    required: ["userId", "aggregator"],
    properties: {
      userId: {
        type: "string",
        description: "MongoDB ObjectId of the user",
        example: "64f9eae7c1d3d6c97a14c123"
      },
      aggregator: {
        type: "string",
        description: "Key of the aggregator to link",
        example: "gozo"
      }
    }
  },
  response: {
    200: {
      description: "Successfully linked aggregator",
      type: "object",
      properties: {
        success: { type: "boolean", example: true }
      },
      required: ["success"]
    },
    400: {
      description: "Invalid input (bad userId or unknown aggregator)",
      type: "object",
      properties: {
        error: { type: "string", example: "Invalid userId" }
      },
      required: ["error"]
    },
    409: {
      description: "Aggregator already linked for this user",
      type: "object",
      properties: {
        error: { type: "string", example: "This aggregator is already linked for this user" }
      },
      required: ["error"]
    },
    500: {
      description: "Server error when linking aggregator",
      type: "object",
      properties: {
        error: { type: "string", example: "Failed to link aggregator account" }
      },
      required: ["error"]
    }
  }
};

const coordinatesProps = {
  type: "object",
  properties: {
    latitude: { type: "number", example: 28.6139 },
    longitude: { type: "number", example: 77.2090 }
  },
  required: ["latitude", "longitude"]
};

const locationSchema = {
  type: "object",
  properties: {
    address: { type: "string", example: "Delhi Airport" },
    name: { type: "string", nullable: true, example: null },
    coordinates: coordinatesProps,
    isAirport: { type: ["integer", "null"], example: 1 }
  },
  required: ["address", "coordinates"]
};

const routeSchema = {
  type: "object",
  properties: {
    startDate: { type: "string", format: "date", example: "2025-06-07" },
    startTime: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$", example: "18:30:00" },
    source: locationSchema,
    destination: locationSchema
  },
  required: ["startDate", "startTime", "source", "destination"]
};

/**
 * Fetch fare quotes from linked aggregators
 */
export const getFaresSchema: FastifySchema = {
  description: "Request fare quotes for outstation, airport, urban, or rental trips",
  tags: ["Aggregators"],
  body: {
    type: "object",
    required: [
      "tripType", "fromAddress", "fromLat", "fromLng",
      "toAddress", "toLat", "toLng", "startDate", "startTime", "vehicleType"
    ],
    properties: {
      tripType: {
        type: "string", enum: ["outstation", "airport", "urban", "rental"],
        description: "Type of trip",
        example: "outstation"
      },
      subType: {
        type: "string", nullable: true,
        description: "For outstation: 'oneWay' or 'roundTrip'; for airport: 'pickup' or 'dropOff'",
        example: "oneWay"
      },
      returnDate: {
        type: "string", nullable: true, format: "date-time",
        description: "Return date/time for outstation roundTrip",
        example: "2025-06-08 10:00:00"
      },
      fromAddress: { type: "string", example: "Shahdara, Delhi" },
      fromLat: { type: "number", example: 28.6893 },
      fromLng: { type: "number", example: 77.2919 },
      toAddress: { type: "string", example: "Agra, UP" },
      toLat: { type: "number", example: 27.1767 },
      toLng: { type: "number", example: 78.0081 },
      startDate: { type: "string", format: "date", example: "2025-06-07" },
      startTime: { type: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$", example: "18:30:00" },
      vehicleType: { type: "string", enum: ["hatchback", "sedan", "suv", "all"], example: "sedan" },
      passengers: { type: "integer", minimum: 1, nullable: true, example: 2 }
    }
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
            required: ["aggregator", "price", "currency", "estimatedTimeMinutes", "vehicleType"],
            properties: {
              aggregator: { type: "string", example: "gozo" },
              price: { type: "number", example: 4808 },
              currency: { type: "string", example: "INR" },
              estimatedTimeMinutes: { type: "integer", example: 360 },
              vehicleType: { type: "string", example: "Sedan (Value)" },
              vehicleCode: { type: "number", example: 3 },
              raw: { type: "object", nullable: true }
            }
          }
        }
      },
      required: ["fares"]
    },
    400: {
      description: "Invalid request payload",
      type: "object",
      properties: {
        error: { type: "string", example: "Missing required field: fromAddress" }
      },
      required: ["error"]
    },
    500: {
      description: "Server error fetching fares",
      type: "object",
      properties: {
        error: { type: "string", example: "Error fetching fares from aggregators" }
      },
      required: ["error"]
    }
  }
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
      "tripType", "fromAddress", "fromLat", "fromLng",
      "toAddress", "toLat", "toLng", "startDate", "startTime",
      "vehicleType", "vehicleCode", "aggregator", "price",
      "currency", "estimatedTimeMinutes", "userId"
    ],
    properties: {
      tripType: { type: "string", example: "outstation" },
      subType: { type: "string", nullable: true, example: "oneWay" },
      returnDate: { type: "string", nullable: true, example: "2025-06-08 10:00:00" },
      fromAddress: { type: "string", example: "Shahdara, Delhi" },
      fromLat: { type: "number", example: 28.6893 },
      fromLng: { type: "number", example: 77.2919 },
      toAddress: { type: "string", example: "Agra, UP" },
      toLat: { type: "number", example: 27.1767 },
      toLng: { type: "number", example: 78.0081 },
      startDate: { type: "string", format: "date", example: "2025-06-07" },
      startTime: { type: "string", example: "18:30:00" },
      vehicleType: { type: "string", enum: ["hatchback", "sedan", "suv", "all"], example: "sedan" },
      vehicleCode: { type: "number", example: 3 },
      passengers: { type: "integer", example: 2 },
      aggregator: { type: "string", example: "gozo" },
      price: { type: "number", example: 4808 },
      currency: { type: "string", example: "INR" },
      estimatedTimeMinutes: { type: "integer", example: 360 },
      userId: { type: "string", example: "64f9eae7c1d3d6c97a14c123" }
    }
  },
  response: {
    200: {
      description: "Booking confirmed successfully",
      type: "object",
      properties: {
        bookingId: { type: "string", example: "OW101881515" },
        referenceId: { type: "string", example: "ZFY-123e4567-e89b-12d3-a456-426614174000" },
        statusDesc: { type: "string", example: "Confirmed" },
        statusCode: { type: "integer", example: 2 }
      }
    },
    400: {
      description: "Hold or confirm error",
      type: "object",
      properties: {
        errorCode: { type: "integer", example: 104 },
        errors: { type: "array", items: { type: "string" }, example: ["Departure time should be at least 120 minutes from now."] }
      }
    },
    500: {
      description: "Internal server error during booking",
      type: "object",
      properties: {
        error: { type: "string", example: "INTERNAL_SERVER_ERROR" },
        details: { type: "string", example: "Failed to fetch user info" }
      }
    }
  }
};
