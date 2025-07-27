import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import User from "../models/user.model";
import { AuthController } from "../controllers/auth.controller";
import { ProfileController } from "../controllers/profile.controller";
import { IUser } from "@zf/types";

export default async function userRoutes(app: FastifyInstance) {
  // API to update profile data
  // app.post("/updateProfile", ProfileController.update);
  // API to get profile data
  app.get("/profile", ProfileController.getProfile);
}
