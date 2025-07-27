import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string;
      phoneNumber: string;
      hubId: string;
      iat?: number;
      exp?: number;
    };
  }
}

interface JwtPayload {
  id: string;
  phoneNumber: string;
  hubId: string;
  iat?: number;
  exp?: number;
}

async function authPlugin(fastify: FastifyInstance) {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

  fastify.decorate('verifyToken', (token: string): JwtPayload => {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return reply.status(401).send({
          success: false,
          message: 'Authorization header missing'
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          message: 'Invalid authorization format. Use Bearer <token>'
        });
      }
      const token = authHeader.substring(7);
      if (!token) {
        return reply.status(401).send({
          success: false,
          message: 'Token missing'
        });
      }

      const decoded = fastify.verifyToken(token);

      request.user = {
        id: decoded.id,
        phoneNumber: decoded.phoneNumber,
        hubId: decoded.hubId,
        iat: decoded.iat,
        exp: decoded.exp
      };

    } catch (error) {
      fastify.log.error('Authentication error:', error);

      return reply.status(401).send({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  });

  // fastify.decorate('verifyUserExists', async (userId: string): Promise<boolean> => {
  //   try {
  //     const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';

  //     const response = await fetch(`${userServiceUrl}/users/${userId}`);
  //     return response.ok;

  //   } catch (error) {
  //     fastify.log.error('Error verifying user exists:', error);
  //     return false;
  //   }
  // });
}

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyToken: (token: string) => JwtPayload;
    // verifyUserExists: (userId: string) => Promise<boolean>;
  }
}

export default fp(authPlugin, {
  name: 'partner-auth-plugin'
});