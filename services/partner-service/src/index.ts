import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import "dotenv/config";
import { mongoosePlugin, redisPlugin, rabbitmqPlugin, sessionPlugin, EventConsumer, QUEUES } from '@zf/common';
import partnerPlugin from './plugins/partnerPlugin';

import { partnerRoutes } from './routes/partner.route';
import { PartnerEventPublisher } from './events/publisher';
import { PartnerEventConsumer } from './events/consumer';
import { PartnerService } from './service/partner.service';
import { S3Client } from '@aws-sdk/client-s3';

const fastify = Fastify({
  logger: {
    level: 'info',
  }
});

let eventPublisher: PartnerEventPublisher;

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

async function start() {
  try {
    await fastify.register(cors, {
      origin: true
    });
    await fastify.register(mongoosePlugin, { uri: process.env.MONGO_URI! });

    await fastify.register(redisPlugin, { url: process.env.REDIS_URL! });
    await fastify.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });
    await fastify.register(sessionPlugin, {
      ttlSeconds: 180 * 24 * 3600,
      allowMultipleSessions: false,
    });

    fastify.get('/partners/health', async () => {
      return {
        status: 'OK',
        service: 'partner-service'
      };
    });

    eventPublisher = new PartnerEventPublisher(fastify);

    fastify.decorate('eventPublisher', eventPublisher);

    fastify.register(partnerPlugin);

    const partnerService = new PartnerService(fastify);
    const partnerEventPublisher = new PartnerEventPublisher(fastify);

    const partnerEventConsumer = new PartnerEventConsumer(fastify, partnerService, partnerEventPublisher);
    await partnerEventConsumer.setupEventListeners();
    await fastify.register(partnerRoutes, { prefix: '/partners' });

    const port = Number(process.env.PORT) || 3003;

    await fastify.listen({ port });

    fastify.log.info(`🚀 Partner Service running on http://0.0.0.0:${port}`);
    fastify.log.info(`📚 API Documentation: http://localhost:${port}/docs`);

  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();
