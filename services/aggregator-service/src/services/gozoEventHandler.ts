import { FastifyInstance } from "fastify";
import { BookingModel } from "../models/Booking.model"; // adjust import path
import { Types } from "mongoose";

export async function handleGozoEvent(
  type: string,
  data: any,
  app?: FastifyInstance
) {
  const bookingId = data.orderRefId?.trim();
  if (!bookingId) return;

  const statusMap: Record<string, string> = {
    tripstart: "started",
    tripend: "completed",
    noshow: "canceled",
    arrived: "arrived",
    leftforpickup: "leftforpickup",
    tripcancel: "canceled",
  };

  const redisPayload = {
    type: statusMap[type],
    data,
    timestamp: Date.now(),
  };

  if (app?.redis) {
    await app.redis.publish(
      `booking-updates:${bookingId}`,
      JSON.stringify(redisPayload)
    );
  }

  if (type in statusMap) {
    await BookingModel.findOneAndUpdate(
      { universalBookingId: bookingId },
      { $set: { status: statusMap[type] } }
    );
  }

  if (type === "cabdriverupdate") {
    const { driver, car, otp } = data;
    await BookingModel.findOneAndUpdate(
      { universalBookingId: bookingId },
      {
        $set: {
          otp: otp,
          driverDetails: {
            name: driver?.name,
            phoneNumber: driver?.contact?.number?.toString(),
          },
          assignedVehicle: car,
        },
      }
    );
  }

  if (type === "updatelastlocation") {
    const coords = data.tripdata?.coordinates;
    if (!coords) return;

    await BookingModel.findOneAndUpdate(
      { universalBookingId: bookingId },
      {
        $push: {
          rideStatusUpdates: {
            status: "locationUpdate",
            timestamp: new Date(),
            assignedTo: null,
          },
        },
      }
    );
  }
}
