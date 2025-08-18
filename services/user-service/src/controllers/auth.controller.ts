import { FastifyReply, FastifyRequest } from "fastify";
import { SendOtpBody, VerifyOtpAndLoginBody } from "../schemas/auth.schema";
import { User } from "../models/user.model";
import mongoose from "mongoose";
import { Address } from "../models/address.model";

export class AuthController {
  static async sendOTP(req: FastifyRequest<{ Body: SendOtpBody }>, reply: FastifyReply) {
    try {
      const { phoneNumber, role } = req.body;
      req.server.log.info(`${phoneNumber} - ${role}`);

      const isValidPhoneNumber = AuthController.validatePhoneNumber(phoneNumber);
      if (!isValidPhoneNumber) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid phone number',
          errors: ['Please enter a valid Indian mobile number starting with 6-9']
        })
      }

      const otp = AuthController.getRandomOTP();
      const ttlInSeconds = 10 * 60;

      const redisKey = `${role}:otp:${phoneNumber}`;

      const storedOtp = await req.server.redis.get(redisKey);
      if (storedOtp) {
        await req.server.redis.del(redisKey);
      }
      await req.server.redis.set(redisKey, otp, { EX: ttlInSeconds });

      req.server.log.info(`OTP sent to ${phoneNumber}: ${otp}`);

      return reply.status(200).send({
        success: true,
        message: 'OTP sent',
        data: {
          phoneNumber,
          expiresIn: ttlInSeconds
        }
      })
    } catch (error: any) {
      req.server.log.error('Error sending OTP:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to send OTP',
        errors: [error.message || 'Internal server error']
      });
    }
  }
  static async verifyOTPandLogin(request: FastifyRequest<{ Body: VerifyOtpAndLoginBody }>, reply: FastifyReply) {
    try {
      if (!request.server.mongooseReady()) {
        request.server.log.error('MongoDB not ready for request');
        return reply.status(503).send({
          success: false,
          message: 'Service temporarily unavailable',
          errors: ['Database not ready. Please try again.']
        });
      }

      request.server.log.info("mongoose State :" + request.server.mongooseState())
      request.server.log.info("service mongoose State :" + mongoose.connection.readyState)

      const { phoneNumber, otp, role } = request.body;

      const redisKey = `${role}:otp:${phoneNumber}`;
      const storedOtp = await request.server.redis.get(redisKey);

      if (!storedOtp) {
        return reply.status(400).send({
          success: false,
          message: 'OTP expired or not found',
          errors: ['Please request a new OTP']
        });
      }

      if (storedOtp !== otp) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid OTP',
          errors: ['The OTP you entered is incorrect']
        });
      }

      await request.server.redis.del(redisKey);

      let user = await User.findOne({ phoneNumber, role });
      let isNewUser = false;

      if (!user) {
        isNewUser = true;
        user = new User({
          phoneNumber,
          phoneNumberVerified: true,
          role,
        });
        await user.save();
        request.server.log.info(`New user created with phone: ${phoneNumber}`);
      } else {
        if (!user.phoneNumberVerified) {
          user.phoneNumberVerified = true;
          await user.save();
        }
      }

      const sessionToken = await request.server.createSession(user.id.toString(), role.toString());

      let addresses = [];
      try {
        addresses = await Address.find({ userId: user._id }).lean();
        request.server.log.info(`Found ${addresses.length} addresses for user ${user._id}`);
      } catch (addressError: any) {
        request.server.log.error('Error fetching addresses:', addressError);
      }

      // const dummyAddress = {
      //   id: '123',
      //   userId: '123',
      //   hubId: '123',
      //   googleMapsShortAddress: '123',
      //   googleMapsLongAddress: '123, 456, Long Google Maps Address, Bangalore , Karnataka , India , 111111',
      //   houseNumber: '123',
      //   road: 'Example Road',
      //   landmark: 'Example Landmark',
      //   latitude: 12.9698,
      //   longitude: 77.7500,
      //   houseDetails: {
      //     bedrooms: 2,
      //     bathrooms: 2,
      //     balconies: 1,
      //   },
      //   contactPhoneNumber: '8595058382',
      //   contactName: 'Ajay',
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      // }
      // addresses.push(dummyAddress);

      const formattedAddresses = addresses.map(address => ({
        id: address._id.toString(),
        userId: address.userId.toString(),
        hubId: address.hubId,
        googleMapsShortAddress: address.googleMapsShortAddress,
        googleMapsLongAddress: address.googleMapsLongAddress,
        houseNumber: address.house_number,
        road: address.road,
        landmark: address.landmark || null,
        latitude: address.lat,
        longitude: address.lng,
        houseDetails: {
          bedrooms: address.bedrooms,
          bathrooms: address.bathrooms,
          balconies: address.balconies,
        },
        contactPhoneNumber: address.contact_phone_number,
        contactName: address.contact_name,
        createdAt: address.createdAt?.toISOString(),
        updatedAt: address.updatedAt?.toISOString(),
      }));

      return reply.status(200).send({
        success: true,
        message: isNewUser ? 'Account created and logged in successfully' : 'Logged in successfully',
        data: {
          phoneNumber,
          isNewUser,
          sessionToken,
          user: {
            id: user._id.toString(),
            phoneNumber: user.phoneNumber,
            phoneNumberVerified: user.phoneNumberVerified,
            fullName: user.fullName || null,
            gender: user.gender || null,
            dateOfBirth: user.dateOfBirth?.toISOString() || null,
            role: user.role,
            profileImageUrl: null,
            createdAt: user.createdAt?.toISOString(),
            updatedAt: user.updatedAt?.toISOString(),
          },
          addresses: formattedAddresses,
        }
      });

    } catch (error: any) {
      request.server.log.error('Error verifying OTP:', error);

      if (error.code === 11000) {
        return reply.status(400).send({
          success: false,
          message: 'User already exists with this phone number',
          errors: ['Please try logging in instead']
        });
      }

      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          success: false,
          message: 'Validation failed',
          errors: Object.values(error.errors).map((e: any) => e.message)
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Failed to verify OTP',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sessionId } = request.session;
      await request.server.revokeSession(sessionId);
      return reply.status(200).send({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error: any) {
      request.server.log.error('Error during logout:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to logout',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  private static getRandomOTP(): string {
    // Simulate OTP generation
    return '000000';
  }

  private static validatePhoneNumber(phoneNumber: string): boolean {
    return phoneNumber.match(/^[6-9]\d{9}$/) !== null;
  }
  static async checkSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = request.session
      if (!sessionId || !userId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized',
          errors: ['No session found']
        })
      }
      const user = await User.findById(userId)
      if (!user) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized',
          errors: ['User not found']
        })
      }
      return reply.status(200).send({
        success: true,
        message: 'Session and user found',
        data: {
          userId: user._id.toString(),
          role
        }
      })
    } catch (error) {

    }
  }
}
