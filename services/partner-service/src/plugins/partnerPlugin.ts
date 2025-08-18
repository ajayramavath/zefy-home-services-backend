import fp from 'fastify-plugin';
import { FastifyPluginAsync } from "fastify";
import { Partner } from "../models/partner.model";

const partnerPlugin: FastifyPluginAsync = async (fastify, opts) => {
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.url.startsWith("/partners/ws") ||
      request.url.includes("/partners/status") ||
      request.url.includes("/ws?") ||
      request.url.startsWith("/partners/test-ws-direct") ||
      request.headers.upgrade === 'websocket' ||
      request.headers.connection?.toLowerCase().includes('upgrade')) {
      return;
    }
    const { userId, sessionId, role } = request.session;
    if (role !== 'partner') {
      return reply.status(401).send({
        success: false,
        message: 'Unauthorized',
        errors: ['You are not authorized to perform this action']
      })
    }
    if (request.url.startsWith("/createPartner")) {
      return;
    }

    const partner = await Partner.findOne({ userId });
    if (!partner) {
      return reply.status(404).send({
        success: false,
        message: 'Partner not found',
        errors: ['Partner not found']
      })
    }

    request.partner = partner;
  });
}

export default fp(partnerPlugin);