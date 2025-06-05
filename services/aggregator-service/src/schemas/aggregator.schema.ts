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
        pattern:
          "^[0-9]{4}-[0-9]{2}-[0-9]{2}\\s[0-1][0-9]:[0-5][0-9]:[0-5][0-9]$",
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
        pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$",
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
