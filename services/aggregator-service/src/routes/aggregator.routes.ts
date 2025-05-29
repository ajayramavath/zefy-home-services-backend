import { FastifyInstance } from "fastify";
import { AggregatorController } from "../controllers/aggregator.controller";

export default async function aggregatorRoutes(app: FastifyInstance) {
  // Link a new aggregator account
  app.post("/link", AggregatorController.linkAccount);
}
