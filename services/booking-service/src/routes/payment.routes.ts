import { FastifyInstance } from "fastify";
import { PaymentController } from "../controllers/payment.controller";

export async function paymentRoutes(fastify: FastifyInstance) {
  const createOrderSchema = {
    body: {
      type: 'object',
      required: ['amount', 'bookingId', 'userId'],
      properties: {
        amount: { type: 'number', minimum: 1 },
        currency: { type: 'string', default: 'INR' },
        receipt: { type: 'string' },
        bookingId: { type: 'string' },
        userId: { type: 'string' },
        paymentType: { type: 'string', enum: ['base', 'extra'] },
      },
    },
  };

  const verifyPaymentSchema = {
    body: {
      type: 'object',
      required: ['razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'bookingId'],
      properties: {
        razorpay_order_id: { type: 'string' },
        razorpay_payment_id: { type: 'string' },
        razorpay_signature: { type: 'string' },
        bookingId: { type: 'string' },
        paymentType: { type: 'string', enum: ['base', 'extra'] },
      },
    },
  };

  fastify.post('/create-order', {
    schema: createOrderSchema,
    handler: PaymentController.createOrder,
  });

  fastify.post('/verify', {
    schema: verifyPaymentSchema,
    handler: PaymentController.verifyPayment,
  });

  fastify.get('/status/:paymentId', {
    handler: PaymentController.getPaymentStatus,
  });
}