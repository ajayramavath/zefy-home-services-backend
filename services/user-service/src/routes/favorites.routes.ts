import { FastifyInstance } from "fastify";
import { FavoritesController } from "../controllers/favorites.controller";
import {
  getFavoritesSchema,
  upsertFavoriteSchema,
  deleteFavoriteSchema,
} from "../schemas/favorites.schema";

export default async function favoritesRoutes(app: FastifyInstance) {
  const prefix = "/favorites";
  app.get(
    prefix,
    { schema: getFavoritesSchema },
    FavoritesController.getFavorites
  );
  app.post(
    prefix,
    { schema: upsertFavoriteSchema },
    FavoritesController.upsertFavorite
  );
  app.delete(
    `${prefix}/:type`,
    { schema: deleteFavoriteSchema },
    FavoritesController.deleteFavorite
  );
}
