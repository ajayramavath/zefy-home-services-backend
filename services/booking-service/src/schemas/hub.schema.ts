import { FastifySchema } from "fastify";

export const createHubSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['name', 'address', 'serviceArea', 'operationalHours', 'services', 'partnerCount', 'managers', 'isActive'],
    properties: {
      name: { type: 'string' },
      address: {
        type: 'object',
        required: ['street', 'city', 'state', 'pincode', 'coordinates'],
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          pincode: { type: 'string', pattern: '^[0-9]{6}$' },
          coordinates: {
            type: 'object',
            required: ['lat', 'lng'],
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' },
            }
          }
        },
      },
      serviceArea: {
        type: 'object',
        required: ['type', 'coordinates'],
        properties: {
          type: { type: 'string', enum: ['Polygon', 'MultiPolygon'] },
          coordinates: {
            type: 'array',
            items: {
              type: 'array',
              items: {
                type: 'array',
                items: { type: 'number' }
              }
            }
          }
        }
      },
      partnerCount: { type: 'number', minimum: 0 },
      managers: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'phone'],
          properties: {
            name: { type: 'string' },
            phone: { type: 'string', pattern: '^[0-9]{10}$' },
            email: { type: 'string', format: 'email' }
          }
        }
      },
      isActive: { type: 'boolean' }
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
    }
  }
}

export const getUserHubSchema: FastifySchema = {
  querystring: {
    type: 'object',
    required: ['lat', 'lng'],
    properties: {
      lat: { type: 'number' },
      lng: { type: 'number' },
    }
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data', 'message'],
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          required: ['hubId', 'name', 'address', 'serviceArea', 'services', 'partnerCount', 'managers', 'isActive'],
          properties: {
            hubId: { type: 'string' },
            name: { type: 'string' },
            address: {
              type: 'object',
              required: ['street', 'city', 'state', 'pincode', 'coordinates'],
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                pincode: { type: 'string', pattern: '^[0-9]{6}$' },
                coordinates: {
                  type: 'object',
                  required: ['lat', 'lng'],
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                  }
                }
              },
            },
            serviceArea: {
              type: 'object',
              required: ['type', 'coordinates'],
              properties: {
                type: { type: 'string', enum: ['Polygon', 'MultiPolygon'] },
                coordinates: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: {
                      type: 'array',
                      items: { type: 'number' }
                    }
                  }
                }
              }
            },
            partnerCount: { type: 'number', minimum: 0 },
            managers: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name', 'phone'],
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string', pattern: '^[0-9]{10}$' },
                  email: { type: 'string', format: 'email' }
                }
              }
            },
            isActive: { type: 'boolean' }
          }
        },
        message: { type: 'string' },
      }
    },
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

export const getHubServicesSchema: FastifySchema = {
  querystring: {
    type: 'object',
    required: ['hubId'],
    properties: {
      hubId: { type: 'string' },
    }
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'data', 'message'],
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object'
          }
        }
      }
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
    }
  }
}