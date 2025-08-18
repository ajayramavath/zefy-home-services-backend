import fp from "fastify-plugin";
import amqp, { Channel, ChannelModel } from "amqplib";

declare module "fastify" {
  interface FastifyInstance {
    rabbitmq: {
      connection: ChannelModel;
      channel: Channel;
    };
  }
}

export default fp(async (fastify, opts: { url: string }) => {
  try {
    fastify.log.info('🐰 Connecting to RabbitMQ...');

    const connection: ChannelModel = await amqp.connect(opts.url);
    const channel: Channel = await connection.createChannel();

    fastify.decorate("rabbitmq", { connection, channel });

    fastify.log.info('✅ RabbitMQ connected successfully');

    connection.on('error', (err) => {
      fastify.log.error('❌ RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      fastify.log.warn('⚠️ RabbitMQ connection closed');
    });

    fastify.addHook("onClose", async () => {
      try {
        fastify.log.info('🐰 Closing RabbitMQ connection...');
        await channel.close();
        await connection.close();
        fastify.log.info('✅ RabbitMQ connection closed');
      } catch (error) {
        fastify.log.error('❌ Error closing RabbitMQ:', error);
      }
    });

  } catch (error) {
    fastify.log.error('❌ Failed to connect to RabbitMQ:', error);
    throw error;
  }
}, {
  name: 'rabbitmq-plugin'
});