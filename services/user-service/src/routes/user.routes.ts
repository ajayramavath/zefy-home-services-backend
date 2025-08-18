import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthController } from "../controllers/auth.controller";
import { ProfileController } from "../controllers/profile.controller";
import { UpdateProfileSchema } from "../schemas/profile.schema";


export default async function userRoutes(app: FastifyInstance) {
  app.post("/auth/sendOTP", AuthController.sendOTP);
  app.post("/auth/verifyOTPandLogin", AuthController.verifyOTPandLogin);
  app.get('/checkSession', AuthController.checkSession);
  app.post("/logout", AuthController.logout)
  app.get("/profile", ProfileController.getProfile);
  app.put("/updateProfile", ProfileController.updateProfile);
  app.post("/saveAddress", ProfileController.saveAddress);
}
