import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import User from "../models/user.model";
import { AuthController } from "../controllers/auth.controller";
import { ProfileController } from "../controllers/profile.controller";
import { googleSignInSchema, linkPhoneSchema } from "../schemas/auth.schema";

export default async function userRoutes(app: FastifyInstance) {
  // app.get("/", async (_req: FastifyRequest, reply: FastifyReply) => {
  //   const users = await User.find().lean();
  //   return reply.send(users);
  // });

  app.get(
    "/:id",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = await User.findById(req.params.id).lean();
      if (!user) return reply.status(404).send({ message: "User not found" });
      let data = {
        firstName: user.firstName
          ? user.firstName
          : user.providers[0].displayName,
        lastName: user.lastName ? user.lastName : "",
        email: user.providers[0].email || "",
        phoneNumber: user.providers[0].phoneNumber || "",
      };
      return reply.send(data);
    }
  );

  // API to validate google authentication, fetch user record and store it in the database
  app.post(
    "/auth/google",
    { schema: googleSignInSchema },
    AuthController.googleSignIn
  );
  // API to link phone number to the user account
  app.post(
    "/auth/phone",
    { schema: linkPhoneSchema },
    AuthController.linkPhone
  );
  // API to update profile data
  app.post("/updateProfile", ProfileController.update);
  // API to get profile data
  app.get("/profile", ProfileController.getProfile);
}
