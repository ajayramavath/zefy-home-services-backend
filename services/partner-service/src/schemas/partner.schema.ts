import { FastifySchema } from "fastify";

export const createPartnerSchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['personalInfo', 'contact', 'address', 'bankDetails', 'services', 'operationalHubs'],
    properties: {
      personalInfo: {
        type: 'object',
        required: ['firstName', 'lastName', 'dateOfBirth', 'gender'],
        properties: {
          firstName: { type: 'string', minLength: 2 },
          lastName: { type: 'string', minLength: 2 },
          dateOfBirth: { type: 'string', format: 'date' },
          gender: { type: 'string', enum: ['male', 'female', 'other'] },
        },
      },
      contact: {
        type: 'object',
        required: ['phone'],
        properties: {
          phone: { type: 'string', pattern: '^[0-9]{10}$' },
          email: { type: 'string', format: 'email' },
          emergencyContact: { type: 'string', pattern: '^[0-9]{10}$' },
        },
      },
      address: {
        type: 'object',
        required: ['street', 'city', 'state', 'pincode'],
        properties: {
          street: { type: 'string' },
          unit: { type: 'string' },
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
        },
      },
      bankDetails: {
        type: 'object',
        required: ['accountHolderName', 'accountNumber', 'ifscCode', 'bankName'],
        properties: {
          accountHolderName: { type: 'string' },
          accountNumber: { type: 'string' },
          ifscCode: { type: 'string', pattern: '^[A-Z]{4}0[A-Z0-9]{6}$' },
          bankName: { type: 'string' },
          upiId: { type: 'string' },
        },
      },
      services: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
      operationalHubs: {
        type: 'array',
        items: { type: 'string' },
        minItems: 1,
      },
      idProof: {
        type: 'object',
        required: ['type', 'number'],
        properties: {
          type: { type: 'string', enum: ['aadhaar', 'pan', 'driving_license'] },
          number: { type: 'string' },
        },
      },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        message: { type: 'string' },
      },
    },
  },
}

export const updateAvailabilitySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      isAvailable: { type: 'boolean' },
      workingDays: {
        type: 'array',
        items: { type: 'number', minimum: 0, maximum: 6 },
      },
      workingHours: {
        type: 'object',
        properties: {
          start: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
          end: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
        },
      },
      unavailableDates: {
        type: 'array',
        items: { type: 'string', format: 'date' },
      },
    },
  }
}

export const getPartnerBookingsSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      page: { type: 'number', minimum: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100 },
    },
  }
}