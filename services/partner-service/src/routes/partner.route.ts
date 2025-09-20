import { FastifyInstance, FastifyRequest } from 'fastify';
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
import { Partner } from '../models/partner.model';

export async function partnerRoutes(fastify: FastifyInstance) {
  fastify.get('/status', {
    schema: GetPartnerStatusSchema
  }, PartnerController.getPartnerStatus);

  fastify.post('/onboarding/step', {
    schema: UpdateOnboardingStepSchema
  }, PartnerController.updateOnboardingStep);

  fastify.get('/uploads/presignedUrl', PartnerController.getPresignedUrl);

  fastify.get('/dashboard', PartnerController.getDashboard);

  fastify.get('/available-partners', PartnerController.getAvailablePartners);

  fastify.get('/getCurrentBookingId', PartnerController.getCurrentBookingId);

  fastify.get('/getProfile', PartnerController.getProfile);

  fastify.get('/availability/:partnerId', PartnerController.getAvailability);

  fastify.get('/pending-approval', PartnerController.getUnverifiedPartners);

  fastify.post('/verifyPartner/:partnerId', PartnerController.approvePartner);

  fastify.post('/updatePersonalInfo', PartnerController.updatePersonalInfo);

  fastify.post('/updateServices', PartnerController.updateServices);

  fastify.post('/updateAvailabilityDetails', PartnerController.updateAvailabilityDetails);
}