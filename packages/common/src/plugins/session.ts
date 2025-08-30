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
    createSession(userId: string, role: string): Promise<string>;
    /**
     * Revokes a single session by its sessionId.
     */
    revokeSession(sessionId: string): Promise<void>;
    /**
     * Revokes all sessions for the given userId.
     */
    revokeAllSessions(userId: string, role: string): Promise<void>;
  }

  interface FastifyRequest {
    /**
     * The validated session attached after preHandler
     */
    session: { userId: string; sessionId: string, role: string };
    isAdmin: boolean;
    authenticatedId: string;
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

  app.decorate("revokeSession", async (sessionId: string) => {
    await app.redis.del(`session:${sessionId}`);
  });

  app.decorate("revokeAllSessions", async (userId: string, role: string) => {
    for await (const key of app.redis.scanIterator({ MATCH: "session:*" })) {
      const data = await app.redis.get(key);
      const { userId: storedUserId, role: storedRole } = JSON.parse(data);
      if (storedUserId === userId && storedRole === role) {
        await app.redis.del(key);
      }
    }
  });

  app.decorate("createSession", async (userId: string, role: string) => {
    if (opts.allowMultipleSessions === false) {
      await app.revokeAllSessions(userId, role);
    }
    const sessionId = randomBytes(16).toString("hex");
    await app.redis.set(`session:${sessionId}`, JSON.stringify({ userId, role }), {
      EX: opts.ttlSeconds,
    });
    return sessionId;
  });

  app.addHook("preHandler", async (req, reply) => {
    if (
      req.url.startsWith("/users/auth") ||
      req.url.startsWith("/users/docs") ||
      req.url.startsWith("/users/health") ||
      req.url.startsWith("/users/test-simple") ||
      req.url.startsWith("/health") ||
      req.url.startsWith("docs") ||
      req.url.startsWith("/users/getData") ||
      req.url.startsWith("/partners/health") ||
      req.url.startsWith("/bookings/health") ||
      req.url.startsWith("/admin/health") ||
      req.url.startsWith("/partners/ws") ||
      req.url.startsWith("/admin/createAdmin") ||
      req.url.includes("/ws?") ||
      req.url.startsWith("/partners/test-ws-direct") ||
      req.headers.upgrade === 'websocket' ||
      req.headers.connection?.toLowerCase().includes('upgrade')

    ) {
      return;
    }
    console.log("req.url----->", req.url);

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Missing session token" });
    }

    const sessionId = auth.slice(7);
    console.log("sessionId----->", sessionId);

    const adminSessionData = await app.redis.get(`admin:session:${sessionId}`);
    if (adminSessionData) {
      const adminSession = JSON.parse(adminSessionData);
      req.adminSession = {
        adminId: adminSession.adminId,
        sessionId,
        role: adminSession.role
      };
      req.isAdmin = true;
      req.authenticatedId = adminSession.adminId;

      app.log.info(`Admin ${adminSession.adminId} (${adminSession.role}) accessing ${req.method} ${req.url}`);
      return;
    }

    const { userId, role } = JSON.parse(await app.redis.get(`session:${sessionId}`));
    console.log("userId----->", userId);
    if (!userId) {
      return reply.status(401).send({ error: "Invalid or expired session" });
    }
    req.session = { userId, sessionId, role };
    req.isAdmin = false;
    req.authenticatedId = userId;
  });
};

export default fp(sessionPlugin, {
  name: "session-plugin",
});
