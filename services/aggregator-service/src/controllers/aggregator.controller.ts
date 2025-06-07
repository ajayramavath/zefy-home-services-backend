import { FastifyReply, FastifyRequest } from "fastify";
import mongoose from "mongoose";
import AggregatorAccountModel from "../models/AggregatorAccount.model";

import { FareRequest, FareResponse, BookingDetailsBody } from "@zf/types"; // or '@ms/types'
import {
  CreateBookingRequest,
  BookingResult,
  BookingDetailsResult
} from "../aggregators/BaseAggregator";
import { BookingModel } from "../models/Booking.model";

interface LinkAccountBody {
  userId: string;
  aggregator: string;
}

interface GetFaresBody extends FareRequest {
  // Same fields as FareRequest: tripType, subType?, fromAddress, toAddress, startDate, startTime, vehicleType, fromLat, fromLng, toLat, toLng, passengers?
}

// 1) New interface for createBooking body
interface CreateBookingBody extends CreateBookingRequest { }

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
        .send({ error: "Error fetching fares from aggregators" });
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
    const { aggregator } = req.body;
    // if (!req.server.aggregators?.[aggregator]) {
    //   return reply.status(400).send({ error: "Unknown aggregator" });
    // }

    // // 2) Fetch linked credentials for this user + aggregator
    let creds: any = {};
    // try {
    //   const accountDoc = await AggregatorAccountModel.findOne({
    //     userId: new mongoose.Types.ObjectId(userId),
    //     aggregator,
    //   }).lean();
    //   if (accountDoc) {
    //     creds = accountDoc.creds;
    //   }
    // } catch (err: any) {
    //   req.log.error(err);
    //   return reply
    //     .status(500)
    //     .send({ error: "Failed to fetch linked aggregator account" });
    // }

    // 3) Call the adapter’s createBooking(...)
    try {
      const adapter = req.server.aggregators![aggregator] || aggregator;
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
    const userId = req.session.userId;
    const { universalBookingId } = req.body;

    let bookingDoc;
    try {
      bookingDoc = await BookingModel.findOne({ universalBookingId }).lean();
      if (!bookingDoc) {
        return reply.status(404).send({ error: "Booking not found" });
      }
    } catch (err: any) {
      req.log.error(err);
      return reply.status(500).send({ error: "DB_ERROR", details: err.message });
    }

    const adapterName = bookingDoc.adapter;
    const adapter = req.server.aggregators?.[adapterName];
    if (!adapter) {
      return reply.status(500).send({ error: "Adapter not loaded" });
    }

    let creds: any = {};
    // try {
    //   const accountDoc = await AggregatorAccountModel.findOne({
    //     userId: new mongoose.Types.ObjectId(userId),
    //     aggregator: adapterName,
    //   }).lean();
    //   if (accountDoc) creds = accountDoc.creds;
    // } catch (err: any) {
    //   req.log.error(err);
    // }

    try {
      const details: BookingDetailsResult = await adapter.getBookingDetails(
        creds,
        universalBookingId,
        userId
      );
      return reply.send(details);
    } catch (err: any) {
      if (err.type === "DetailsError") {
        return reply.status(400).send({ errorCode: err.errorCode, errors: err.errors });
      }
      req.log.error(err);
      return reply.status(500).send({ error: "INTERNAL_SERVER_ERROR", details: err.message });
    }
  }
}
