import { FastifyInstance } from "fastify";
import { HubController } from "../controllers/hub.controller";
import { Type } from '@sinclair/typebox'

export async function hubRoutes(fastify: FastifyInstance) {
  fastify.post("/assignHub", {
    schema: {
      body: Type.Object({
        coordinates: Type.Object({
          lat: Type.Number({ minimum: -90, maximum: 90 }),
          lng: Type.Number({ minimum: -180, maximum: 180 })
        })
      }),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                hub: {
                  type: 'object',
                  properties: {
                    hubId: { type: 'string' },
                    name: { type: 'string' },
                    city: { type: 'string' }
                  }
                },
                availableServices: { type: 'number' },
                location: {
                  type: 'object',
                  properties: {
                    lat: { type: 'number' },
                    lng: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, HubController.assignHub)

  // Get hub services - GET /hubs/:hubId/services
  fastify.get('/hubs/:hubId/services', HubController.getHubServices)

  fastify.post('/services', HubController.getHubServices)

  fastify.post('/checkHub', HubController.checkHub)
}