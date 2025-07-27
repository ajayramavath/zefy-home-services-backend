// services/user-service/src/controllers/profile.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import UserModel from "../models/user.model";
import { IUser } from '@zf/types'

export interface UpdateProfileBody {
  fullName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  email?: string;
}

export class ProfileController {

  static async getProfile(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.session.userId;
    const doc = await UserModel.findById(userId).lean().exec();
    if (!doc) {
      return reply.status(404).send({ error: "User not found" });
    }

    const profile: IUser = {
      _id: doc._id,
      fullName: doc.fullName,
      dateOfBirth: doc.dateOfBirth,
      gender: doc.gender,
      email: doc.email,
      phoneNumber: doc.phoneNumber,
      phoneNumberVerified: doc.phoneNumberVerified,
      hubId: doc.hubId,
      role: doc.role,
    };

    return reply.status(200).send({
      success: true,
      data: profile,
    });
  }

  static async updateProfile(req: FastifyRequest, reply: FastifyReply) { }
}
