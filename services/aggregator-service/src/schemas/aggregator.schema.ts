// services/aggregator-service/src/schemas/aggregator.schema.ts
import { FastifySchema } from "fastify";

/**
 * LinkAccountBody: { userId: string, aggregator: string }
 * Response: { success: boolean } or errors
 */
export const linkAccountSchema: FastifySchema = {
  description: "Link an external aggregator account to the given user",
  tags: ["Aggregators"],
  body: {
    type: "object",
    required: ["userId", "aggregator"],
    properties: {
      userId: {
        type: "string",
        description: "Mongo ObjectId of the user",
      },
      aggregator: {
        type: "string",
        description: 'Key of the aggregator (e.g. "uber", "ola", "gozo")',
      },
    },
  },
  response: {
    200: {
      description: "Account linked successfully",
      type: "object",
      properties: {
        success: { type: "boolean" },
      },
      required: ["success"],
    },
    400: {
      description: "Bad request (invalid userId or unknown aggregator)",
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
    409: {
      description: "Conflict (aggregator already linked for this user)",
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
    500: {
      description: "Internal server error",
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
    isAirport: {
      type: ["integer", "null"],
      description: "Set to 1 if this location is the airport pickup/dropoff",
    },
  },
  required: ["address", "coordinates"],
};

const routeSchema = {
  type: "object",
  properties: {
    startDate: {
      type: "string",
      format: "date",
    },
    startTime: {
      type: "string",
      pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
    },
    source: locationSchema,
    destination: locationSchema,
  },
  required: ["startDate", "startTime", "source", "destination"],
};

export const getFaresSchema: FastifySchema = {
  description:
    "Fetch fare quotes (outstation, airport, urban, or rental).  \n" +
    '- **outstation**: requires `subType` = `"oneWay"` or `"roundTrip"`, and if `"roundTrip"`, a `returnDate`.  \n' +
    '- **airport**: requires `subType` = `"pickup"` or `"dropOff"`.  \n' +
    "- **urban**: treated like a local (one‐way) trip.  \n" +
    "- **rental**: one‐leg, same source/destination (day rental code).",
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
        enum: ["outstation", "airport", "urban", "rental"],
        description: "`outstation` | `airport` | `urban` | `rental`",
      },
      subType: {
        type: "string",
        nullable: true,
        description:
          '`"oneWay"` or `"roundTrip"` when `tripType="outstation"`,  \n' +
          '`"pickup"` or `"dropOff"` when `tripType="airport"`',
      },
      returnDate: {
        type: "string",
        nullable: true,
        description:
          'Only if `tripType="outstation" && subType="roundTrip"`, format `YYYY-MM-DD HH:MM:SS`',
      },

      fromAddress: {
        type: "string",
        description: "Pickup address",
      },
      fromLat: {
        type: "number",
        description: "Pickup latitude",
      },
      fromLng: {
        type: "number",
        description: "Pickup longitude",
      },

      toAddress: {
        type: "string",
        description: "Dropoff address",
      },
      toLat: {
        type: "number",
        description: "Dropoff latitude",
      },
      toLng: {
        type: "number",
        description: "Dropoff longitude",
      },

      startDate: {
        type: "string",
        format: "date",
        description: "Trip start date (`YYYY-MM-DD`)",
      },
      startTime: {
        type: "string",
        description: "Trip start time (`HH:MM:SS`)",
      },

      vehicleType: {
        type: "string",
        enum: ["hatchback", "sedan", "suv", "all"],
        description: "`hatchback` | `sedan` | `suv` | `all`",
      },

      passengers: {
        type: "integer",
        minimum: 1,
        description: "Number of passengers (optional)",
      },
    },
  },

  response: {
    200: {
      description: "Array of normalized fare quotes.",
      type: "object",
      properties: {
        fares: {
          type: "array",
          items: {
            type: "object",
            properties: {
              aggregator: { type: "string" },
              price: { type: "number" },
              currency: { type: "string" },
              estimatedTimeMinutes: { type: "integer" },
              vehicleType: { type: "string" },
              raw: { type: "object", nullable: true },
            },
            required: [
              "aggregator",
              "price",
              "currency",
              "estimatedTimeMinutes",
              "vehicleType",
            ],
          },
        },
      },
      required: ["fares"],
    },
    400: {
      description: "Invalid payload (missing or invalid fields).",
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
    500: {
      description: "Server error while fetching fares.",
      type: "object",
      properties: {
        error: { type: "string" },
      },
      required: ["error"],
    },
  },
};

export const createBookingSchema: FastifySchema = {
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
      "aggregator",
      "price",
      "currency",
      "estimatedTimeMinutes",
      "userId",
    ],
    properties: {
      tripType: {
        type: "string",
        description:
          "Trip type (e.g., outstation, airport, urban, dayRental4, dayRental8, dayRental12)",
      },
      subType: {
        type: "string",
        description:
          "Only required if tripType is 'outstation' (oneWay/roundTrip) or 'airport' (pickup/dropOff)",
      },
      returnDate: {
        type: "string",
        format: "date-time",
        description:
          "Only required when tripType is 'outstation' and subType is 'roundTrip'. Format: YYYY-MM-DD HH:MM:SS",
      },
      fromAddress: { type: "string" },
      fromLat: { type: "number" },
      fromLng: { type: "number" },
      toAddress: { type: "string" },
      toLat: { type: "number" },
      toLng: { type: "number" },
      startDate: {
        type: "string",
        format: "date",
        description: "Format: YYYY-MM-DD",
      },
      startTime: {
        type: "string",
        pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
        description: "Format: HH:MM:SS",
      },
      vehicleType: {
        type: "string",
        enum: ["hatchback", "sedan", "suv", "all"],
      },
      passengers: {
        type: "integer",
        minimum: 1,
        description: "Number of passengers",
      },
      aggregator: {
        type: "string",
        description: "Name of the aggregator (e.g., 'gozo')",
      },
      price: {
        type: "number",
        description: "Quoted total fare (advanceReceived will be set to 0)",
      },
      currency: {
        type: "string",
        description: "Currency code (e.g., 'INR')",
      },
      estimatedTimeMinutes: {
        type: "integer",
        description: "Estimated trip duration in minutes",
      },
      userId: {
        type: "string",
        description: "User’s ID in the user‐service",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        bookingId: {
          type: "string",
          description: "Gozo’s confirmed booking ID",
        },
        referenceId: {
          type: "string",
          description: "Reference ID passed to Gozo",
        },
        statusDesc: {
          type: "string",
          description: "Status description (e.g., 'Confirmed')",
        },
        statusCode: {
          type: "integer",
          description: "Numeric status code (e.g., 2)",
        },
      },
    },
    400: {
      type: "object",
      properties: {
        errorCode: {
          type: "integer",
          description: "Gozo’s error code (from hold or confirm)",
        },
        errors: {
          type: "array",
          items: { type: "string" },
          description: "List of error messages",
        },
      },
    },
    500: {
      type: "object",
      properties: {
        error: { type: "string" },
        details: { type: "string" },
      },
    },
  },
};
