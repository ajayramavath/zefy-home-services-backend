import { FastifyReply, FastifyRequest } from "fastify";
import {
  CreateBookingRequest,
  UpdateBookingStatusRequest,
  AssignPartnerRequest,
  VerifyOTPRequest,
  UpdatePartnerLocationRequest,
  SubmitReviewRequest,
  GetBookingsQuery
} from "../schemas/booking.schema";
import { BookingsEventPublisher } from "../events/publisher";
import { Booking } from "../models/booking.model";
import { Service } from "../models/service.model";
import { Hub } from "../models/hub.model";

export class BookingController {

  static async createBooking(req: FastifyRequest<{ Body: CreateBookingRequest }>, reply: FastifyReply) {
    req.server.log.info("createBooking");
    try {
      const { sessionId, userId, role } = req.session;
      if (!sessionId || !userId || role !== 'user') {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized',
          errors: ['You are not authorized to perform this action']
        });
      }

      const bookingData = req.body;

      if (bookingData.user.id !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Forbidden',
          errors: ['User ID mismatch']
        });
      }

      const now = new Date();
      const instantDate = new Date(now.getTime() + 15 * 60 * 1000)
      const scheduledDateTime = bookingData.schedule.type === 'instant' ? instantDate : new Date(`${bookingData.schedule.date}`);
      const scheduleDate = bookingData.schedule.type === 'instant' ? instantDate.getDate().toString() : bookingData.schedule.date;
      const scheduleTime = bookingData.schedule.type === 'instant' ? instantDate.getTime.toString() : bookingData.schedule.time;
      req.server.log.info(`Booking scheduled for date: ${bookingData.schedule.date}`);

      const booking = new Booking({
        schedule: {
          date: scheduleDate,
          time: scheduleTime,
          scheduledDateTime,
          type: bookingData.schedule.type
        },
        serviceIds: bookingData.serviceIds,
        user: bookingData.user,
        hubId: bookingData.hubId,
        amount: {
          ...bookingData.amount,
          extraAmount: 0
        },
        bookingStatus: 'created',
        paymentStatus: 'pending',
        partnerStatus: 'not_assigned',
        payment: {
          baseAmountPaid: false,
          fullAmountPaid: false,
        }
      });

      const savedBooking = await booking.save();
      const populatedBooking = await Booking.findById(savedBooking._id)
        .populate('serviceIds')
        .populate('partner')
        .lean();

      reply.status(201).send({
        success: true,
        message: 'Booking created successfully',
        data: { bookingId: savedBooking._id, booking: populatedBooking }
      });

      const services = await Service.find({ serviceId: { $in: bookingData.serviceIds } });
      const hub = await Hub.findOne({ hubId: bookingData.hubId });

      setImmediate(async () => {
        // await req.server.bookingEventPublisher.publishBookingCreated(savedBooking, services);

        if (bookingData.schedule.type === 'instant') {
          req.server.log.info(`Booking ready for assignment: ${savedBooking}`);
          await req.server.bookingEventPublisher.publishBookingReadyForAssignment(savedBooking, services, hub.supervisorIds);
        }
      });

      req.server.log.info(`Booking created for user ${userId}: ${savedBooking._id}`);

      return;

    } catch (error) {
      req.server.log.error('Error creating booking:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to create booking',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async getBooking(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = req.session;
      if (!sessionId || !userId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: 'Booking not found'
        });
      }


      if (role === 'user' && booking.user.id !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Access denied'
        });
      }

      if (role === 'partner' && booking.partner?.id !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Access denied'
        });
      }

      reply.status(200).send({
        success: true,
        data: { booking }
      });

    } catch (error) {
      req.server.log.error('Error fetching booking:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to fetch booking',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async getBookings(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = req.session;
      if (!sessionId || !userId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const { id } = req.params;
      req.server.log.info(`Getting booking for id: ${id}`);

      const booking = await Booking.findById({ _id: id })
        .populate('serviceIds')
        .populate('partner')
        .lean();

      reply.status(200).send({
        success: true,
        data: {
          booking,
        }
      });

    } catch (error) {
      req.server.log.error('Error fetching bookings:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to fetch bookings',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async getUserBookings(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = req.session;

      if (!sessionId || !userId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        });
      }

      const bookings =
        await Booking.find({
          'user.id': userId
        })
          .populate('serviceIds')
          .populate('partner')
          .sort({ createdAt: -1 })
          .lean();

      req.server.log.info(`Found ${bookings.length} bookings for user ${userId}`);

      reply.status(200).send({
        success: true,
        data: {
          bookings
        }
      });

    } catch (error) {
      req.server.log.error('Error fetching bookings:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to fetch bookings'
      });
    }
  }

  static async updateBookingStatus(req: FastifyRequest<{
    Params: { id: string },
    Body: UpdateBookingStatusRequest
  }>, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = req.session;
      if (!sessionId || !userId || role !== 'hub_manager') {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized - Hub manager access required'
        });
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: 'Booking not found'
        });
      }

      const updates = req.body;
      const oldStatus = booking.bookingStatus;

      Object.assign(booking, updates);
      booking.updatedAt = new Date();

      const updatedBooking = await booking.save();

      reply.status(200).send({
        success: true,
        message: 'Booking status updated successfully',
        data: { booking: updatedBooking }
      });

      setImmediate(async () => {
        await req.server.bookingEventPublisher.publishBookingStatusUpdated(
          updatedBooking,
          oldStatus
        );
      });

    } catch (error) {
      req.server.log.error('Error updating booking status:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to update booking status',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async verifyOTP(req: FastifyRequest<{
    Params: { id: string },
    Body: VerifyOTPRequest
  }>, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = req.session;
      if (!sessionId || !userId || role !== 'partner') {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized - Partner access required'
        });
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: 'Booking not found'
        });
      }

      const { otp, type, location } = req.body;

      if (!booking.serviceDetails) {
        booking.serviceDetails = {
          startOtp: Math.floor(1000 + Math.random() * 9000).toString(),
          endOtp: Math.floor(1000 + Math.random() * 9000).toString(),
          isStartOtpVerified: false,
          isEndOtpVerified: false
        };
      }

      let isValid = false;
      let message = '';

      if (type === 'start') {
        isValid = otp === booking.serviceDetails.startOtp;
        if (isValid) {
          booking.serviceDetails.isStartOtpVerified = true;
          booking.serviceDetails.startTime = new Date();
          booking.bookingStatus = 'ongoing';
          booking.partnerStatus = 'arrived';
          message = 'Service started successfully';
        }
      } else if (type === 'end') {
        isValid = otp === booking.serviceDetails.endOtp;
        if (isValid) {
          booking.serviceDetails.isEndOtpVerified = true;
          booking.serviceDetails.endTime = new Date();

          const services = await Service.find({ _id: { $in: booking.serviceIds } });

          if (booking.serviceDetails.startTime) {
            const duration = Math.ceil(
              (booking.serviceDetails.endTime.getTime() - booking.serviceDetails.startTime.getTime()) / (1000 * 60)
            );
            booking.serviceDetails.duration = duration;
            req.server.log.info(`total service duration: ${duration}`);

            const baseDuration = services.reduce((durationSum, service) => durationSum + service.estimatedDuration, 0);
            req.server.log.info(`Base duration: ${baseDuration}`);
            const ratePerMinute = 3;
            const extraMinutes = Math.max(0, duration - baseDuration);
            req.server.log.info(`total extra minutes: ${duration}`);
            booking.amount.extraAmount = extraMinutes * ratePerMinute;

            req.server.log.info(`total extra amount: ${duration}`);
            booking.amount.totalAmount = booking.amount.baseAmount + booking.amount.extraAmount;
            req.server.log.info(`total final amount: ${duration}`);
            if (booking.amount.extraAmount == 0 && booking.amount.totalAmount == booking.amount.baseAmount) {
              booking.paymentStatus = 'fullAmountPaid';
            }
          }

          booking.bookingStatus = 'completed';
          message = 'Service completed successfully';
        }
      }

      if (!isValid) {
        return reply.status(400).send({
          success: false,
          message: 'Invalid OTP'
        });
      }

      if (location && booking.partner) {
        booking.partner.location = {
          ...location,
          lastUpdated: new Date()
        };
      }

      booking.updatedAt = new Date();
      const updatedBooking = await booking.save();

      reply.status(200).send({
        success: true,
        message,
        data: { booking: updatedBooking }
      });

      setImmediate(async () => {
        if (type === 'start') {
          await req.server.bookingEventPublisher.publishServiceStarted(updatedBooking);
        } else if (type === 'end') {
          await req.server.bookingEventPublisher.publishServiceCompleted(updatedBooking);
        }
      });

    } catch (error) {
      req.server.log.error('Error verifying OTP:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to verify OTP',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async updatePartnerLocation(req: FastifyRequest<{
    Params: { id: string },
    Body: UpdatePartnerLocationRequest
  }>, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = req.session;
      if (!sessionId || !userId || role !== 'partner') {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized - Partner access required'
        });
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.partner?.id !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Access denied - Not assigned to this booking'
        });
      }

      // Update partner location
      if (booking.partner) {
        booking.partner.location = {
          ...req.body.location,
          lastUpdated: new Date()
        };
        booking.updatedAt = new Date();

        await booking.save();
      }

      reply.status(200).send({
        success: true,
        message: 'Location updated successfully'
      });
    } catch (error) {
      req.server.log.error('Error updating partner location:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to update location',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  // Submit review (User)
  static async submitReview(req: FastifyRequest<{
    Params: { id: string },
    Body: SubmitReviewRequest
  }>, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = req.session;
      if (!sessionId || !userId || role !== 'user') {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized - User access required'
        });
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.user.id !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Access denied - Not your booking'
        });
      }

      if (booking.bookingStatus !== 'completed') {
        return reply.status(400).send({
          success: false,
          message: 'Can only review completed bookings'
        });
      }

      if (booking.review) {
        return reply.status(400).send({
          success: false,
          message: 'Review already submitted for this booking'
        });
      }

      booking.review = {
        rating: req.body.rating,
        comment: req.body.comment ?? '',
        createdAt: new Date()
      };
      booking.updatedAt = new Date();

      const updatedBooking = await booking.save();

      reply.status(200).send({
        success: true,
        message: 'Review submitted successfully',
        data: { booking: updatedBooking }
      });

      // Publish review submitted event
      setImmediate(async () => {
        await req.server.bookingEventPublisher.publishReviewSubmitted(updatedBooking);
      });

    } catch (error) {
      req.server.log.error('Error submitting review:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to submit review',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async cancelBooking(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { sessionId, userId, role } = req.session;
      if (!sessionId || !userId || role !== 'user') {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized - User access required'
        });
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.user.id !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'Access denied - Not your booking'
        });
      }

      if (['completed', 'cancelled', 'ongoing'].includes(booking.bookingStatus)) {
        return reply.status(400).send({
          success: false,
          message: 'Cannot cancel booking in current status'
        });
      }

      // Update booking status
      booking.bookingStatus = 'cancelled';
      booking.updatedAt = new Date();

      const updatedBooking = await booking.save();

      reply.status(200).send({
        success: true,
        message: 'Booking cancelled successfully',
        data: { booking: updatedBooking }
      });

      // Publish cancellation event
      setImmediate(async () => {
        await req.server.bookingEventPublisher.publishBookingCancelled(updatedBooking);
      });

    } catch (error) {
      req.server.log.error('Error cancelling booking:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to cancel booking',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async getPartnerDashboardDetails(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const completedBookings = await Booking.find({
        'partner.id': id,
        bookingStatus: 'completed',
        'serviceDetails.endTime': {
          $exists: true,
          $gte: startOfDay,
          $lt: endOfDay
        }
      })

      const totalJobs = completedBookings.length;
      const totalEarnings = completedBookings.reduce((sum, booking) => {
        return sum + (booking.amount?.totalAmount || booking.amount?.baseAmount || 0);
      }, 0);
      const recentBookings = completedBookings.slice(0, 5);
      const allServiceIds = [...new Set(
        recentBookings.flatMap(booking => booking.serviceIds || [])
      )];

      const services = await Service.find({
        serviceId: { $in: allServiceIds }
      }).select('serviceId name');

      const serviceMap = new Map();
      services.forEach(service => {
        serviceMap.set(service.serviceId, service.name);
      });

      const recentJobs = recentBookings.map(booking => ({
        bookingId: booking._id.toString(),
        services: (booking.serviceIds || []).map(serviceId =>
          serviceMap.get(serviceId) || `Unknown Service (${serviceId})`
        ),
        location: booking.user?.address?.addressString || 'Location not available',
        totalAmount: booking.amount?.totalAmount || 0,
        createdAt: booking.serviceDetails?.endTime.toISOString() || booking.updatedAt.toISOString()
      }));

      const dashboardData = {
        totalJobs,
        totalEarnings,
        recentJobs
      };

      reply.status(200).send({
        success: true,
        message: 'Partner dashboard details retrieved successfully',
        data: dashboardData
      });

    } catch (error) {
      req.server.log.error('Error cancelling booking:', error);
      reply.status(500).send({
        success: false,
        message: 'Failed to get partner dashboard details',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async getUnassignedBookings(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { adminId, role } = req.adminSession;
      if (!adminId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        })
      }
      const bookings = await Booking.find({
        'bookingStatus': "readyForAssignment"
      });

      reply.status(200).send({
        success: true,
        data: {
          bookings
        }
      })
    } catch (error) {
      req.server.log.error(error.toString());
      reply.status(500).send({
        success: false,
        message: 'Failed to getbookings',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async getPartnerCurrentBooking(req: FastifyRequest<{ Params: { id: string }, Querystring: { partnerId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { partnerId } = req.query;
      const { userId, role, sessionId } = req.session
      if (!sessionId || !userId || role !== 'partner') {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized - Partner access required'
        });
      }
      const booking = await Booking.findById(id);
      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: 'Booking not found'
        });
      }
      if ((booking.partner?.id).toString() !== partnerId) {
        return reply.status(403).send({
          success: false,
          message: 'Access denied - Not assigned to this booking'
        });
      }
      const services = await Service.find({ serviceId: { $in: booking.serviceIds } });
      const serviceDetails = services.map(service => {
        return {
          id: service._id.toString(),
          serviceId: service.serviceId,
          name: service.name,
          descrption: service.description,
          icon: service.icon,
          type: service.type,
          isPackage: service.isPackage,
          ratePerMinute: service.ratePerMinute,
          estimatedDuration: service.estimatedDuration,
          tasksIncluded: service.tasksIncluded,
          tasksExcluded: service.tasksExcluded,
          isAvailable: service.isAvailable,
        }
      });

      const addressDetails = {
        id: booking.user.address?.id,
        addressString: booking.user.address?.addressString,
        coordinates: booking.user.address?.coordinates,
        details: booking.user.address?.details,
      }
      const PartnerBookingDetails = {
        id: booking._id.toString(),
        schedule: { type: booking.schedule.type, date: booking.schedule.date, time: booking.schedule.time, scheduledDateTime: (booking.schedule.scheduledDateTime).toISOString() },
        services: serviceDetails,
        user: { id: booking.user.id, name: booking.user.name, phoneNumber: booking.user.phoneNumber, address: addressDetails },
        hubId: booking.hubId,
        amount: {
          baseAmount: booking.amount.baseAmount,
          extraAmount: booking.amount.extraAmount,
          totalAmount: booking.amount.totalAmount,
        },
        bookingStatus: booking.bookingStatus,
        partnerStatus: booking.partnerStatus,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      }

      reply.status(200).send({
        success: true,
        data: PartnerBookingDetails
      });

    } catch (error) {
      req.server.log.error(error.toString());
      reply.status(500).send({
        success: false,
        message: 'Failed to getbooking',
        errors: [error.message || 'Internal server error']
      });
    }
  }

  static async getPartnersBookings(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { userId, role } = req.session;
      const { id } = req.params;
      if (!userId || role !== 'partner') {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized - Partner access required'
        });
      }

      const bookings = await Booking.find({
        'partner.id': id
      });

      const allServiceIds = [...new Set(
        bookings.flatMap(booking => booking.serviceIds || [])
      )];

      const services = await Service.find({
        _id: { $in: allServiceIds }
      })

      const serviceMap = new Map();
      services.forEach(service => {
        serviceMap.set(service.id, {
          id: service._id.toString(),
          serviceId: service.serviceId,
          name: service.name,
          descrption: service.description,
          icon: service.icon,
          type: service.type,
          isPackage: service.isPackage,
          ratePerMinute: service.ratePerMinute,
          estimatedDuration: service.estimatedDuration,
          tasksIncluded: service.tasksIncluded,
          tasksExcluded: service.tasksExcluded,
          isAvailable: service.isAvailable,
        });
      });

      const allBookings = bookings.map(booking => {
        return {
          id: booking._id.toString(),
          schedule: { type: booking.schedule.type, date: booking.schedule.date, time: booking.schedule.time, scheduledDateTime: (booking.schedule.scheduledDateTime).toISOString() },
          services: (booking.serviceIds || []).map(serviceId => serviceMap.get(serviceId) || `Unknown Service (${serviceId})`),
          bookingStatus: booking.bookingStatus,
          partnerStatus: booking.partnerStatus,
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString(),
        }
      });

      reply.status(200).send({
        success: true,
        data: allBookings
      });


    } catch (error) {
      req.server.log.error(error.toString());
      reply.status(500).send({
        success: false,
        message: 'Failed to get bookings',
        errors: [error.message || 'Internal server error']
      });
    }
  }
}