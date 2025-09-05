import { FastifyInstance } from "fastify";
import { BookingController } from "../controllers/booking.controller";

export async function bookingRoutes(fastify: FastifyInstance) {
  fastify.post("/createBooking", BookingController.createBooking);

  fastify.get("/getBookings/:id", BookingController.getBookings);

  fastify.post("/bookings/:id/status", BookingController.updateBookingStatus);

  fastify.post("/bookings/:id/verifyOtp", BookingController.verifyOTP);

  fastify.get('/getUserBookings', BookingController.getUserBookings);

  fastify.get('/partnerDashboard/:id', BookingController.getPartnerDashboardDetails);

  fastify.get('/partner/bookings/:id', BookingController.getPartnersBookings);

  fastify.get('/getUnassignedBookings', BookingController.getUnassignedBookings);

  fastify.get('/getPartnerCurrentBooking/:id', BookingController.getPartnerCurrentBooking);
}