import { FastifyInstance } from "fastify";
import { BookingController } from "../controllers/booking.controller";
import { PaymentController } from "../controllers/payment.controller";
import { handleRazorpayWebhook } from "../controllers/webhook.controller";

export async function bookingRoutes(fastify: FastifyInstance, options: { bookingController: BookingController }) {
  const { bookingController } = options;

  fastify.post("/createBooking", BookingController.createBooking);

  fastify.get("/getBookings/:id", BookingController.getBookings);

  fastify.post("/bookings/:id/status", BookingController.updateBookingStatus);

  fastify.post("/bookings/:id/verifyOtp", BookingController.verifyOTP);

  fastify.get('/getUserBookings', BookingController.getUserBookings);

  fastify.get('/partnerDashboard/:id', BookingController.getPartnerDashboardDetails);

  fastify.get('/partner/bookings/:id', BookingController.getPartnersBookings);

  fastify.get('/getUnassignedBookings', BookingController.getUnassignedBookings);

  fastify.get('/getPartnerCurrentBooking/:id', BookingController.getPartnerCurrentBooking);

  fastify.post('/submitFeedback/:bookingId', BookingController.submitFeedback);

  fastify.get('/partnerFeedbacks/:partneId', BookingController.getPartnerFeedbacks);

  fastify.post('/cancelBooking/:bookingId', PaymentController.cancelBooking);

  fastify.post('/createRecurringPattern', bookingController.createRecurringPattern.bind(bookingController));

  fastify.post('/updateRecurringPatternStatus/:recurringPatternId', bookingController.updateRecurringPatternStatus.bind(bookingController));

  fastify.get('/getRecurringPatternBookings/:recurringPatternId', BookingController.getRecurringPatternBookings);

  fastify.get('/getAllRecurringPatternsWithBookings', BookingController.getAllRecurringPatternsWithBookings);

  fastify.post('/webhooks/razorpay/cancellation', {
    preHandler: async (request, reply) => {
      reply.header('ngrok-skip-browser-warning', 'true');
    },
    config: {
      rawBody: true
    }
  }, handleRazorpayWebhook);
}