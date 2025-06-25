// services/user-service/src/plugins/session.ts
import fp from "fastify-plugin";
import { randomBytes } from "crypto";
import { FastifyPluginAsync } from "fastify";

// Extend Fastify types for session support
declare module "fastify" {
  interface FastifyInstance {
    /**
     * Creates a session for the given userId and returns the session token (ID).
     */
    createSession(userId: string): Promise<string>;
    /**
     * Revokes a single session by its sessionId.
     */
    revokeSession(sessionId: string): Promise<void>;
    /**
     * Revokes all sessions for the given userId.
     */
    revokeAllSessions(userId: string): Promise<void>;
  }

  interface FastifyRequest {
    /**
     * The validated session attached after preHandler
     */
    session: { userId: string; sessionId: string };
  }
}

interface SessionOpts {
  /**
   * Session TTL in seconds (e.g., 7*24*3600 for one week)
   */
  ttlSeconds: number;
  /**
   * Whether to allow multiple concurrent sessions per user.
   * Set to false to enforce single-session (revokes old sessions on login).
   */
  allowMultipleSessions?: boolean;
}

/**
 * Redis-backed session plugin with multi-session control.
 */
const sessionPlugin: FastifyPluginAsync<SessionOpts> = async (app, opts) => {
  // Revoke a single session token
  app.decorate("revokeSession", async (sessionId: string) => {
    await app.redis.del(`session:${sessionId}`);
  });

  // Revoke all sessions for a given user
  app.decorate("revokeAllSessions", async (userId: string) => {
    for await (const key of app.redis.scanIterator({ MATCH: "session:*" })) {
      const storedUserId = await app.redis.get(key);
      if (storedUserId === userId) {
        await app.redis.del(key);
      }
    }
  });

  // Create (and optionally prune) sessions
  app.decorate("createSession", async (userId: string) => {
    // If multi-session not allowed, clear existing sessions
    if (opts.allowMultipleSessions === false) {
      await app.revokeAllSessions(userId);
    }
    const sessionId = randomBytes(16).toString("hex");
    await app.redis.set(`session:${sessionId}`, userId, {
      EX: opts.ttlSeconds,
    });
    return sessionId;
  });

  // Validate session token on every request except auth routes
  app.addHook("preHandler", async (req, reply) => {
    if (
      req.url.startsWith("/users/auth") ||
      req.url.startsWith("/users/docs") ||
      req.url.startsWith("/users/health") ||
      req.url.startsWith("/aggregator/docs") ||
      req.url.startsWith("/aggregator/health") ||
      req.url.startsWith("/parcel/docs") ||
      req.url.startsWith("/parcel/health") ||
      req.url.startsWith("/health") ||
      req.url.startsWith("docs") ||
      req.url.startsWith("/users/getData") ||
      // req.url.startsWith("/aggregator/cancellationList") ||
      req.url.startsWith("/aggregator/webhooks/gozo") ||
      // req.url.startsWith("/aggregator/bookingDetails") ||
      req.url.startsWith("/parcel/quotes")
    ) {
      return;
    }

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing session token" });
    }

    const sessionId = auth.slice(7);
    const userId = await app.redis.get(`session:${sessionId}`);
    console.log("userId----->", userId);
    if (!userId) {
      return reply.status(401).send({ error: "Invalid or expired session" });
    }

    // Attach session info for downstream handlers
    req.session = { userId, sessionId };
  });
};

export default fp(sessionPlugin, {
  name: "session-plugin",
});
