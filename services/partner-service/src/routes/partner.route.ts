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

  fastify.get('/test-ws-direct', async (request: FastifyRequest<{ Querystring: { token: string } }>, reply) => {
    const token = request.query.token as string;

    if (!token) {
      return reply.send({ error: 'No token provided' });
    }

    try {
      // Test the same verification logic as WebSocket
      const sessionData = await fastify.redis.get(`session:${token}`);

      if (!sessionData) {
        return reply.send({
          step: 'session_verification',
          status: 'failed',
          error: 'Session not found in Redis',
          token,
          redisKey: `session:${token}`
        });
      }

      const { userId, role } = JSON.parse(sessionData);

      if (role !== 'partner') {
        return reply.send({
          step: 'role_check',
          status: 'failed',
          error: `Invalid role: ${role}`,
          userId,
          role
        });
      }

      // Check if partner exists
      const partner = await Partner.findOne({ userId });

      if (!partner) {
        return reply.send({
          step: 'partner_lookup',
          status: 'failed',
          error: 'Partner not found',
          userId
        });
      }

      return reply.send({
        step: 'all_checks_passed',
        status: 'success',
        message: 'WebSocket connection should work',
        sessionData: { userId, role },
        partner: {
          id: partner._id,
          userId: partner.userId
        },
        websocketUrls: {
          direct: `ws://localhost:3003/partners/ws?token=${token}`,
          viaGateway: `ws://localhost:3000/partners/ws?token=${token}`
        }
      });

    } catch (error) {
      return reply.send({
        step: 'error',
        status: 'failed',
        error: error.message
      });
    }
  });

  fastify.get('/available-partners', PartnerController.getAvailablePartners)

  fastify.get('/getProfile', PartnerController.getProfile);

  fastify.get('/availability/:partnerId', PartnerController.getAvailability);

  fastify.get('/pending-approval', PartnerController.getUnverifiedPartners);

  fastify.post('/verifyPartner/:partnerId', PartnerController.approvePartner);

}