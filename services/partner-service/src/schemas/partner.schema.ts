import { Type, Static } from '@sinclair/typebox';

const SuccessResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any())
});

const ErrorResponse = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  errors: Type.Optional(Type.Array(Type.String()))
});

const SecurityBearerAuth = [{ bearerAuth: [] }];

const DayAvailabilitySchema = Type.Object({
  available: Type.Boolean(),
  startTime: Type.Optional(Type.String({ pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' })),
  endTime: Type.Optional(Type.String({ pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }))
});

const PartnerStatus = Type.Union([
  Type.Literal('incomplete'),
  Type.Literal('pending_approval'),
  Type.Literal('approved'),
  Type.Literal('rejected')
]);

const JobStatus = Type.Union([
  Type.Literal('pending'),
  Type.Literal('accepted'),
  Type.Literal('in_progress'),
  Type.Literal('completed'),
  Type.Literal('cancelled')
]);

const Step1DataSchema = Type.Object({
  fullName: Type.String({ minLength: 2, maxLength: 100, pattern: '^[a-zA-Z\\s]+$' }),
  dateOfBirth: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  gender: Type.Union([Type.Literal('male'), Type.Literal('female'), Type.Literal('other')]),
  profilePhoto: Type.Optional(Type.String())
});

const Step2DataSchema = Type.Object({
  services: Type.Array(Type.String(), { minItems: 1, uniqueItems: true })
});

const Step3DataSchema = Type.Object({
  availability: Type.Object({
    monday: DayAvailabilitySchema,
    tuesday: DayAvailabilitySchema,
    wednesday: DayAvailabilitySchema,
    thursday: DayAvailabilitySchema,
    friday: DayAvailabilitySchema,
    saturday: DayAvailabilitySchema,
    sunday: DayAvailabilitySchema
  })
});

const Step4DataSchema = Type.Object({
  bankDetails: Type.Object({
    accountHolderName: Type.String({ minLength: 2, maxLength: 100, pattern: '^[a-zA-Z\\s]+$' }),
    accountNumber: Type.String({ pattern: '^[0-9]{9,18}$' }),
    ifscCode: Type.String({ pattern: '^[A-Z]{4}0[A-Z0-9]{6}$' }),
    bankName: Type.String({ minLength: 2, maxLength: 100 })
  }),
  documents: Type.Optional(Type.Object({
    aadharCard: Type.Optional(Type.String()),
    panCard: Type.Optional(Type.String()),
    bankPassbook: Type.Optional(Type.String())
  }))
});

// Route Schemas

// GET /status
export const GetPartnerStatusSchema = {
  description: 'Get partner onboarding status',
  tags: ['Partners'],
  security: SecurityBearerAuth,
  response: {
    200: Type.Object({
      success: Type.Boolean(),
      data: Type.Object({
        partnerExists: Type.Boolean(),
        status: Type.Union([PartnerStatus, Type.Null()]),
        completionStep: Type.Number({ minimum: 0, maximum: 4 }),
        canStartOnboarding: Type.Boolean(),
        partner: Type.Optional(Type.Any())
      })
    }),
    401: ErrorResponse
  }
};

// POST /onboarding/step
export const UpdateOnboardingStepSchema = {
  description: 'Update partner onboarding step',
  tags: ['Partners'],
  security: SecurityBearerAuth,
  body: Type.Object({
    step: Type.Number({ minimum: 1, maximum: 4 }),
    data: Type.Union([Step1DataSchema, Step2DataSchema, Step3DataSchema, Step4DataSchema])
  }),
  response: {
    200: Type.Object({
      success: Type.Boolean(),
      message: Type.String(),
      data: Type.Object({
        completionStep: Type.Number(),
        status: PartnerStatus,
        partner: Type.Any()
      })
    }),
    400: ErrorResponse,
    401: ErrorResponse
  }
};

// GET /profile
export const GetPartnerProfileSchema = {
  description: 'Get complete partner profile',
  tags: ['Partners'],
  security: SecurityBearerAuth,
  response: {
    200: Type.Object({
      success: Type.Boolean(),
      data: Type.Any() // Partner object with dynamic fields based on completion
    }),
    404: ErrorResponse,
    401: ErrorResponse
  }
};

// PUT /availability
export const UpdateAvailabilitySchema = {
  description: 'Update partner availability status',
  tags: ['Partners'],
  security: SecurityBearerAuth,
  body: Type.Object({
    available: Type.Boolean(),
  }),
  response: {
    200: SuccessResponse,
    400: ErrorResponse,
    401: ErrorResponse,
    404: ErrorResponse
  }
};

// GET /jobs
export const GetJobsSchema = {
  description: 'Get partner job history and current jobs',
  tags: ['Partners'],
  security: SecurityBearerAuth,
  querystring: Type.Object({
    status: Type.Optional(JobStatus),
    limit: Type.Optional(Type.Number({ default: 20, minimum: 1, maximum: 100 })),
    offset: Type.Optional(Type.Number({ default: 0, minimum: 0 }))
  }),
  response: {
    200: Type.Object({
      success: Type.Boolean(),
      data: Type.Object({
        jobs: Type.Array(Type.Any()),
        total: Type.Number(),
        limit: Type.Number(),
        offset: Type.Number()
      })
    }),
    401: ErrorResponse
  }
};

// POST /jobs/:jobId/accept
export const AcceptJobSchema = {
  description: 'Accept a job assignment',
  tags: ['Partners'],
  security: SecurityBearerAuth,
  params: Type.Object({
    jobId: Type.String()
  }),
  response: {
    200: SuccessResponse,
    400: ErrorResponse,
    401: ErrorResponse,
    404: ErrorResponse
  }
};

// PUT /jobs/:jobId/status
export const UpdateJobStatusSchema = {
  description: 'Update job status (start, complete, etc.)',
  tags: ['Partners'],
  security: SecurityBearerAuth,
  params: Type.Object({
    jobId: Type.String()
  }),
  body: Type.Object({
    status: Type.Union([
      Type.Literal('started'),
      Type.Literal('completed'),
      Type.Literal('cancelled')
    ]),
    otp: Type.Optional(Type.String({ pattern: '^[0-9]{6}$' })),
    notes: Type.Optional(Type.String())
  }),
  response: {
    200: SuccessResponse,
    400: ErrorResponse,
    401: ErrorResponse,
    404: ErrorResponse
  }
};

export type UpdateOnboardingStep = Static<typeof UpdateOnboardingStepSchema.body>;
export type Step1Data = Static<typeof Step1DataSchema>;
export type Step2Data = Static<typeof Step2DataSchema>;
export type Step3Data = Static<typeof Step3DataSchema>;
export type Step4Data = Static<typeof Step4DataSchema>;
export type UpdateAvailabilityBody = Static<typeof UpdateAvailabilitySchema.body>;
export type UpdateJobStatusBody = Static<typeof UpdateJobStatusSchema.body>;
export type UpdateJobStatusParams = Static<typeof UpdateJobStatusSchema.params>;
export type GetJobsQuerystring = Static<typeof GetJobsSchema.querystring>;