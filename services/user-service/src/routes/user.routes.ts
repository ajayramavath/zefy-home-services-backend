import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import User from "../models/user.model";

export default async function userRoutes(app: FastifyInstance) {
  app.get("/", async (_req: FastifyRequest, reply: FastifyReply) => {
    const users = await User.find().lean();
    return reply.send(users);
  });

  app.get(
    "/:id",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = await User.findById(req.params.id).lean();
      if (!user) return reply.status(404).send({ message: "User not found" });
      return reply.send(user);
    }
  );
}
