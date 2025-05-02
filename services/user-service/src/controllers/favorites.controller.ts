import { FastifyRequest, FastifyReply } from "fastify";
import UserModel, { FavoriteType, ILocation } from "../models/user.model";

export class FavoritesController {
  /** GET /users/favorites */
  static async getFavorites(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.session.userId;
    const user = await UserModel.findById(userId, "favoriteLocations")
      .lean()
      .exec();
    if (!user) return reply.status(404).send({ error: "User not found" });

    // Flatten nulls to only include defined slots
    const out: Record<FavoriteType, ILocation | null> = {
      home: user.favoriteLocations.home ?? null,
      work: user.favoriteLocations.work ?? null,
      other: user.favoriteLocations.other ?? null,
    };
    return reply.send(out);
  }

  /** POST /users/favorites
   * Body: { type: 'home'|'work'|'other', name, lat, lon }
   */
  static async upsertFavorite(
    req: FastifyRequest<{ Body: { type: FavoriteType } & ILocation }>,
    reply: FastifyReply
  ) {
    const { type, name, lat, lon } = req.body;
    const userId = req.session.userId;

    if (!["home", "work", "other"].includes(type)) {
      return reply.status(400).send({ error: "Invalid favorite type" });
    }

    // $set the specific slot
    const update = { [`favoriteLocations.${type}`]: { name, lat, lon } };
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true }
    )
      .lean()
      .exec();
    if (!user) return reply.status(404).send({ error: "User not found" });
    return reply.send(user.favoriteLocations[type]);
  }

  /** DELETE /users/favorites/:type */
  static async deleteFavorite(
    req: FastifyRequest<{ Params: { type: FavoriteType } }>,
    reply: FastifyReply
  ) {
    const { type } = req.params;
    const userId = req.session.userId;

    if (!["home", "work", "other"].includes(type)) {
      return reply.status(400).send({ error: "Invalid favorite type" });
    }

    // $unset to remove the slot
    await UserModel.updateOne(
      { _id: userId },
      { $unset: { [`favoriteLocations.${type}`]: "" } }
    );
    return reply.send({ success: true });
  }
}
