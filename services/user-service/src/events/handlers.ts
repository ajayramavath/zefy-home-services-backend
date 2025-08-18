import { FastifyInstance } from 'fastify';
import { HubAssignedEvent } from '@zf/common';
import { User } from '../models/user.model';

export async function handleHubAssigned(event: HubAssignedEvent, fastify: FastifyInstance): Promise<void> {
  const { userId, hubId, location, serviceArea } = event.data;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          hubId: hubId,
        }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedUser) {
      throw new Error(`User not found: ${userId}`);
    }

    fastify.log.info(`✅ User ${userId} assigned to hub ${hubId} in ${serviceArea}`);

  } catch (error) {
    fastify.log.error(`❌ Failed to handle hub assigned event for user ${userId}:`, error);
    throw error;
  }
}

export function setupEventHandlers(fastify: FastifyInstance): void {
  fastify.log.info('📝 User service event handlers configured');
}