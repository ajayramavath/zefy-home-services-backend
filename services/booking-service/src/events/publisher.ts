import { BookingPartnerLocationUpdatedEvent, EventPublisher } from "@zf/common";
import {
  BookingCreatedEvent,
  BookingStatusUpdatedEvent,
  BookingReadyForAssignmentEvent,
  BookingPartnerAssignedEvent,
  ServiceStartedEvent,
  ServiceCompletedEvent,
  BookingCancelledEvent,
  PartnerLocationUpdatedEvent,
  ReviewSubmittedEvent
} from "@zf/common";
import { FastifyInstance } from "fastify";
import { IBooking, IFeedback, IService } from "@zf/types";

export class BookingsEventPublisher extends EventPublisher {
  constructor(fastify: FastifyInstance) {
    super(fastify);
  }

  async publishBookingCreated(booking: IBooking, services: IService[]): Promise<void> {
    const serviceDetails = services.map(service => ({
      serviceId: service.serviceId,
      serviceName: service.name,
      serviceType: service.type,
      price: service.ratePerMinute
    }))
    const event: BookingCreatedEvent = {
      eventType: 'BOOKING_CREATED',
      data: {
        bookingId: booking._id,
        userId: booking.user.id,
        hubId: booking.hubId,
        serviceDetails: serviceDetails,
        addressDetails: {
          fullAddress: booking.user.address.addressString,
          coordinates: {
            latitude: booking.user.address.coordinates.lat,
            longitude: booking.user.address.coordinates.lng
          },
          houseDetails: {
            bedrooms: booking.user.address.details.bedrooms,
            bathrooms: booking.user.address.details.bathrooms,
            balconies: booking.user.address.details.balconies,
          },
          hubId: booking.hubId,
        },
        schedulingInfo: {
          type: booking.schedule.type,
          scheduledDate: booking.schedule.scheduledDateTime.toISOString()
        },
        amount: {
          baseAmount: booking.amount.baseAmount,
          totalAmount: booking.amount.totalAmount
        },
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'booking.created');
    this.fastify.log.info(`Published booking created event: ${booking._id}`);
  }

  async publishBookingReadyForAssignment(booking: IBooking, services: IService[], supervisorIds: string[]): Promise<void> {
    const serviceDetails = services.map(service => ({
      serviceId: service.serviceId,
      serviceName: service.name,
      serviceType: service.type,
      price: service.ratePerMinute
    }))
    const event: BookingReadyForAssignmentEvent = {
      eventType: 'BOOKING_READY_FOR_ASSIGNMENT',
      data: {
        bookingId: booking._id,
        supervisorIds,
        hubId: booking.hubId,
        userId: booking.user.id,
        serviceDetails: serviceDetails,
        addressDetails: {
          fullAddress: booking.user.address.addressString,
          coordinates: {
            latitude: booking.user.address.coordinates.lat,
            longitude: booking.user.address.coordinates.lng
          },
          houseDetails: {
            bedrooms: booking.user.address.details.bedrooms,
            bathrooms: booking.user.address.details.bathrooms,
            balconies: booking.user.address.details.balconies,
          },
          hubId: booking.hubId,
        },
        schedulingInfo: {
          type: booking.schedule.type,
          scheduledDate: booking.schedule.scheduledDateTime.toISOString()
        },
        amount: {
          baseAmount: booking.amount.baseAmount,
          totalAmount: booking.amount.totalAmount
        },
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'booking.ready_for_assignment');
    this.fastify.log.info(`Published booking ready for assignment event: ${booking._id}`);
  }

  async publishBookingStatusUpdated(booking: IBooking, previousStatus: string): Promise<void> {
    const event: BookingStatusUpdatedEvent = {
      eventType: 'BOOKING_STATUS_UPDATED',
      data: {
        bookingId: booking._id,
        userId: booking.user.id,
        partnerId: booking.partner?.id,
        previousStatus,
        newStatus: booking.bookingStatus,
        partnerStatus: booking.partnerStatus,
        paymentStatus: booking.paymentStatus,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'booking.status.updated');
    this.fastify.log.info(`Published booking status updated event: ${booking._id} (${previousStatus} → ${booking.bookingStatus})`);

    // Note: Using HTTP polling instead of WebSockets
    // User app will poll based on booking status:
    // - tracking: 5 second intervals
    // - ongoing: 60 second intervals
    // - other states: no polling needed
  }

  async publishBookingPartnerLocationUpdated(booking: IBooking, partnerId: string, location: { latitude: number; longitude: number }): Promise<void> {
    const event: BookingPartnerLocationUpdatedEvent = {
      eventType: 'BOOKING_PARTNER_LOCATION_UPDATED',
      data: {
        bookingId: booking._id,
        userId: booking.user.id,
        partnerId,
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      }
    }
    this.fastify.log.info(`Published booking partner location updated event: ${booking._id} → ${booking.partner!.id}`);
    await this.publish(event, 'booking.partner.location.updated');
  }

  async publishPartnerAssigned(booking: IBooking, partnerUserId: string): Promise<void> {

    const event: BookingPartnerAssignedEvent = {
      eventType: 'BOOKING_PARTNER_ASSIGNED',
      data: {
        bookingId: booking._id,
        userId: booking.user.id,
        partnerId: booking.partner!.id,
        partnerUserId,
        partnerDetails: {
          id: booking.partner.id,
          name: booking.partner!.name,
          phoneNumber: booking.partner!.phoneNumber,
          photoUrl: booking.partner!.photoUrl,
          bookingsCount: booking.partner!.bookingsCount,
          feedbacks: booking.partner!.feedbacks,
        },
        userLocation: {
          latitude: booking.user.address.coordinates.lat,
          longitude: booking.user.address.coordinates.lng,
          address: booking.user.address.addressString
        },
        scheduledDateTime: booking.schedule.scheduledDateTime.toISOString(),
        serviceIds: booking.serviceIds,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'booking.partner.assigned');
    this.fastify.log.info(`Published partner assigned event: ${booking._id} → ${booking.partner!.id}`);

    // Note: Client apps will detect partner assignment via HTTP polling
    // User app will start polling every 5 seconds when status becomes 'tracking'
    // Partner app will receive assignment notification via partner service polling
  }

  async publishServiceStarted(booking: IBooking): Promise<void> {
    const event: ServiceStartedEvent = {
      eventType: 'SERVICE_STARTED',
      data: {
        bookingId: booking._id,
        userId: booking.user.id,
        partnerId: booking.partner!.id,
        startTime: booking.serviceDetails!.startTime!.toISOString(),
        location: booking.partner?.location ? {
          latitude: booking.partner.location.lat,
          longitude: booking.partner.location.lng
        } : undefined,
        serviceIds: booking.serviceIds,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'service.started');
    this.fastify.log.info(`Published service started event: ${booking._id}`);
  }

  async publishServiceCompleted(booking: IBooking): Promise<void> {
    const event: ServiceCompletedEvent = {
      eventType: 'SERVICE_COMPLETED',
      data: {
        bookingId: booking._id,
        userId: booking.user.id,
        partnerId: booking.partner!.id,
        startTime: booking.serviceDetails!.startTime!.toISOString(),
        endTime: booking.serviceDetails!.endTime!.toISOString(),
        duration: booking.serviceDetails!.duration!,
        finalAmount: {
          baseAmount: booking.amount.baseAmount,
          extraAmount: booking.amount.extraAmount,
          totalAmount: booking.amount.totalAmount
        },
        serviceIds: booking.serviceIds,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'service.completed');
    this.fastify.log.info(`Published service completed event: ${booking._id}`);
  }

  async publishBookingCancelled(booking: IBooking): Promise<void> {
    const event: BookingCancelledEvent = {
      eventType: 'BOOKING_CANCELLED',
      data: {
        bookingId: booking._id,
        userId: booking.user.id,
        partnerId: booking.partner?.id,
        reason: 'User cancelled', // You might want to add reason to the booking model
        cancelledAt: booking.updatedAt.toISOString(),
        refundAmount: booking.amount.totalAmount, // Calculate actual refund amount
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'booking.cancelled');
    this.fastify.log.info(`Published booking cancelled event: ${booking._id}`);

    // Note: Apps will detect cancellation via HTTP polling
    // Both user and partner apps will stop polling when status becomes 'cancelled'
  }

  async publishReviewSubmitted(booking: IBooking, feedBack: IFeedback): Promise<void> {
    const event: ReviewSubmittedEvent = {
      eventType: 'REVIEW_SUBMITTED',
      data: {
        bookingId: booking._id,
        user: {
          id: feedBack.user.id,
          name: feedBack.user.name,
          profilePhoto: feedBack.user.profilePhoto
        },
        partnerId: feedBack.partnerId,
        rating: feedBack.rating,
        comment: feedBack.comment,
        serviceIds: booking.serviceIds,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(event, 'review.submitted');
    this.fastify.log.info(`Published review submitted event: ${booking._id}`);

    // Note: Partner will see review via their normal app polling/refresh
    // No immediate real-time notification needed for reviews
  }

  // Add method to get recommended polling interval based on booking status
  getPollingInterval(bookingStatus: string): number {
    switch (bookingStatus) {
      case 'tracking':
        return 5; // 5 seconds for active tracking
      case 'ongoing':
        return 60; // 60 seconds during service
      case 'completed':
      case 'cancelled':
        return 0; // stop polling
      default:
        return 30; // default 30 seconds for other states
    }
  }
}