import crypto from 'crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Booking } from '../models/booking.model';

export async function handleRazorpayWebhook(request: FastifyRequest, reply: FastifyReply) {
  try {
    const webhookSignature = request.headers['x-razorpay-signature'] as string;
    const webhookBody = JSON.stringify(request.body);
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return reply.status(400).send({ error: 'Invalid signature' });
    }

    const { event, payload } = request.body as any;
    console.log('Razorpay webhook received:', event);

    switch (event) {
      case 'refund.processed':
        await handleRefundProcessed(payload.refund.entity,);
        break;

      case 'refund.failed':
        await handleRefundFailed(payload.refund.entity);
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }
    const booking = await Booking.findOne({
      'refund.razorpayRefundId': payload.refund.entity.id
    })
    request.server.bookingEventPublisher.publishBookingCancelled(booking);
    reply.status(200).send({ status: 'ok' });

  } catch (error) {
    console.error('Webhook processing error:', error);
    reply.status(500).send({ error: 'Webhook processing failed' });
  }
}

async function handleRefundProcessed(refundData: any) {
  try {
    console.log('Processing successful refund:', refundData.id);
    const booking = await Booking.findOneAndUpdate(
      { 'refund.razorpayRefundId': refundData.id },
      {
        'refund.status': 'processed',
        'refund.processedAt': new Date().toISOString(),
        'paymentStatus': 'refunded'
      },
      { new: true }
    );
    if (!booking) {
      console.error('Booking not found for refund ID:', refundData.id);
      return;
    }
  } catch (error) {
    console.error('Error processing refund success:', error);
  }
}

async function handleRefundFailed(refundData: any) {
  try {
    console.log('Processing failed refund:', refundData.id);

    const booking = await Booking.findOneAndUpdate(
      { 'refund.razorpayRefundId': refundData.id },
      {
        'refund.status': 'failed',
        'refund.failureReason': refundData.error_description || 'Refund processing failed'
      },
      { new: true }
    );

    if (!booking) {
      console.error('Booking not found for refund ID:', refundData.id);
      return;
    }

    // await publishEvent('refund.failed', {
    //   booking_id: booking._id.toString(),
    //   user_id: booking.user.id.toString(),
    //   refund_id: refundData.id,
    //   failure_reason: refundData.error_description || 'Refund processing failed'
    // });

    console.log('Refund failed for booking:', booking._id);

  } catch (error) {
    console.error('Error processing refund failure:', error);
  }
}