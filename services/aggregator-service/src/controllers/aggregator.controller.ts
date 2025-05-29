import { FastifyReply, FastifyRequest } from "fastify";
import mongoose from "mongoose";
import AggregatorAccountModel from "../models/AggregatorAccount.model";

interface LinkAccountBody {
  userId: string;
  aggregator: string;
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
      //    (extend later to call adapter.linkAccount for real creds)
      await AggregatorAccountModel.create({
        userId: new mongoose.Types.ObjectId(userId),
        aggregator,
        creds: {}, // placeholder
        linkedAt: new Date(),
      });

      // 3) Success
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
}
