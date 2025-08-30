import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from 'bcryptjs';
import { Admin } from "../models/admin.models";

const SALT_ROUNDS = 10;

export class AdminController {
  static async login(request: FastifyRequest<{
    Body: {
      username: string;
      password: string;
    }
  }>, reply: FastifyReply) {
    try {
      const { username, password } = request.body;
      const admin = await Admin.findOne({ username });
      if (!admin) {
        return reply.status(401).send({
          success: false,
          message: 'Username not present'
        });
      }
      if (!await AdminController.verifyPassword(password, admin.password)) {
        return reply.status(401).send({
          success: false,
          message: 'Invalid password'
        })
      }
      const sessionToken = await request.server.createAdminSession(admin.id, admin.role);
      return reply.status(200).send({
        success: true,
        message: 'Login successful',
        data: {
          sessionToken,
          admin: {
            id: admin.id,
            username: admin.username,
            role: admin.role,
            hubs: admin.hubIds,
            name: admin.name,
            createdAt: admin.createdAt.toISOString(),
          }
        }
      })
    } catch (error) {
      request.server.log.error('Error logging in:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to login'
      })
    }
  }

  static async createAdmin(request: FastifyRequest<{
    Body: {
      username: string;
      password: string;
      role: 'admin' | 'supervisor' | 'super_admin';
      name: string;
      hubIds: string[];
    }
  }>, reply: FastifyReply) {
    try {
      // const { adminId, role: adminRole } = request.adminSession;
      // if (adminRole !== 'super_admin') {
      //   return reply.status(403).send({
      //     success: false,
      //     message: 'Insufficient privileges'
      //   })
      // }
      // const superAdmin = await Admin.findOne({ id: adminId });
      // if (!superAdmin || superAdmin.role !== 'super_admin') {
      //   return reply.status(403).send({
      //     success: false,
      //     message: 'Insufficient privileges'
      //   })
      // }
      const { username, password, role, name, hubIds } = request.body;
      const hashedPassword = await AdminController.hashPassword(password);
      const admin = await Admin.findOne({ username });
      if (admin) {
        return reply.status(400).send({
          success: false,
          message: 'Username already exists'
        });
      }

      const newAdmin = new Admin({
        username,
        password: hashedPassword,
        role,
        name,
        hubIds
      })
      await newAdmin.save();

      return reply.status(200).send({
        success: true,
        message: 'Admin created successfully',
        data: newAdmin.toJSON()
      })
    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to create admin'
      })
    }
  }



  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async getMe(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { adminId } = request.adminSession;
      if (!adminId) {
        return reply.status(401).send({
          success: false,
          message: 'Unauthorized'
        })
      }
      request.server.log.info(`Getting admin: ${adminId}`);
      const admin = await Admin.findOne({ _id: adminId });
      if (!admin) {
        return reply.status(404).send({
          success: false,
          message: 'Admin not found'
        })
      }
      return reply.status(200).send({
        success: true,
        data: {
          admin,
          sessionToken: request.adminSession.sessionId
        }
      })
    } catch (error) {
      request.server.log.error(error.toString());
      return reply.status(500).send({
        success: false,
        message: 'Failed to get admin'
      })
    }
  }
}