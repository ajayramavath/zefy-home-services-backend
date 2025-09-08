import * as cron from 'node-cron';
import { Booking } from '../models/booking.model';
import { EventPublisher } from '@zf/common';
import { Types } from 'mongoose';
import { RecurringPattern } from '../models/recurringPattern.model';

export class SchedulerService {
  private eventPublisher: EventPublisher;
  private schedulerTask: cron.ScheduledTask | null = null;
  private recurringTask: cron.ScheduledTask | null = null;

  constructor(eventPublisher: EventPublisher) {
    this.eventPublisher = eventPublisher;
  }

  async initialize() {
    console.log('Initializing Scheduler Service...');

    this.schedulerTask = cron.schedule('*/2 * * * *', async () => {
      await this.processScheduledBookings();
    });

    this.recurringTask = cron.schedule('0 * * * *', async () => {
      await this.processRecurringPatterns();
    });

    await this.processScheduledBookings();
    await this.processRecurringPatterns();

    console.log('Scheduler Service initialized successfully');
  }

  private async processScheduledBookings() {
    try {
      const now = new Date();
      const assignmentBuffer = 60 * 60 * 1000;
      const readyTime = new Date(now.getTime() + assignmentBuffer);

      const readyBookings = await Booking.find({
        'schedule.type': 'scheduled',
        'schedule.scheduledDateTime': { $lte: readyTime },
        bookingStatus: 'created',
        paymentStatus: { $in: ['baseAmountPaid', 'fullAmountPaid'] }
      }).sort({ 'schedule.scheduledDateTime': 1 });

      console.log(`Found ${readyBookings.length} bookings ready for assignment`);

      for (const booking of readyBookings) {
        await this.makeBookingReadyForAssignment(booking);
      }

    } catch (error) {
      console.error('Error processing scheduled bookings:', error);
    }
  }

  private async processRecurringPatterns() {
    try {
      console.log('Processing recurring patterns...');

      const activePatterns = await RecurringPattern.find({
        status: 'active',
        nextScheduleDate: { $lte: new Date() }
      });

      console.log(`Found ${activePatterns.length} patterns ready for processing`);

      for (const pattern of activePatterns) {
        await this.createBookingsFromPattern(pattern);
      }

    } catch (error) {
      console.error('Error processing recurring patterns:', error);
    }
  }

  private async createBookingsFromPattern(pattern: any) {
    try {
      const now = new Date();
      const nextBookingDateTime = this.calculateNextBookings(pattern, now);

      const existingBooking = await Booking.findOne({
        'metadata.parentRecurringId': pattern._id,
        'schedule.scheduledDateTime': nextBookingDateTime
      });

      if (existingBooking) {
        console.log(`Booking already exists for pattern ${pattern._id} at ${nextBookingDateTime}`);
        const nextCheckDate = this.calculateNextCheckDate(pattern);
        pattern.nextScheduleDate = nextCheckDate;
        await pattern.save();
        return;
      }

      const newBooking = new Booking({
        schedule: {
          type: 'scheduled',
          date: nextBookingDateTime.toISOString().split('T')[0],
          time: pattern.schedule.time,
          scheduledDateTime: nextBookingDateTime
        },
        serviceIds: pattern.serviceIds,
        user: {
          id: pattern.userId,
          address: pattern.address
        },
        hubId: pattern.hubId,
        bookingStatus: 'created',
        paymentStatus: 'pending',
        metadata: {
          isRecurring: false,
          parentRecurringId: pattern._id
        }
      });

      await newBooking.save();
      pattern.createdBookings += 1;

      console.log(`Created recurring booking ${newBooking._id} for ${nextBookingDateTime}`);

      // await this.eventPublisher.publishEvent({
      //   type: 'notification.send',
      //   data: {
      //     userId: pattern.userId,
      //     type: 'recurring_booking_created',
      //     title: 'New Recurring Service Scheduled',
      //     message: `Your ${pattern.type} service is scheduled for ${bookingDateTime.toDateString()} at ${pattern.schedule.time}`,
      //     data: {
      //       bookingId: newBooking._id,
      //       scheduledDateTime: bookingDateTime,
      //       patternType: pattern.type,
      //       paymentRequired: true
      //     }
      //   }
      // })

      const nextCheckDate = this.calculateNextCheckDate(pattern);
      pattern.nextScheduleDate = nextCheckDate;

      await pattern.save();

    } catch (error) {
      console.error(`Error creating bookings from pattern ${pattern._id}:`, error);
    }
  }

  private calculateNextBookings(pattern: any, fromDate: Date): Date {
    for (let i = 1; i <= 30; i++) {
      const checkDate = new Date(fromDate);
      checkDate.setDate(checkDate.getDate() + i);
      if (this.dateMatchesPattern(checkDate, pattern)) {
        const [hours, minutes] = pattern.schedule.time.split(':').map(Number);
        checkDate.setHours(hours, minutes, 0, 0);
        if (checkDate > fromDate) {
          return checkDate;
        }
      }
    }
    return null;
  }

