import { FastifyReply, FastifyRequest } from "fastify";
import { Partner } from "../models/partner.model";
import {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  UpdateAvailabilityDetails,
  UpdateOnboardingStep,
  UpdatePersonalInfo,
  UpdateServices,
} from '../schemas/partner.schema';
import { Availability } from "../models/availability.model";
import { IAvailability, IPartner } from "@zf/types";
import { s3 } from "../index";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PartnerStats } from "../models/partnerStats.model";

export class PartnerController {

  static async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { partner } = request;
      if (!partner) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found',
        });
      }

      const partnerWithAvailability = await Partner.findById(partner._id)
        .populate('availabilityId')
        .lean();

      return reply.status(200).send({
        success: true,
        data: partnerWithAvailability
      });
    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to get partner profile'
      });
    }
  }

  static async getAvailability(request: FastifyRequest<{ Params: { partnerId: string } }>, reply: FastifyReply) {
    try {
      const { partnerId } = request.params;
      const { partner } = request;
      if (!partner || (partner._id).toString() !== partnerId) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found',
        });
      }
      const availability = await Availability.findOne({ partnerId: partnerId });
      if (!availability) {
        return reply.status(404).send({
          success: false,
          message: 'Availability not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: availability
      })
    } catch (error) {

    }
  }

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
      const partner = await Partner.findOne({ userId })
        .populate('availabilityId')
        .lean();;

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
          partner: partner
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
            operationalHubId: partner.operationalHubId,
            currentBookingId: null
          }
          const availability = await Availability.create(availabilityData);
          partner.availabilityId = availability.id;
          break;
        }

        case 4: {
          const stepData = data as Step4Data;
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
      if (partner.completionStep === 4) {
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

  static async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { partner } = request;
      if (!partner) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found',
        });
      }

      const availability = await Availability.findOne({ partnerId: partner._id });

      if (!availability) {
        return reply.status(404).send({
          success: false,
          message: 'Availability not found',
        });
      }
      return reply.status(200).send({
        success: true,
        data: {
          completedJobs: availability.todayStats.completedJobs,
        }
      });

    } catch (error) {

    }
  }

  static async getAvailablePartners(request: FastifyRequest<{
    Querystring: {
      hubId: string;
      lat: number;
      lng: number;
    }
  }>, reply: FastifyReply) {
    try {
      const { adminId } = request.adminSession
      if (!adminId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        })
      }
      const { hubId, lat, lng } = request.query;

      const partners = await Partner.find({
        'operationalHubId': hubId,
        'status': 'approved',
      }).populate('availabilityId');

      const availablePartners = partners.filter(async partner => {
        const availability = await Availability.findOne({ partnerId: partner._id });
        if (!availability) {
          return false;
        }
        return availability.isOnline
      })

      reply.status(200).send({
        success: true,
        data: {
          availablePartners
        }
      })


    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to get partners'
      });
    }
  }

  static async getUnverifiedPartners(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { adminId } = request.adminSession;
      if (!adminId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }
      const partners = await Partner.find({
        'status': 'pending_approval'
      });

      reply.status(200).send({
        success: true,
        data: {
          partners
        }
      });
    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to get partners'
      });
    }
  }

  static async getCurrentBookingId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { partner } = request;
      if (!partner) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found'
        });
      }
      const availability = await Availability.findOne({ partnerId: partner._id });
      if (!availability) {
        return reply.status(404).send({
          success: false,
          message: 'Availability not found'
        });
      }
      return reply.status(200).send({
        success: true,
        data: availability.currentBookingId
      });
    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to get current Booking Id'
      });
    }
  }

  static async approvePartner(request: FastifyRequest<{ Params: { partnerId: string }, Querystring: { verify: boolean } }>, reply: FastifyReply) {
    try {

      const { adminId } = request.adminSession;
      if (!adminId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }
      const partner = await Partner.findOne({ _id: request.params.partnerId });
      if (!partner) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found'
        });
      }

      if (partner.status !== 'pending_approval') {
        return reply.status(400).send({
          success: false,
          message: 'Partner is not in pending approval status'
        });
      }

      if (request.query.verify) {
        partner.status = 'approved';
        partner.approvedAt = new Date();
      } else {
        partner.status = 'rejected';
      }
      await partner.save();

      return reply.status(200).send({
        success: true,
        message: 'Partner approved successfully',
      });

    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to approve'
      });
    }
  }

  static async updatePersonalInfo(request: FastifyRequest<{ Body: UpdatePersonalInfo }>, reply: FastifyReply) {
    try {
      const partner = request.partner;
      if (!partner) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found'
        });
      }
      const partnerDb = await Partner.findById(partner._id);
      if (!partnerDb) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found'
        });
      }
      const { fullName, dateOfBirth, gender } = request.body;
      const updateFields: any = {};

      if (fullName !== undefined) {
        updateFields['personalInfo.fullName'] = fullName;
      }
      if (dateOfBirth !== undefined) {
        updateFields['personalInfo.dateOfBirth'] = new Date(dateOfBirth);
      }
      if (gender !== undefined) {
        updateFields['personalInfo.gender'] = gender;
      }

      await Partner.findByIdAndUpdate(partner._id, { $set: updateFields });

      return reply.code(200).send({
        success: true,
        message: 'Personal information updated successfully'
      });

    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to update'
      });
    }
  }

  static async updateServices(request: FastifyRequest<{ Body: UpdateServices }>, reply: FastifyReply) {
    try {
      const partner = request.partner;
      if (!partner) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found'
        });
      }
      const partnerDb = await Partner.findById(partner._id);
      if (!partnerDb) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found'
        });
      }
      partnerDb.serviceIDs = request.body.serviceIDs;
      await partnerDb.save();
      if (partnerDb.availabilityId) {
        await Availability.findByIdAndUpdate(
          partnerDb.availabilityId,
          { serviceIDs: request.body.serviceIDs }
        );
      }

      return reply.code(200).send({
        success: true,
        message: 'Services updated successfully'
      });
    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to update'
      });
    }
  }

  static async updateAvailabilityDetails(request: FastifyRequest<{ Body: UpdateAvailabilityDetails }>, reply: FastifyReply) {
    try {
      const partner = request.partner;
      if (!partner) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found'
        });
      }
      const partnerDb = await Partner.findById(partner._id);
      if (!partnerDb) {
        return reply.status(404).send({
          success: false,
          message: 'Partner not found'
        });
      }
      const { availableDays, startTime, endTime } = request.body;
      const updateData: any = {};

      if (availableDays) {
        const dayNameToNumber: Record<string, number> = {
          'sunday': 0,
          'monday': 1,
          'tuesday': 2,
          'wednesday': 3,
          'thursday': 4,
          'friday': 5,
          'saturday': 6
        };

        const workingDays = availableDays.map(day => dayNameToNumber[day.toLowerCase()]);
        updateData['workingSchedule.workingDays'] = workingDays;
      }

      if (startTime) {
        updateData['workingSchedule.workingHours.start'] = startTime;
      }

      if (endTime) {
        updateData['workingSchedule.workingHours.end'] = endTime;
      }
      await Availability.findByIdAndUpdate(partnerDb.availabilityId, updateData);

    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to update'
      });
    }
  }
}