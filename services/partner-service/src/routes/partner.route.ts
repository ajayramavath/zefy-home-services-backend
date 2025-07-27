import { FastifyInstance } from 'fastify';
import { PartnerController } from '../controllers/partner.controller';
import {
  GetPartnerStatusSchema,
  UpdateOnboardingStepSchema,
  GetPartnerProfileSchema,
  UpdateAvailabilitySchema,
  GetJobsSchema,
  AcceptJobSchema,
  UpdateJobStatusSchema
} from '../schemas/partner.schema';

export async function partnerRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', fastify.authenticate);

  // Get partner status - GET /status
  fastify.get('/status', {
    schema: GetPartnerStatusSchema
  }, PartnerController.getPartnerStatus);

  // Update onboarding step - POST /onboarding/step
  fastify.post('/onboarding/step', {
    schema: UpdateOnboardingStepSchema
  }, PartnerController.updateOnboardingStep);

  // // Get partner profile - GET /profile  
  // fastify.get('/profile', {
  //   schema: GetPartnerProfileSchema
  // }, PartnerController.getPartnerProfile);

  // // Update availability - PUT /availability
  // fastify.put('/availability', {
  //   schema: UpdateAvailabilitySchema
  // }, PartnerController.updateAvailability);

  // // Get jobs - GET /jobs
  // fastify.get('/jobs', {
  //   schema: GetJobsSchema
  // }, PartnerController.getJobs);

  // // Accept job - POST /jobs/:jobId/accept
  // fastify.post('/jobs/:jobId/accept', {
  //   schema: AcceptJobSchema
  // }, PartnerController.acceptJob);

  // // Update job status - PUT /jobs/:jobId/status
  // fastify.put('/jobs/:jobId/status', {
  //   schema: UpdateJobStatusSchema
  // }, PartnerController.updateJobStatus);
}