  private dateMatchesPattern(date: Date, pattern: any): boolean {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    switch (pattern.type) {
      case 'daily':
        return true;

      case 'weekly':
        const todayName = dayNames[date.getDay()];
        return pattern.schedule.daysOfWeek.includes(todayName);

      case 'monthly':
        const todayDate = date.getDate();
        return pattern.schedule.datesOfMonth.includes(todayDate);
    }
    return false;
  }


  private calculateNextCheckDate(pattern: any): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private async makeBookingReadyForAssignment(booking: any) {
    try {
      booking.bookingStatus = 'readyForAssignment';
      await booking.save();

      console.log(`Booking ${booking._id} is now ready for assignment`);

      // await this.eventPublisher.publishEvent({
      //   type: 'booking.ready_for_assignment',
      //   data: {
      //     bookingId: booking._id.toString(),
      //     userId: booking.user.id.toString(),
      //     hubId: booking.hubId,
      //     services: booking.serviceIds,
      //     scheduledDateTime: booking.schedule.scheduledDateTime,
      //     userLocation: {
      //       lat: booking.user.address.coordinates.lat,
      //       lng: booking.user.address.coordinates.lng
      //     },
      //     timeSlot: {
      //       date: booking.schedule.date,
      //       time: booking.schedule.time
      //     },
      //     urgencyLevel: 'normal',
      //     isScheduled: true
      //   }
      // });

      // await this.eventPublisher.publishEvent({
      //   type: 'notification.send',
      //   data: {
      //     userId: booking.user.id,
      //     type: 'assignment_started',
      //     title: 'Finding Your Service Partner',
      //     message: `We're finding the best partner for your ${booking.schedule.time} appointment.`,
      //     data: {
      //       bookingId: booking._id,
      //       scheduledTime: booking.schedule.scheduledDateTime
      //     }
      //   }
      // });

    } catch (error) {
      console.error(`Error making booking ${booking._id} ready for assignment:`, error);
    }
  }


  async createRecurringPattern(patternData: {
    userId: string;
    type: 'daily' | 'weekly' | 'monthly';
    schedule: {
      time: string;
      daysOfWeek?: string[];
      datesOfMonth?: number[];
    };
    serviceIds: string[];
    address: any;
    hubId: string;
  }) {

    const pattern = new RecurringPattern({
      ...patternData,
      userId: patternData.userId,
      serviceIds: patternData.serviceIds.map(id => new Types.ObjectId(id)),
      nextScheduleDate: new Date(),
      status: 'active',
      createdBookings: 0
    });

    await pattern.save();
    console.log(`Created recurring pattern ${pattern._id}`);

    await this.processRecurringPatterns();
    return pattern;
  }

  async pausePattern(patternId: string, userId: string) {
    const result = await RecurringPattern.findOneAndUpdate(
      { _id: new Types.ObjectId(patternId), userId: new Types.ObjectId(userId) },
      { status: 'paused' },
      { new: true }
    );

    if (result) {
      console.log(`Paused recurring pattern ${patternId}`);
    }

    return result;
  }

  async resumePattern(patternId: string, userId: string) {
    const result = await RecurringPattern.findOneAndUpdate(
      { _id: new Types.ObjectId(patternId), userId: new Types.ObjectId(userId) },
      {
        status: 'active',
        nextScheduleDate: new Date()
      },
      { new: true }
    );

    if (result) {
      console.log(`Resumed recurring pattern ${patternId}`);
    }

    return result;
  }

  async cancelPattern(patternId: string, userId: string) {
    const result = await RecurringPattern.findOneAndUpdate(
      { _id: new Types.ObjectId(patternId), userId: new Types.ObjectId(userId) },
      { status: 'cancelled' },
      { new: true }
    );

    if (result) {
      console.log(`Cancelled recurring pattern ${patternId}`);
    }

    return result;
  }

  async getUserPatterns(userId: string) {
    return await RecurringPattern.find({
      userId: new Types.ObjectId(userId),
      status: { $in: ['active', 'paused'] }
    }).sort({ createdAt: -1 });
  }

  async getUpcomingScheduledBookings(userId: string, days: number = 7) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

    return await Booking.find({
      'user.id': new Types.ObjectId(userId),
      'schedule.type': 'scheduled',
      'schedule.scheduledDateTime': { $gte: now, $lte: futureDate },
      bookingStatus: { $ne: 'cancelled' },
      'metadata.isTemplate': { $ne: true }
    }).sort({ 'schedule.scheduledDateTime': 1 });
  }

  async processNow() {
    console.log('Manual trigger: Processing scheduler...');
    await this.processScheduledBookings();
    await this.processRecurringPatterns();
  }

  getStatus() {
    return {
      schedulerRunning: this.schedulerTask !== null,
      recurringProcessorRunning: this.recurringTask !== null,
      lastProcessTime: new Date()
    };
  }

  destroy() {
    if (this.schedulerTask) {
      this.schedulerTask.destroy();
      this.schedulerTask = null;
    }
    if (this.recurringTask) {
      this.recurringTask.destroy();
      this.recurringTask = null;
    }
    console.log('Scheduler Service destroyed');
  }
}