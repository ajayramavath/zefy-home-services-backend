import { FastifyReply, FastifyRequest } from "fastify";
import { Partner } from "../models/partner.model";
import {
  UpdateOnboardingStepSchema,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data
} from '../schemas/partner.schema';
import { Static } from '@sinclair/typebox';
import { Availability } from "../models/availability.model";
import { IAvailability } from "@zf/types";

// Extract the request type from the schema
type UpdateOnboardingStepRequest = FastifyRequest<{
  Body: Static<typeof UpdateOnboardingStepSchema.body>
}>;

export class PartnerController {

  static async getPartnerStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.user;
      const partner = await Partner.findOne({ userId: id });

      if (!partner) {
        return reply.status(200).send({
          success: true,
          data: {
            partnerExists: false,
            status: null,
            completionStep: 0,
            canStartOnboarding: true
          }
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          partnerExists: true,
          status: partner.status,
          completionStep: partner.completionStep,
          canStartOnboarding: partner.status === 'incomplete',
          partner: partner.toJSON()
        }
      });

    } catch (error) {
      req.server.log.error('Error getting partner status:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to get partner status'
      });
    }
  }

  static async updateOnboardingStep(request: UpdateOnboardingStepRequest, reply: FastifyReply) {
    try {
      const { id, hubId } = request.user;
      const { step, data } = request.body; // Now properly typed!

      // Find or create partner
      let partner = await Partner.findOne({ userId: id });
      if (!partner) {
        partner = new Partner({ userId: id, completionStep: 0 });
      }

      // Validate step progression
      if (partner.completionStep < (step - 1)) {
        return reply.status(400).send({
          success: false,
          message: `Cannot proceed to step ${step}. Complete previous steps first.`
        });
      }

      // Update fields based on step with proper typing
      switch (step) {
        case 1: {
          const stepData = data as Step1Data;
          partner.personalInfo = {
            fullName: stepData.fullName,
            dateOfBirth: new Date(stepData.dateOfBirth),
            gender: stepData.gender,
            profilePicture: stepData.profilePhoto
          }
          break;
        }

        case 2: {
          const stepData = data as Step2Data;
          partner.serviceIDs = stepData.services;
          break;
        }

        case 3: {
          const stepData = data as Step3Data;
          const availabilityData: IAvailability = {
            partnerId: partner.id,
            isOnline: false,
            status: 'OFFLINE',
            workingSchedule: {
              workingDays: Object.entries(stepData.availability)
                .filter(([_, dayAvail]) => dayAvail.available).map(([day, _]) => {
                  const dayMap = {
                    'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
                    'friday': 5, 'saturday': 6, 'sunday': 0
                  }
                  return dayMap[day as keyof typeof dayMap]
                }),
              workingHours: {
                start: stepData.availability.monday.startTime || '09:00',
                end: stepData.availability.monday.endTime || '18:00'
              }
            },
            todayStats: {
              completedJobs: [],
              scheduledJobs: []
            },
            serviceIDs: partner.serviceIDs || [],
            operationalHubId: hubId
          }
          const availability = await Availability.create(stepData.availability);
          partner.availabilityId = availability.id;
          break;
        }

        case 4: {
          const stepData = data as Step4Data;
          partner.bankDetails = stepData.bankDetails;
          break;
        }

        default:
          return reply.status(400).send({
            success: false,
            message: 'Invalid step number'
          });
      }

      partner.completionStep = step + 1;
      if (partner.completionStep === 4) {
        partner.status = 'pending_approval';
      }

      await partner.save();

      return reply.status(200).send({
        success: true,
        message: `Step ${step} completed successfully`,
        data: {
          completionStep: partner.completionStep,
          status: partner.status,
          partner: partner.toJSON()
        }
      });

    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map((e: any) => e.message)
        });
      }

      request.server.log.error('Error updating onboarding step:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to update onboarding step'
      });
    }
  }
}