import fp from "fastify-plugin";
import { randomBytes } from "crypto";
import { FastifyPluginAsync } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    /**
     * Creates an admin session for the given adminId and returns the session token (ID).
     */
    createAdminSession(adminId: string, role?: string): Promise<string>;
    /**
     * Revokes a single admin session by its sessionId.
     */
    revokeAdminSession(sessionId: string): Promise<void>;
    /**
     * Revokes all sessions for the given adminId.
     */
    revokeAllAdminSessions(adminId: string): Promise<void>;
    /**
     * Validates if the user has admin role
     */
    validateAdminRole(role: string): boolean;
  }

  interface FastifyRequest {
    /**
     * The validated admin session attached after preHandler
     */
    adminSession: {
      adminId: string;
      sessionId: string;
      role: string;
      permissions?: string[];
    };
  }
}

interface AdminSessionOpts {
  /**
   * Session TTL in seconds (e.g., 8*3600 for 8 hours)
   */
  ttlSeconds: number;
  /**
   * Whether to allow multiple concurrent sessions per admin.
   * Set to false to enforce single-session (revokes old sessions on login).
   */
  allowMultipleSessions?: boolean;
}

const adminSessionPlugin: FastifyPluginAsync<AdminSessionOpts> = async (app, opts) => {
  const keyPrefix = 'admin:session';
  const allowedRoles = ['admin', 'super_admin', 'supervisor'];

  app.decorate("validateAdminRole", (role: string): boolean => {
    return allowedRoles.includes(role);
  });

  app.decorate("revokeAdminSession", async (sessionId: string) => {
    await app.redis.del(`${keyPrefix}:${sessionId}`);
    app.log.info(`Admin session revoked: ${sessionId}`);
  });

  app.decorate("revokeAllAdminSessions", async (adminId: string) => {
    let revokedCount = 0;
    for await (const key of app.redis.scanIterator({ MATCH: `${keyPrefix}:*` })) {
      const data = await app.redis.get(key);
      if (data) {
        try {
          const sessionData = JSON.parse(data);
          if (sessionData.adminId === adminId) {
            await app.redis.del(key);
            revokedCount++;
          }
        } catch (err) {
          app.log.error(`Error parsing session data for key ${key}:`, err);
        }
      }
    }
    app.log.info(`Revoked ${revokedCount} sessions for admin: ${adminId}`);
  });

  app.decorate("createAdminSession", async (adminId: string, role: string = 'admin') => {
    if (!app.validateAdminRole(role)) {
      throw new Error(`Invalid admin role: ${role}. Allowed roles: ${allowedRoles.join(', ')}`);
    }

    if (opts.allowMultipleSessions === false) {
      await app.revokeAllAdminSessions(adminId);
    }

    const sessionId = randomBytes(32).toString("hex");
    const sessionData = {
      adminId,
      role,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    await app.redis.set(
      `${keyPrefix}:${sessionId}`,
      JSON.stringify(sessionData),
      {
        EX: opts.ttlSeconds,
      }
    );

    app.log.info(`Admin session created for ${adminId} with role ${role}`);
    return sessionId;
  });

  app.addHook("preHandler", async (req, reply) => {
    const publicPaths = [
      "/admin/login",
      "/admin/health",
      "/health",
      "/docs",
      "/admin/auth/forgot-password",
      "/admin/auth/reset-password",
      "/admin/createAdmin",
      "/ws",
      "/bookings/webhooks/razorpay/cancellation"
    ];

    const isPublicPath = publicPaths.some(path =>
      req.url.startsWith(path) || req.url.includes(path)
    );

    console.log("isPublicPath----->", isPublicPath);

    if (isPublicPath ||
      req.headers.upgrade === 'websocket' ||
      req.headers.connection?.toLowerCase().includes('upgrade')) {
      return;
    }

    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return reply.status(401).send({
        error: "Missing authorization token",
        message: "Admin authentication required"
      });
    }

    const sessionId = auth.slice(7);

    try {
      const sessionKey = `${keyPrefix}:${sessionId}`;
      const sessionData = await app.redis.get(sessionKey);

      if (!sessionData) {
        return reply.status(401).send({
          error: "Invalid or expired session",
          message: "Please login again"
        });
      }

      const session = JSON.parse(sessionData);
      if (!app.validateAdminRole(session.role)) {
        app.log.warn(`Unauthorized access attempt with role: ${session.role} for admin: ${session.adminId}`);
        return reply.status(403).send({
          error: "Insufficient privileges",
          message: "Admin access required"
        });
      }

      session.lastActivity = new Date().toISOString();
      await app.redis.set(
        sessionKey,
        JSON.stringify(session),
        {
          EX: opts.ttlSeconds,
        }
      );

      req.adminSession = {
        adminId: session.adminId,
        sessionId,
        role: session.role,
        permissions: session.permissions
      };

      app.log.debug(`Admin ${session.adminId} (${session.role}) authenticated for ${req.method} ${req.url}`);
    } catch (err) {
      app.log.error("Session validation error:", err);
      return reply.status(500).send({
        error: "Session validation failed",
        message: "Internal server error"
      });
    }
  });
};

export default fp(adminSessionPlugin, {
  name: "admin-session-plugin",
});