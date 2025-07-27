import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { mongoosePlugin, redisPlugin, rabbitmqPlugin } from '@zf/common';
import authPlugin from './plugins/auth.plugin';

import { partnerRoutes } from './routes/partner.route';

const fastify = Fastify({ logger: true });

async function start() {
  try {
    await fastify.register(cors, {
      origin: true
    });
    await fastify.register(swagger, {
      swagger: {
        info: {
          title: 'Zefy Partner Service API',
          description: 'API for partner onboarding and job management',
          version: '1.0.0'
        },
        securityDefinitions: {
          bearerAuth: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
            description: 'Enter JWT token in format: Bearer <token>'
          }
        },
        security: [{ bearerAuth: [] }]
      }
    });
    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });

    fastify.register(mongoosePlugin, { uri: process.env.MONGO_URI! });
    fastify.register(redisPlugin, { url: process.env.REDIS_URL! });
    fastify.register(rabbitmqPlugin, { url: process.env.AMQP_URL! });
    await fastify.register(authPlugin);

    fastify.get('/partners/health', async () => {
      return {
        status: 'OK',
        service: 'partner-service'
      };
    });

    // Register partner routes at root level (gateway will prefix with /partners)
    await fastify.register(partnerRoutes, { prefix: '/partners' });

    // Start server
    const port = Number(process.env.PORT) || 3002;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    fastify.log.info(`🚀 Partner Service running on http://${host}:${port}`);
    fastify.log.info(`📚 API Documentation: http://${host}:${port}/docs`);

  } catch (error) {
    fastify.log.error('Error starting server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

start();