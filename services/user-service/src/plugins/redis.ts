import fp from "fastify-plugin";
import { createClient, RedisClientType } from "redis";

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisClientType;
  }
}

export default fp(async (app, opts: { url: string }) => {
  const client: RedisClientType = createClient({ url: opts.url });
  await client.connect();

  app.decorate("redis", client);

  app.addHook("onClose", async () => {
    await client.disconnect();
  });
});
