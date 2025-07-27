import { FastifySchema } from "fastify";

const locationProps = {
  name: { type: "string" },
  lat: { type: "number" },
  lon: { type: "number" },
};

const favoriteLocationsSchema = {
  type: "object",
  properties: {
    home: {
      type: ["object", "null"],
      properties: locationProps,
      required: ["name", "lat", "lon"],
    },
    work: {
      type: ["object", "null"],
      properties: locationProps,
      required: ["name", "lat", "lon"],
    },
    other: {
      type: ["object", "null"],
      properties: locationProps,
      required: ["name", "lat", "lon"],
    },
  },
};

export const updateProfileSchema: FastifySchema = {
  description: "Update any subset of the user’s profile fields",
  tags: ["Users"],
  body: {
    type: "object",
    minProperties: 1,
    additionalProperties: false,
    properties: {
      firstName: { type: "string" },
      middleName: { type: "string" },
      lastName: { type: "string" },
      dateOfBirth: { type: "string", format: "date" },
      gender: { type: "string", enum: ["male", "female", "other"] as string[] },
    },
  },
  response: {
    200: {
      description: "Full updated profile with favorites",
      type: "object",
      properties: {
        firstName: { type: "string", nullable: true },
        middleName: { type: "string", nullable: true },
        lastName: { type: "string", nullable: true },
        dateOfBirth: { type: "string", format: "date", nullable: true },
        gender: {
          type: "string",
          enum: ["male", "female", "other"],
          nullable: true,
        },
        email: { type: "string", nullable: true },
        phoneNumber: { type: "string", nullable: true },
        favoriteLocations: favoriteLocationsSchema,
      },
      required: ["favoriteLocations"],
    },
    400: {
      description: "Validation error",
      type: "object",
      properties: { error: { type: "string" } },
      required: ["error"],
    },
    404: {
      description: "User not found",
      type: "object",
      properties: { error: { type: "string" } },
      required: ["error"],
    },
  },
};

export const getProfileSchema: FastifySchema = {
  description: "Retrieve the current user’s full profile with favorites",
  tags: ["Users"],
  response: {
    200: {
      description: "User profile payload",
      type: "object",
      properties: {
        firstName: { type: "string", nullable: true },
        middleName: { type: "string", nullable: true },
        lastName: { type: "string", nullable: true },
        dateOfBirth: { type: "string", format: "date", nullable: true },
        gender: {
          type: "string",
          enum: ["male", "female", "other"],
          nullable: true,
        },
        email: { type: "string", nullable: true },
        phoneNumber: { type: "string", nullable: true },
        favoriteLocations: favoriteLocationsSchema,
      },
    },
    404: {
      description: "User not found",
      type: "object",
      properties: { error: { type: "string" } },
      required: ["error"],
    },
  },
};
