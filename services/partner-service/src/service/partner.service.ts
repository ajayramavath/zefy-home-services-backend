import { FastifyInstance } from "fastify";
import { Partner } from "../models/partner.model";
import { PartnerStats } from "../models/partnerStats.model";
import { Availability } from "../models/availability.model";

export interface PartnerBookingAssignment {
  bookingId: string;
  userLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  scheduledDateTime: string;
  serviceIds: string[];
  status: string;
  assignedAt: string;
}

export class PartnerService {
  constructor(private fastify: FastifyInstance) { }

  async assignBooking(partnerId: string, bookingAssignment: PartnerBookingAssignment): Promise<void> {
    try {
      const availability = await Availability.findOne({ partnerId: partnerId });
      if (!availability) {
        return;
      }
      this.fastify.log.info(`---------------------------> Booking ${bookingAssignment.bookingId} assigned to partner ${partnerId}`);
      availability.currentBookingId = bookingAssignment.bookingId;
      availability.status = 'ASSIGNED';
      await availability.save();

      this.fastify.log.info(`Booking ${bookingAssignment.bookingId} assigned to partner ${partnerId}`);
    } catch (error) {
      this.fastify.log.error(`Error assigning booking to partner: ${error.message}`);
      throw error;
    }
  }

  async getPartnerCurrentBooking(partnerId: string): Promise<String | null> {
    try {

      const availability = await Availability.findOne({ partnerId: partnerId });
      return availability.currentBookingId || null;

    } catch (error) {
      this.fastify.log.error(`Error getting partner current booking: ${error.message}`);
      throw error;
    }
  }

  async updatePartnerLocation(partnerId: string, location: { lat: number; lng: number }): Promise<void> {
    try {
      await Availability.updateOne(
        { partnerId: partnerId },
        {
          $set: {
            location: {
              coordinates: [location.lat, location.lng],
              updatedAt: new Date()
            }
          }
        }
      );

      this.fastify.log.info(`Partner ${partnerId} location updated`);
    } catch (error) {
      this.fastify.log.error(`Error updating partner location: ${error.message}`);
      throw error;
    }
  }

  async updatePartnerStatus(partnerId: string, status: string): Promise<void> {
    try {
      await Availability.updateOne(
        { partnerId: partnerId },
        {
          $set: {
            status,
            lastActiveAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      this.fastify.log.info(`Partner ${partnerId} status updated to: ${status}`);
    } catch (error) {
      this.fastify.log.error(`Error updating partner status: ${error.message}`);
      throw error;
    }
  }
}