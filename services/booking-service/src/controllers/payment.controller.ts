import { FastifyRequest, FastifyReply } from 'fastify';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Booking } from '../models/booking.model';
import { Service } from '../models/service.model';
import { Hub } from '../models/hub.model';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

interface CreateOrderBody {
  amount: number;
  currency?: string;
  userId: string;
  paymentType: 'base' | 'extra';
}

interface VerifyPaymentBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  paymentType: 'base' | 'extra';
  bookingId?: string;
}

export class PaymentController {

  static async createOrder(request: FastifyRequest<{ Body: CreateOrderBody }>, reply: FastifyReply) {
    try {
      const { amount, currency = 'INR', userId, paymentType } = request.body;

      if (!amount || !userId || !paymentType) {
        return reply.status(400).send({
          success: false,
          message: 'Amount, bookingId, paymentType and userId are required'
        });
      }

      request.server.log.info(`receipt_${Date.now()}`);

      const options = {
        amount: amount * 100,
        currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
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
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentType, bookingId } = request.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentType) {
        return reply.status(400).send({
          success: false,
          message: 'All payment verification fields are required'
        });
      }

      if (paymentType === 'extra' && !bookingId) {
        return reply.status(400).send({
          success: false,
          message: 'Booking ID is required for full amount payment'
        });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest('hex');

      const isSignatureValid = expectedSignature === razorpay_signature;

      if (!isSignatureValid) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid payment signature'
        });
      }

      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      if (paymentType === 'extra') {
        const updatedBooking = await Booking.updateOne({ _id: bookingId }, {
          $set: {
            paymentStatus: 'fullAmountPaid',
            payment: {
              fullAmountPaid: true,
              fullAmountPayment: {
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id
              }
            }
          }
        }).populate('serviceIds')
          .populate('feedback')
          .lean();

        return reply.send({
          success: true,
          message: 'Payment verified successfully',
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          paymentType,
          status: payment.status,
          amount: (payment.amount as any) / 100,
          updatedBooking
        });
      }

      return reply.send({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        paymentType,
        status: payment.status,
        amount: (payment.amount as any) / 100,
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


  static async cancelBooking(req: FastifyRequest<{ Params: { bookingId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = req.session;
      if (!sessionId || !userId || role !== 'user') {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized - User access required'
        });
      }

      const booking = await Booking.findOne({
        _id: req.params.bookingId,
        'user.id': userId
      });
      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.paymentStatus !== 'baseAmountPaid' && booking.paymentStatus !== 'fullAmountPaid') {
        return reply.status(400).send({
          error: 'No payment found to refund'
        });
      }

      if (booking.refund && booking.refund.status == 'processed') {
        return reply.status(400).send({
          error: 'This booking refund already exists'
        });
      }

      if (booking.refund.status === 'initiated') {
        return reply.status(400).send({
          error: 'Refund is already in progress for this booking'
        });
      }

      if (['completed', 'cancelled', 'ongoing'].includes(booking.bookingStatus)) {
        return reply.status(400).send({
          success: false,
          message: 'Cannot cancel booking in current status'
        });
      }

      if (booking.bookingStatus != 'readyForAssignment' && booking.bookingStatus != 'created') {
        booking.bookingStatus = 'cancelled_without_refund';
        booking.updatedAt = new Date();
        await booking.save()

        const updatedBooking = await Booking.findById(booking._id)
          .populate('serviceIds')
          .populate('feedback')
          .lean();

        return reply.status(200).send({
          success: true,
          message: 'Booking cancelled without refund. No refund required',
          data: updatedBooking
        });
      }

      const paymentIdToRefund = booking.payment.baseAmountPayment.razorpayPaymentId;
      if (!paymentIdToRefund) {
        return reply.status(400).send({
          error: 'Payment ID not found for refund'
        });
      }
      const refundResponse = await razorpay.payments.refund(paymentIdToRefund, {
        speed: 'optimum',
        notes: {
          booking_id: booking._id,
          user_id: userId,
          reason: 'Booking cancelled before service started'
        },
        receipt: `refund_${booking._id}}`
      });

      booking.bookingStatus = 'cancelled_with_refund';
      booking.updatedAt = new Date();
      booking.refund = {
        razorpayRefundId: refundResponse.id,
        amount: refundResponse.amount,
        status: 'initiated',
        initiatedAt: new Date().toISOString()
      }

      await booking.save();

      const updatedBooking = await Booking.findById(booking._id)
        .populate('serviceIds')
        .populate('feedback')
        .lean();

      reply.status(200).send({
        success: true,
        message: 'Booking cancelled successfully',
        data: updatedBooking
      });

      setImmediate(async () => {
        await req.server.bookingEventPublisher.publishBookingCancelled(updatedBooking);
      });

    } catch (error) {
      req.server.log.error(error);
      reply.status(500).send({
        success: false,
        message: 'Failed to cancel booking',
        errors: [error.message || 'Internal server error']
      });
    }
  }
}