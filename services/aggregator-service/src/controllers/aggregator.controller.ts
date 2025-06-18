import { FastifyReply, FastifyRequest } from "fastify";
import mongoose from "mongoose";
import AggregatorAccountModel from "../models/AggregatorAccount.model";

import { FareRequest, FareResponse, BookingDetailsBody } from "@zf/types"; // or '@ms/types'
import {
  CreateBookingRequest,
  BookingResult,
  BookingDetailsResult,
  CancellationReason,
  CancelBookingRequest,
  CancellationResult,
  ListBookingResult,
} from "../aggregators/BaseAggregator";
import { BookingModel, BookingStatus } from "../models/Booking.model";

interface LinkAccountBody {
  userId: string;
  aggregator: string;
}

interface GetFaresBody extends FareRequest {
  // Same fields as FareRequest: tripType, subType?, fromAddress, toAddress, startDate, startTime, vehicleType, fromLat, fromLng, toLat, toLng, passengers?
}

// 1) New interface for createBooking body
interface CreateBookingBody extends CreateBookingRequest {}
interface CancelBookingBody extends CancelBookingRequest {}
interface ListBookingsBody {
  // No body needed; userId from session
}

export class AggregatorController {
  /**
   * POST /link
   * Body: { userId, aggregator }
   * Creates a linked aggregator account for the given user.
   */
  static async linkAccount(
    req: FastifyRequest<{ Body: LinkAccountBody }>,
    reply: FastifyReply
  ) {
    const { userId, aggregator } = req.body;

    // 1) Validate input
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return reply.status(400).send({ error: "Invalid userId" });
    }
    if (!req.server.aggregators?.[aggregator]) {
      return reply.status(400).send({ error: "Unknown aggregator" });
    }

