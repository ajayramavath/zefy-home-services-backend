import fp from "fastify-plugin";
import amqp, { Channel, ChannelModel } from "amqplib";

declare module "fastify" {
  interface FastifyInstance {
    rabbitmq: { connection: ChannelModel; channel: Channel };
  }
}

export default fp(async (app, opts: { url: string }) => {
  // amqp.connect() now returns ChannelModel
  const connection: ChannelModel = await amqp.connect(opts.url);
  const channel: Channel = await connection.createChannel();

  app.decorate("rabbitmq", { connection, channel });

  app.addHook("onClose", async () => {
    await channel.close();
    await connection.close();
  });
});
