import { FastifyReply, FastifyRequest } from "fastify";
import { Hub } from '../models/hub.model'
import { HubService } from "../models/hubService.model";
import { IService } from "@zf/types";
import { EventPublisher } from "@zf/common";
import { Service } from "../models/service.model";
import { mongoose } from "@zf/common";

export class HubController {
  static async assignHub(request: FastifyRequest<{
    Body: {
      coordinates: { lat: number; lng: number }
    }
  }>, reply: FastifyReply) {
    try {
      const { userId } = request.session;
      const { coordinates } = request.body;

      const hub = await Hub.findOne({
        serviceArea: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [coordinates.lng, coordinates.lat]
            }
          }
        }
      })

      if (!hub) {
        return reply.status(400).send({
          success: false,
          message: 'Service not available in your area',
          errors: ['We are not currently serving in your location. Please try a different address.']
        })
      }

      const hubServices = await HubService.find({
        hubId: hub.hubId,
        isActive: true
      })

      const serviceIds = hubServices.map(hs => hs.serviceId);
      const services = await Promise.all(serviceIds.map(async serviceId => {
        const service = await Service.findOne({ serviceId });
        return service;
      }))

      const serviceMap = new Map<string, IService>();
      services.forEach(service => {
        serviceMap.set(service.serviceId, service);
      });

      const availableServices = hubServices.map(hs => {
        const service = serviceMap.get(hs.serviceId);

        if (!service) {
          request.server.log.warn(`Service not found for serviceId: ${hs.serviceId}`);
          return null;
        }

        return {
          id: service._id.toString(),
          serviceId: service.serviceId,
          name: service.name,
          description: service.description,
          icon: service.icon,
          basePrice: hs.customPrice || service.basePrice,
          ratePerMinute: service.ratePerMinute,
          estimatedDuration: service.estimatedDuration,
          isPackage: service.isPackage,
          tasksIncluded: service.tasksIncluded,
          tasksExcluded: service.tasksExcluded,
          isAvailable: service.isAvailable,
          hubServiceId: hs.hubServiceId
        };
      }).filter(Boolean);

      const response = {
        success: true,
        message: 'Hub assigned successfully',
        data: {
          hub: {
            hubId: hub.hubId,
            name: hub.name,
            city: hub.address.city,
            state: hub.address.state,
            coordinates: hub.address.coordinates
          },
          availableServices,
          serviceCount: availableServices.length,
          location: coordinates
        }
      };

      await reply.status(201).send(response);

      setImmediate(async () => {
        try {
          const eventPublisher = new EventPublisher(request.server);

          await eventPublisher.publishHubAssigned(
            userId,
            hub.hubId,
            coordinates,
            hub.address.city
          );

          request.server.log.info(`📤 Hub assigned event emitted for user ${userId} -> hub ${hub.hubId}`);
        } catch (error) {
          request.server.log.error('❌ Failed to emit hub assigned event:', error);
        }
      });
    } catch (error) {
      request.server.log.error('Error assigning hub:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to assign hub',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async getHubServices(request: FastifyRequest<{ Body: { hubId: string } }>, reply: FastifyReply) {
    try {
      const { hubId } = request.body;
      request.server.log.info(`Getting hub services for hubId: ${hubId}`);

      const hub = await Hub.findOne({ hubId });

      if (!hub) {
        return reply.status(404).send({
          success: false,
          message: 'Hub not found or inactive'
        });
      }

      const hubServices = await HubService.find({
        hubId,
        isActive: true
      })
      const services = await Promise.all(hubServices.map(async hs => {
        const serviceId = hs.serviceId as String;
        const service = await Service.findOne({ serviceId });
        request.server.log.info(`Hub service: ${service}`);
        return service;
      }))

      request.server.log.info(`Hub services: ${services}`);

      return reply.status(200).send({
        success: true,
        data: {
          hub: {
            hubId: hub.hubId,
            name: hub.name,
            city: hub.address.city
          },
          services,
        }
      });

    } catch (error: any) {
      request.server.log.error('Error getting hub services:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get hub services',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async checkHub(request: FastifyRequest<{
    Body: {
      coordinates: { lat: number; lng: number }
    }
  }>, reply: FastifyReply) {
    try {
      const { coordinates } = request.body;

      const hub = await Hub.findOne({
        serviceArea: {
          $geoIntersects: {
            $geometry: {
              type: 'Point',
              coordinates: [coordinates.lng, coordinates.lat]
            }
          }
        }
      })

      if (!hub) {
        return reply.status(200).send({
          success: false,
          message: 'Service not available in your area',
          available: false
        })
      }
      return reply.status(200).send({
        success: true,
        message: 'Service available in your area',
        available: true,
        data: hub
      })
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: 'Failed to check hub',
        errors: [error.message || 'Internal server error']
      });
    }
  }
}