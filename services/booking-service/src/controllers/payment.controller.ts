import { FastifyRequest, FastifyReply } from 'fastify';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Booking } from '../models/booking.model';
import { Service } from '../models/service.model';
import { Hub } from '../models/hub.model';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID_TEST!,
  key_secret: process.env.RAZORPAY_KEY_SECRET_TEST!,
});

interface CreateOrderBody {
  amount: number;
  currency?: string;
  receipt?: string;
  bookingId: string;
  userId: string;
  paymentType: 'base' | 'extra';
}

interface VerifyPaymentBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId: string;
  paymentType: 'base' | 'extra';
}

export class PaymentController {
  static async createOrder(request: FastifyRequest<{ Body: CreateOrderBody }>, reply: FastifyReply) {
    try {
      const { amount, currency = 'INR', receipt, bookingId, userId, paymentType } = request.body;

      if (!amount || !bookingId || !userId || !paymentType) {
        return reply.status(400).send({
          success: false,
          message: 'Amount, bookingId, paymentType and userId are required'
        });
      }

      request.server.log.info(`receipt_${Date.now()}`);

      const options = {
        amount: amount * 100,
        currency,
        receipt: receipt || `receipt_${bookingId}_${paymentType}`,
        notes: {
          bookingId,
          userId,
          paymentType
        },
      };

      const order = await razorpay.orders.create(options);

      console.log('Razorpay order created:', order.id);

      return reply.send({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        order: order,
      });
    } catch (error) {
      console.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to create payment order',
        error: error,
      });
    }
  }

  static async verifyPayment(request: FastifyRequest<{ Body: VerifyPaymentBody }>, reply: FastifyReply) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, paymentType } = request.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId || !paymentType) {
        return reply.status(400).send({
          success: false,
          message: 'All payment verification fields are required'
        });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET_TEST!)
        .update(body.toString())
        .digest('hex');

      const isSignatureValid = expectedSignature === razorpay_signature;

      if (!isSignatureValid) {
        console.log('Invalid payment signature for booking:', bookingId);
        return reply.status(400).send({
          success: false,
          message: 'Invalid payment signature'
        });
      }

      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      console.log('Payment verified successfully:', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        bookingId,
        status: payment.status
      });

      await PaymentController.updateBookingPaymentStatus(bookingId, paymentType, razorpay_payment_id);

      reply.send({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        paymentType,
        status: payment.status,
        amount: (payment.amount as any) / 100,
      });

      setImmediate(async () => {
        const bookingData = await Booking.findById(bookingId);
        if (bookingData.schedule.type === 'instant') {
          const services = await Service.find({ serviceId: { $in: bookingData.serviceIds } });
          const hub = await Hub.findOne({ hubId: bookingData.hubId });
          request.server.log.info(`Booking ready for assignment: ${bookingData}`);
          await request.server.bookingEventPublisher.publishBookingReadyForAssignment(bookingData, services, hub.supervisorIds);
        }
      });

    } catch (error) {
      console.error('Error verifying payment:', error);
      return reply.status(500).send({
        success: false,
        message: 'Payment verification failed',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  }

  static async updateBookingPaymentStatus(bookingId: string, paymentType: 'base' | 'extra', paymentId: string) {
    try {
      if (paymentType === 'extra') {
        await Booking.updateOne({ _id: bookingId }, { $set: { paymentStatus: 'fullAmountPaid', payment: { fullAmountPaid: true, fullAmountPaymentId: paymentId } } });
        return;
      } else {
        await Booking.updateOne({ _id: bookingId }, { $set: { paymentStatus: 'baseAmountPaid', bookingStatus: 'readyForAssignment', payment: { baseAmountPaid: true, baseAmountPaymentId: paymentId } } });
        return;
      }

    } catch (error) {
      console.error(error.toString());
    }
  }

  static async getPaymentStatus(request: FastifyRequest<{ Params: { paymentId: string } }>, reply: FastifyReply) {
    try {
      const { paymentId } = request.params;

      const payment = await razorpay.payments.fetch(paymentId);

      return reply.send({
        success: true,
        payment: {
          id: payment.id,
          amount: (payment.amount as any) / 100,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          createdAt: payment.created_at,
        },
      });
    } catch (error) {
      console.error('Error fetching payment status:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to fetch payment status',
      });
    }
  }
}