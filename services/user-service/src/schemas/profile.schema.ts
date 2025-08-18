import { Type, Static } from '@sinclair/typebox';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  errors: Type.Optional(Type.Array(Type.String()))
});

export const UpdateProfileSchema = {
  description: 'Update user profile',
  tags: ['Profile'],
  body: Type.Object({
    fullName: Type.Optional(Type.String()),
    dateOfBirth: Type.Optional(Type.String()),
    gender: Type.Optional(Type.Union([Type.Literal('male'), Type.Literal('female'), Type.Literal('other')])),
  }),
  response: {
    201: Type.Object({
      success: Type.Boolean(),
      message: Type.String(),
    }),
    400: ErrorResponse,
    500: ErrorResponse
  }
}

export const SaveAddressSchema = {
  description: 'Save address',
  tags: ['Profile'],
  body: Type.Object({
    hubId: Type.String(),
    googleMapsShortAddress: Type.String(),
    googleMapsLongAddress: Type.String(),
    houseNumber: Type.String(),
    road: Type.String(),
    landmark: Type.Optional(Type.String()),
    latitude: Type.Number(),
    longitude: Type.Number(),
    houseDetails: Type.Object({
      bedrooms: Type.Number(),
      bathrooms: Type.Number(),
      balconies: Type.Number(),
    }),
    contactPhone: Type.String(),
    contactName: Type.String(),
  }),
  response: {
    200: SuccessResponse,
    400: ErrorResponse,
    500: ErrorResponse
  }
}

export type UpdateProfileBody = Static<typeof UpdateProfileSchema.body>;
export type SaveAddressBody = Static<typeof SaveAddressSchema.body>;