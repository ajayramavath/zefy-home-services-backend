import { FastifySchema } from "fastify";

export const createServiceSchema: FastifySchema = {
  body: {
    type: 'object',
    require: ["name", "description", "icon", "basePrice", "ratePerMinute", "estimatedDuration", "tasksIncluded", "tasksExcluded"],
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      icon: { type: 'string' },
      basePrice: { type: 'number' },
      ratePerMinute: { type: 'number' },
      estimatedDuration: { type: 'number' },
      tasksIncluded: { type: 'array', items: { type: 'string' } },
      tasksExcluded: { type: 'array', items: { type: 'string' } },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        message: { type: 'string' },
      }
    },
    400: {
      description: "Validation error",
      type: "object",
      properties: { error: { type: "string" } },
      required: ["error"],
    },
  }
}

export const updateServiceAvailabilitySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['serviceId', 'isAvailable'],
    properties: {
      serviceId: { type: 'string' },
      isAvailable: { type: 'boolean' },
    }
  }
}

export const getAllServicesSchema: FastifySchema = {
  querystring: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: { type: 'string' },
    }
  },
  response: {
    200: {},
    400: {
      description: "Validation error",
      type: "object",
      properties: { error: { type: "string" } },
      required: ["error"],
    },
    404: {
      description: "Hub not found",
      type: "object",
      required: ['success', 'message'],
      properties: {
        success: { type: 'boolean' },
        error: { type: "string" },
        message: { type: 'string' }
      }
    },
  }
}