// services/user-service/src/controllers/profile.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import UserModel, {
  FavoriteType,
  ILocation,
  IUser,
} from "../models/user.model";

export interface FullProfile {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null; // ISO date
  gender: string | null;
  email: string | null;
  phoneNumber: string | null;
  favoriteLocations: Record<FavoriteType, ILocation | null>;
}

export interface UpdateProfileBody {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string; // client sends ISO date
  gender?: "male" | "female" | "other";
}

export class ProfileController {
  // PATCH any subset of profile fields
  static async update(
    req: FastifyRequest<{ Body: UpdateProfileBody }>,
    reply: FastifyReply
  ) {
    const updates: Partial<{
      firstName: string;
      middleName: string;
      lastName: string;
      dateOfBirth: Date;
      gender: string;
    }> = {};

    const { firstName, middleName, lastName, dateOfBirth, gender } = req.body;
    if (firstName !== undefined) updates.firstName = firstName;
    if (middleName !== undefined) updates.middleName = middleName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (dateOfBirth !== undefined) {
      const d = new Date(dateOfBirth);
      if (isNaN(d.getTime())) {
        return reply.status(400).send({ error: "Invalid dateOfBirth" });
      }
      updates.dateOfBirth = d;
    }
    if (gender !== undefined) updates.gender = gender;

    if (Object.keys(updates).length === 0) {
      return reply
        .status(400)
        .send({ error: "At least one field must be provided for update" });
    }

    const userId = req.session.userId;
    const updatedDoc = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    )
      .lean<IUser>() // ← here
      .exec();

    if (!updatedDoc) {
      return reply.status(404).send({ error: "User not found" });
    }

    // Rebuild the flat profile + favorites
    const emailProv = updatedDoc.providers.find((p) => !!p.email);
    const phoneProv = updatedDoc.providers.find((p) => !!p.phoneNumber);

    const profile: FullProfile = {
      firstName: updatedDoc.firstName ?? null,
      middleName: updatedDoc.middleName ?? null,
      lastName: updatedDoc.lastName ?? null,
      dateOfBirth: updatedDoc.dateOfBirth
        ? updatedDoc.dateOfBirth.toISOString()
        : null,
      gender: updatedDoc.gender ?? null,
      email: emailProv?.email ?? null,
      phoneNumber: phoneProv?.phoneNumber ?? null,
      favoriteLocations: {
        home: updatedDoc.favoriteLocations.home ?? null,
        work: updatedDoc.favoriteLocations.work ?? null,
        other: updatedDoc.favoriteLocations.other ?? null,
      },
    };

    return reply.send(profile);
  }

  // GET the full profile + favorites
  static async getProfile(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.session.userId;
    const doc = await UserModel.findById(userId).lean().exec();
    if (!doc) {
      return reply.status(404).send({ error: "User not found" });
    }

    const emailProv = doc.providers.find((p) => !!p.email);
    const phoneProv = doc.providers.find((p) => !!p.phoneNumber);

    const profile: FullProfile = {
      firstName: doc.firstName ?? null,
      middleName: doc.middleName ?? null,
      lastName: doc.lastName ?? null,
      dateOfBirth: doc.dateOfBirth ? doc.dateOfBirth.toISOString() : null,
      gender: doc.gender ?? null,
      email: emailProv?.email ?? null,
      phoneNumber: phoneProv?.phoneNumber ?? null,
      favoriteLocations: {
        home: doc.favoriteLocations.home ?? null,
        work: doc.favoriteLocations.work ?? null,
        other: doc.favoriteLocations.other ?? null,
      },
    };

    return reply.send(profile);
  }
}
