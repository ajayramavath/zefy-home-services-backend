// services/user-service/src/schemas/auth.schema.ts
import { FastifySchema } from "fastify";

export const googleSignInSchema: FastifySchema = {
  description: "Sign in (or up) with a Google ID token and get a session",
  tags: ["Auth"],
  body: {
    type: "object",
    required: ["idToken"],
    properties: {
      idToken: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            _id: { type: "string" },
            providers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  provider: { type: "string" },
                  providerId: { type: "string" },
                  email: { type: "string", nullable: true },
                  displayName: { type: "string", nullable: true },
                  photoURL: { type: "string", nullable: true },
                  isVerified: { type: "boolean" },
                  createdAt: { type: "string", format: "date-time" },
                },
                required: ["provider", "providerId", "isVerified", "createdAt"],
              },
            },
            metadata: { type: "object" },
            firstName: { type: "string", nullable: true },
            middleName: { type: "string", nullable: true },
            lastName: { type: "string", nullable: true },
            dateOfBirth: { type: "string", format: "date", nullable: true },
            gender: {
              type: "string",
              enum: ["male", "female", "other"],
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["_id", "providers", "metadata", "createdAt", "updatedAt"],
        },
        sessionToken: { type: "string" },
        expiresIn: { type: "integer" },
      },
      required: ["user", "sessionToken", "expiresIn"],
    },
    401: {
      type: "object",
      properties: { error: { type: "string" } },
      required: ["error"],
    },
  },
};

export const linkPhoneSchema: FastifySchema = {
  description: "Link a verified phone (via Firebase) to the current user",
  tags: ["Auth"],
  // body: {
  //   type: "object",
  //   required: ["phoneIdToken"],
  //   properties: {
  //     phoneIdToken: { type: "string" },
  //   },
  // },
  body: {
    type: 'object',
    required: [
      'uid',
      'isEmailVerified',
      'isAnonymous',
      'metadata',
      'providerData'
    ],
    properties: {
      uid: { type: 'string' },
      displayName: { type: 'string', nullable: true },
      email: { type: 'string', format: 'email', nullable: true },
      isEmailVerified: { type: 'boolean' },
      isAnonymous: { type: 'boolean' },
      metadata: {
        type: 'object',
        required: ['creationTime', 'lastSignInTime'],
        properties: {
          creationTime: { type: 'string', format: 'date-time' },
          lastSignInTime: { type: 'string', format: 'date-time' }
        }
      },
      phoneNumber: { type: ['string', 'null'] },
      photoURL: { type: 'string', nullable: true },
      providerData: {
        type: 'array',
        items: {
          type: 'object',
          required: ['providerId', 'uid'],
          properties: {
            providerId: { type: 'string' },
            uid: { type: 'string' },
            email: { type: 'string', format: 'email', nullable: true },
            phoneNumber: { type: ['string', 'null'] },
            photoURL: { type: 'string', nullable: true },
            displayName: { type: 'string', nullable: true }
          }
        }
      }
    }
  },
  response: {
    200: {
      type: "object",
      properties: { success: { type: "boolean" } },
      required: ["success"],
    },
    401: {
      type: "object",
      properties: { error: { type: "string" } },
      required: ["error"],
    },
  },
};
