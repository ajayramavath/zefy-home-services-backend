import { FastifyReply, FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import AggregatorAccountModel from '../models/AggregatorAccount.model';
import { FareRequest, FareResponse } from '@zf/types'; // or '@ms/types'

interface LinkAccountBody {
  userId: string;
  aggregator: string;
}

interface GetFaresBody extends FareRequest {
  // Same fields as FareRequest: tripType, subType?, fromAddress, toAddress, startDate, startTime, vehicleType, fromLat, fromLng, toLat, toLng, passengers?
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
      return reply.status(400).send({ error: 'Invalid userId' });
    }
    if (!req.server.aggregators?.[aggregator]) {
      return reply.status(400).send({ error: 'Unknown aggregator' });
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
          .send({ error: 'This aggregator is already linked for this user' });
      }
      return reply
        .status(500)
        .send({ error: 'Failed to link aggregator account' });
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
        creds: acc.creds
      }));
    } else {
      // No linked accounts → call all adapters, with empty creds
      const allAdapterKeys = Object.keys(req.server.aggregators || {});
      accountsToQuery = allAdapterKeys.map((name) => ({
        aggregator: name,
        creds: {} // empty, so adapter uses its default/API-key logic
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
        .send({ error: 'Error fetching fares from aggregators' });
    }
  }
}
