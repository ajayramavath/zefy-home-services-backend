import { FastifyInstance } from "fastify";
import { AdminController } from "../controllers/admin.controller";

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.post("/login", AdminController.login);

  fastify.post("/createAdmin", AdminController.createAdmin);

  fastify.get("/me", AdminController.getMe);
}