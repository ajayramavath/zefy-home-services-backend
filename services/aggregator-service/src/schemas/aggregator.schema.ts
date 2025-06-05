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
    '- **airport**: requires `subType` = `"pickup"` or `"dropOff"`, plus `isAirport` in one leg.  \n' +
    "- **urban**: treated like a local (one‐way) trip.  \n" +
    "- **rental**: one‐leg, same source/destination (day rental code).",
  tags: ["Aggregators"],
  body: {
    type: "object",
    required: ["tripType", "vehicleType", "routes"],
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
          'Only for `tripType="outstation" && subType="roundTrip"`, format `YYYY-MM-DD HH:MM:SS`',
      },
      vehicleType: {
        type: "string",
        enum: ["hatchback", "sedan", "suv", "all"],
        description: "`hatchback` | `sedan` | `suv` | `all`",
      },
      routes: {
        type: "array",
        minItems: 1,
        items: routeSchema,
        description:
          "One or more legs.  \n" +
          '- **outstation / roundTrip**: exactly 2 legs if `subType="roundTrip"`, otherwise 1.  \n' +
          "- **airport**: 1 leg with `isAirport` on source (for pickup) or destination (for dropOff).  \n" +
          "- **urban**: 1 leg.  \n" +
          "- **rental**: 1 leg where source and destination are identical.",
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
