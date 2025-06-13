import { FastifyInstance } from "fastify";
import { handleGozoWebhook } from "../controllers/aggregatorHook.controller";

export default async function aggregatorWebhookRoutes(app: FastifyInstance) {
  app.post("/gozo", handleGozoWebhook);
}
