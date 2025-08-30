import { FastifyReply, FastifyRequest } from "fastify";
import { User } from "../models/user.model";
import { IUser } from '@zf/types'
import { SaveAddressBody } from "../schemas/profile.schema";
import { Address } from "../models/address.model";

export interface UpdateProfileBody {
  fullName?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  email?: string;
}

export class ProfileController {

  static async getProfile(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.session.userId;
    const doc = await User.findById(userId).lean().exec();
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
      addressIds: doc.addressIds,
      role: doc.role,
    };

    return reply.status(200).send({
      success: true,
      data: profile,
    });
  }

  static async updateProfile(req: FastifyRequest<{ Body: UpdateProfileBody }>, reply: FastifyReply) {

    try {
      const userId = req.session.userId;
      const doc = await User.findById(userId);
      if (!doc) {
        return reply.status(404).send({ error: "User not found" });
      }
      const { fullName, dateOfBirth, gender } = req.body;

      doc.fullName = fullName;
      doc.dateOfBirth = new Date(dateOfBirth);
      doc.gender = gender;

      await doc.save();

      return reply.status(201).send({ success: true, message: "Profile updated successfully", data: doc });
    } catch (error) {
      req.server.log.error('Error updating profile:', error);
      return reply.status(500).send({ error: "Failed to update profile" });
    }

  }

  static async saveAddress(req: FastifyRequest<{ Body: SaveAddressBody }>, reply: FastifyReply) {
    try {
      const userId = req.session.userId;
      const doc = await User.findById(userId);
      if (!doc) {
        return reply.status(404).send({ error: "User not found" });
      }
      const { hubId, label, googleMapsShortAddress, googleMapsLongAddress, houseNumber, road, landmark, latitude, longitude, houseDetails, contactPhone, contactName } = req.body;
      const address = new Address({
        hubId,
        label,
        googleMapsShortAddress,
        googleMapsLongAddress,
        house_number: houseNumber,
        road,
        landmark,
        lat: latitude,
        lng: longitude,
        bedrooms: houseDetails.bedrooms,
        bathrooms: houseDetails.bathrooms,
        balconies: houseDetails.balconies,
        contact_phone_number: contactPhone,
        contact_name: contactName,
        userId: userId
      });
      await address.save();

      const formattedAddresses = {
        id: address._id.toString(),
        userId: address.userId.toString(),
        hubId: address.hubId,
        label: address.label,
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
      }

      return reply.status(200).send({ success: true, message: "Address saved successfully", data: formattedAddresses });
    } catch (error) {
      req.server.log.error('Error saving address:', error);
      req.server.log.error(error);
      return reply.status(500).send({ error: "Failed to save address" });
    }
  }

  static async getAddress(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = req.session.userId;
      const addresses = await Address.find({ userId }).lean().exec();

      const formatedAddresses = addresses.map((address) => {
        return {
          id: address._id.toString(),
          userId: address.userId.toString(),
          hubId: address.hubId,
          label: address.label,
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
        }
      });

      return reply.status(200).send({ success: true, data: formatedAddresses });

    } catch (error) {
      req.server.log.error(error.toString());
      req.server.log.error(error);
      return reply.status(500).send({ error: "Failed to save address" });
    }
  }

  static async deleteAddress(req: FastifyRequest<{ Params: { addressId: string } }>, reply: FastifyReply) {
    try {
      const userId = req.session.userId;
      const addressId = req.params.addressId;
      const doc = await Address.findById(addressId);
      if (!doc) {
        return reply.status(404).send({ error: "Address not found" });
      }
      if (doc.userId.toString() != userId) {
        return reply.status(403).send({ error: "You are not authorized to delete this address" });
      }
      await Address.deleteOne({ _id: addressId });
      return reply.status(200).send({ success: true, message: "Address deleted successfully" });
    } catch (error) {
      req.server.log.error(error.toString());
      req.server.log.error(error);
      return reply.status(500).send({ error: "Failed to save address" });
    }
  }
}
