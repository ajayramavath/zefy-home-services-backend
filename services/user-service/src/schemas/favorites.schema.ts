import { FastifySchema } from "fastify";
import { FavoriteType } from "../models/user.model";

// Reusable location schema
const locationSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    lat: { type: "number" },
    lon: { type: "number" },
  },
  required: ["name", "lat", "lon"],
};

export const getFavoritesSchema: FastifySchema = {
  description: "Get all favorite locations for the current user",
  tags: ["Favorites"],
  response: {
    200: {
      type: "object",
      properties: {
        home: { oneOf: [locationSchema, { type: "null" }] },
        work: { oneOf: [locationSchema, { type: "null" }] },
        other: { oneOf: [locationSchema, { type: "null" }] },
      },
      required: ["home", "work", "other"],
    },
  },
};

export const upsertFavoriteSchema: FastifySchema = {
  description: "Add or update one of the user’s favorite locations",
  tags: ["Favorites"],
  body: {
    type: "object",
    required: ["type", "name", "lat", "lon"],
    properties: {
      type: {
        type: "string",
        enum: ["home", "work", "other"] as FavoriteType[],
      },
      name: { type: "string" },
      lat: { type: "number" },
      lon: { type: "number" },
    },
  },
  response: {
    200: locationSchema,
    400: {
      type: "object",
      properties: { error: { type: "string" } },
      required: ["error"],
    },
  },
};

export const deleteFavoriteSchema: FastifySchema = {
  description: "Remove one of the user’s favorite locations",
  tags: ["Favorites"],
  params: {
    type: "object",
    required: ["type"],
    properties: {
      type: {
        type: "string",
        enum: ["home", "work", "other"] as FavoriteType[],
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: { success: { type: "boolean" } },
      required: ["success"],
    },
    400: {
      type: "object",
      properties: { error: { type: "string" } },
      required: ["error"],
    },
  },
};
