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

const PhoneNumberPattern = '^[6-9]\\d{9}$';

const OtpPattern = '^\\d{6}$';

export const SendOtpSchema = {
  description: 'Send OTP to phone number',
  tags: ['Authentication'],
  body: Type.Object({
    phoneNumber: Type.String({
      pattern: PhoneNumberPattern,
      description: '10-digit Indian mobile number starting with 6-9',
      examples: ['9876543210']
    }),
    role: Type.Union([
      Type.Literal('admin'),
      Type.Literal('user'),
      Type.Literal('partner')
    ])
  }),
  response: {
    200: Type.Object({
      success: Type.Boolean(),
      message: Type.String(),
      data: Type.Object({
        phoneNumber: Type.String(),
        expiresIn: Type.Number({ description: 'OTP expiry time in seconds' }),
      })
    }),
    400: ErrorResponse,
    500: ErrorResponse
  }
};

export const VerifyOtpAndLoginSchema = {
  description: 'Verify OTP and login user',
  tags: ['Authentication'],
  body: Type.Object({
    phoneNumber: Type.String({
      pattern: PhoneNumberPattern,
      description: '10-digit Indian mobile number starting with 6-9',
      examples: ['9876543210']
    }),
    otp: Type.String({
      pattern: OtpPattern,
      description: '6-digit OTP',
      examples: ['000000']
    }),
    role: Type.Union([
      Type.Literal('admin'),
      Type.Literal('user'),
      Type.Literal('partner')
    ])
  }),
  response: {
    200: Type.Object({
      success: Type.Boolean(),
      message: Type.String(),
      data: Type.Object({
        isNewUser: Type.Boolean(),
        sessionToken: Type.String({ description: 'Session token for authentication' }),
        user: Type.Object({
          id: Type.String(),
          phoneNumber: Type.String(),
          name: Type.String(),
          gender: Type.Union([Type.Literal('male'), Type.Literal('female'), Type.Literal('other')]),
          dateOfBirth: Type.String({ format: 'date-time' }),
          addressIds: Type.Array(Type.String()),
          createdAt: Type.String({ format: 'date-time' }),
          updatedAt: Type.String({ format: 'date-time' }),
          role: Type.String({ enum: ['admin', 'user', 'partner'] }),
        })
      })
    }),
    400: ErrorResponse,
    500: ErrorResponse
  }
};

export type SendOtpBody = Static<typeof SendOtpSchema.body>;
export type VerifyOtpAndLoginBody = Static<typeof VerifyOtpAndLoginSchema.body>;