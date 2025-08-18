import { FastifyReply, FastifyRequest } from "fastify";
import { Partner } from "../models/partner.model";
import {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  UpdateOnboardingStep,
  Step5Data
} from '../schemas/partner.schema';
import { Availability } from "../models/availability.model";
import { IAvailability, IPartner } from "@zf/types";
import { s3 } from "../index";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class PartnerController {


  static async createPartner(userId: string): Promise<IPartner> {
    try {
      const newPartner = new Partner({ userId });
      await newPartner.save();
      return newPartner
    } catch (error) {
      throw error
    }
  }

  static async getPresignedUrl(request: FastifyRequest<{ Querystring: { fileName: string, fileType: string } }>, reply: FastifyReply) {
    try {
      const { fileName, fileType } = request.query;
      const { userId } = request.session;
      if (!fileName || !fileType) {
        return reply.status(400).send({
          success: false,
          errors: ["fileName and filetype are required"],
          message: 'Failed to get presigned URL'
        });
      }

      const bucketName = process.env.AWS_S3_BUCKET!;
      request.server.log.info(` ${bucketName} with fileName ${fileName} and fileType ${fileType}`);
      const objectKey = `${userId}/${Date.now()}-${fileName}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

      return reply.status(200).send({
        success: true,
        message: 'Presigned URL generated successfully',
        data: {
          'uploadUrl': uploadUrl,
          fileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION!}.amazonaws.com/${objectKey}`
        }
      });
    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to get presigned URL'
      });
    }
  }

  static async getPartnerStatus(req: FastifyRequest, reply: FastifyReply) {

    try {
      const { userId } = req.session;
      const partner = await Partner.findOne({ userId });

      if (!partner) {
        const newPartner = await PartnerController.createPartner(userId);

        return reply.status(200).send({
          success: true,
          data: {
            partnerExists: false,
            status: newPartner.status,
            completionStep: 0,
            canStartOnboarding: true,
            partner: newPartner
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
      req.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to get partner status'
      });
    }
  }

  static async updateOnboardingStep(request: FastifyRequest<{ Body: UpdateOnboardingStep }>, reply: FastifyReply) {
    try {
      const { userId } = request.session;
      const { step, data } = request.body;

      let partner = await Partner.findOne({ userId });
      if (!partner) {
        request.server.log.info(`Creating new partner for user ${userId}`);
        partner = new Partner({ userId, completionStep: 0 });
      } else {
        request.server.log.info(`Partner exists ${userId}`);
      }

      if (partner.completionStep < (step - 1)) {
        return reply.status(400).send({
          success: false,
          message: `Cannot proceed to step ${step}. Complete previous steps first.`
        });
      }

      switch (step) {
        case 1: {
          const stepData = data as Step1Data;
          request.server.log.info(`Updating partner ${userId} with step 1 data ${JSON.stringify(stepData)}`);
          partner.personalInfo = {
            fullName: stepData.fullName,
            dateOfBirth: new Date(stepData.dateOfBirth),
            gender: stepData.gender,
            profilePicture: stepData.profilePhoto,
            phoneNumber: stepData.phoneNumber
          }
          break;
        }

        case 2: {
          const stepData = data as Step2Data;
          partner.serviceIDs = stepData.services;
          partner.operationalHubId = stepData.hubId;
          break;
        }

        case 3: {
          const stepData = data as Step3Data;
          const availabilityData: IAvailability = {
            partnerId: partner.id,
            isOnline: false,
            status: 'OFFLINE',
            workingSchedule: {
              workingDays: stepData.availableDays.map(day => {
                const dayMap = {
                  'monday': 1,
                  'tuesday': 2,
                  'wednesday': 3,
                  'thursday': 4,
                  'friday': 5,
                  'saturday': 6,
                  'sunday': 0
                };
                return dayMap[day as keyof typeof dayMap];
              }),
              workingHours: {
                start: stepData.startTime || '09:00',
                end: stepData.endTime || '18:00'
              }
            },
            todayStats: {
              completedJobs: [],
              scheduledJobs: []
            },
            serviceIDs: partner.serviceIDs || [],
            operationalHubId: partner.operationalHubId
          }
          const availability = await Availability.create(availabilityData);
          partner.availabilityId = availability.id;
          break;
        }

        case 4: {
          const stepData = data as Step4Data;
          partner.bankDetails = stepData.bankDetails;
          break;
        }

        case 5: {
          const stepData = data as Step5Data;
          const { type, number, selfiePhoto, idFrontPhoto, idBackPhoto } = stepData;
          partner.verification = {
            idProof: {
              type,
              number,
              verified: false,
              selfiePhoto,
              idFrontPhoto: idFrontPhoto,
              idBackPhoto: idBackPhoto
            },
            backgroundCheck: {
              status: 'pending',
              completedAt: null
            }
          }
          break;
        }

        default:
          return reply.status(400).send({
            success: false,
            message: 'Invalid step number'
          });
      }

      partner.completionStep = step;
      if (partner.completionStep === 5) {
        partner.status = 'pending_approval';
      }
      request.server.log.info(`Partner ${JSON.stringify(partner)}`);


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