    try {
      // 2) Create the AggregatorAccount doc with empty creds
      await AggregatorAccountModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        aggregator,
        creds: {}, // placeholder until real credentials are stored
        linkedAt: new Date(),
      });

      return reply.send({ success: true });
    } catch (err: any) {
      req.log.error(err);
      if (err.code === 11000) {
        // unique index error => already linked
        return reply
          .status(409)
          .send({ error: "This aggregator is already linked for this user" });
      }
      return reply
        .status(500)
        .send({ error: "Failed to link aggregator account" });
    }
  }

  /**
   * POST /fares
   * Body: FareRequest fields
   * Calls each linked aggregator for quotes and returns a combined array.
   */
  static async getFares(
    req: FastifyRequest<{ Body: GetFaresBody }>,
    reply: FastifyReply
  ) {
    const userId = req.session.userId;
    // const userId = "64f9eae7c1d3d6c97a14c123"
    // 1) Fetch all linked aggregator accounts for this user
    const linkedAccounts = await AggregatorAccountModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    // 2) Decide which adapters to call and which creds to use
    let accountsToQuery: Array<{ aggregator: string; creds: any }> = [];

    if (linkedAccounts.length > 0) {
      // User has linked accounts → call only those
      accountsToQuery = linkedAccounts.map((acc) => ({
        aggregator: acc.aggregator,
        creds: acc.creds,
      }));
    } else {
      console.log(req.server.aggregators);
      // No linked accounts → call all adapters, with empty creds
      const allAdapterKeys = Object.keys(req.server.aggregators || {});
      accountsToQuery = allAdapterKeys.map((name) => ({
        aggregator: name,
        creds: {}, // empty, so adapter uses its default/API-key logic
      }));
    }

    // 3) Build an array of promises calling each chosen adapter’s getFares(...)
    const farePromises: Promise<FareResponse[]>[] = accountsToQuery.map(
      ({ aggregator, creds }) => {
        const adapter = req.server.aggregators?.[aggregator];
        if (!adapter) {
          // Skip if the adapter isn't actually registered
          return Promise.resolve([]);
        }
        console.log(creds);
        return adapter.getFares(creds, req.body);
      }
    );

    try {
      // 4) Await all adapter calls in parallel
      const resultsArray = await Promise.all(farePromises);
      // 5) Flatten the array of arrays
      const allFares: FareResponse[] = resultsArray.flat();

      // 6) Return combined fares (possibly empty)
      return reply.send({ fares: allFares });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ msg: "Error fetching fares from aggregators", error: err });
    }
  }

  /**
   * POST /bookings
   * Body: CreateBookingRequest fields
   * Single‐aggregator booking: calls that adapter’s createBooking(...)
   */
  static async createBooking(
    req: FastifyRequest<{ Body: CreateBookingBody }>,
    reply: FastifyReply
  ) {
    const userId = req.session.userId;

    // 1) Validate that aggregator exists in server
    let { aggregator } = req.body;
    // if (!req.server.aggregators?.[aggregator]) {
    //   return reply.status(400).send({ error: "Unknown aggregator" });
    // }

    // // 2) Fetch linked credentials for this user + aggregator
    let creds: any = {};
    try {
      const accountDoc = await AggregatorAccountModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        aggregator,
      }).lean();
      if (accountDoc) {
        creds = accountDoc.creds;
      }
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "Failed to fetch linked aggregator account" });
    }

    // 3) Call the adapter’s createBooking(...)
    try {
      if (!aggregator || !req.server.aggregators?.[aggregator]) {
        aggregator = "gozo";
      }
      const adapter = req.server.aggregators![aggregator];
      const bookingResult: BookingResult = await adapter.createBooking(
        creds,
        req.body
      );
      // bookingResult: { bookingId, referenceId, statusDesc, statusCode }
      return reply.status(200).send(bookingResult);
    } catch (err: any) {
      // 4) Handle HoldError / ConfirmError
      if (err.type === "HoldError" || err.type === "ConfirmError") {
        return reply
          .status(400)
          .send({ errorCode: err.errorCode, errors: err.errors });
      }
      // 5) Unexpected error
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "INTERNAL_SERVER_ERROR", details: err.message });
    }
  }

  /**
   * POST /booking/details
   */
  static async getBookingDetails(
    req: FastifyRequest<{ Body: BookingDetailsBody }>,
    reply: FastifyReply
  ) {
    // const userId = req.session.userId;
    const { universalBookingId, userId } = req.body;

    let bookingDoc;
    try {
      bookingDoc = await BookingModel.findOne({ universalBookingId }).lean();
      if (!bookingDoc) {
        return reply.status(404).send({ error: "Booking not found" });
      }
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "DB_ERROR", details: err.message });
    }

    const adapterName = bookingDoc.adapter;
    const adapter = req.server.aggregators?.[adapterName] || "gozo";
    // if (!adapter) {
    //   return reply.status(500).send({ error: "Adapter not loaded" });
    // }

    let creds: any = {};
    try {
      const accountDoc = await AggregatorAccountModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        aggregator: adapterName,
      }).lean();
      if (accountDoc) creds = accountDoc.creds;
    } catch (err: any) {
      req.log.error(err);
    }

    try {
      const details: BookingDetailsResult = await adapter.getBookingDetails(
        creds,
        universalBookingId,
        userId as string
      );
      return reply.send(details);
    } catch (err: any) {
      if (err.type === "DetailsError") {
        return reply
          .status(400)
          .send({ errorCode: err.errorCode, errors: err.errors });
      }
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "INTERNAL_SERVER_ERROR", details: err.message });
    }
  }

  /** POST /cancellation/list */
  static async getCancellationList(req: FastifyRequest, reply: FastifyReply) {
    let { aggregator, userId } = req.body as {
      aggregator: string;
      userId: string;
    };

    const accountDoc = await AggregatorAccountModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      aggregator,
    }).lean();
    console.log("accountDoc----->", accountDoc);
    const creds = accountDoc?.creds || {};
    try {
      if (!aggregator || !req.server.aggregators?.[aggregator]) {
        aggregator = "gozo";
      }
      const adapter = req.server.aggregators![aggregator];
      const reasons: CancellationReason[] = await adapter.getCancellationList(
        creds
      );
      return reply.send({ cancellationList: reasons });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "INTERNAL_SERVER_ERROR", details: err.message });
    }
  }

  /** POST /cancellation */
  static async cancelBooking(
    req: FastifyRequest<{ Body: CancelBookingBody }>,
    reply: FastifyReply
  ) {
    const userId = req.session.userId || req.body.userId;
    let { aggregator, bookingId, reasonId, reason } = req.body;
    let creds: any = {};
    try {
      const accountDoc = await AggregatorAccountModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        aggregator,
      }).lean();
      if (accountDoc) creds = accountDoc.creds;
    } catch (err: any) {
      req.log.error(err);
    }
    try {
      if (!aggregator || !req.server.aggregators?.[aggregator]) {
        aggregator = "gozo";
      }
      const adapter = req.server.aggregators![aggregator];
      const result: CancellationResult = await adapter.cancelBooking(creds, {
        userId,
        aggregator,
        bookingId,
        reasonId,
        reason,
      });
      await BookingModel.findOneAndUpdate(
        { adapterBookingId: bookingId },
        { status: BookingStatus.CANCELED, raw: result }
      );
      return reply.send(result);
    } catch (err: any) {
      if (err.type === "CancelError") {
        return reply
          .status(400)
          .send({ errorCode: err.errorCode, errors: err.errors });
      }
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "INTERNAL_SERVER_ERROR", details: err.message });
    }
  }

  /**
   * GET /bookings
   * List all bookings for the authenticated user and given aggregator
   */
  static async listBookings(
    req: FastifyRequest<{ Querystring: { aggregator: string } }>,
    reply: FastifyReply
  ) {
    const userId = req.session.userId;
    let { aggregator } = req.query;

    // 1) Validate aggregator
    if (!req.server.aggregators?.[aggregator]) {
      return reply.status(400).send({ error: "Unknown aggregator" });
    }

    // 2) Fetch credentials
    let creds: any = {};
    try {
      const account = await AggregatorAccountModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        aggregator,
      }).lean();
      if (account) creds = account.creds;
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "DB_ERROR", details: err.message });
    }

    // 3) Call adapter.listBookings
    try {
      if (!aggregator || !req.server.aggregators?.[aggregator]) {
        aggregator = "gozo";
      }
      const adapter = req.server.aggregators![aggregator];
      const bookings: ListBookingResult[] = await adapter.listBookings(
        creds,
        userId
      );
      return reply.send({ bookings });
    } catch (err: any) {
      req.log.error(err);
      return reply
        .status(500)
        .send({ error: "INTERNAL_SERVER_ERROR", details: err.message });
    }
  }
}
