import { FastifyReply, FastifyRequest } from "fastify";

interface GozoWebhookRequest {
  type: string;
  data: any;
}

export async function handleGozoWebhook(
  request: FastifyRequest<{ Body: GozoWebhookRequest }>,
  reply: FastifyReply
) {
  const { type, data } = request.body;
  const trimmedType = type.trim().toLowerCase();
  const { channel } = request.server.rabbitmq;

  try {
    const exchange = "gozo.webhook.events";
    await channel.assertExchange(exchange, "topic", { durable: true });

    const success = channel.publish(
      exchange,
      trimmedType,
      Buffer.from(JSON.stringify(data))
    );

    if (!success) {
      request.log.warn(
        `RabbitMQ publish returned false for type: ${trimmedType}`
      );
    }

    reply.status(200).send({ success: true });
  } catch (err) {
    request.log.error(err, "Failed to handle Gozo webhook");
    reply.status(500).send({ success: false, error: "Internal error" });
  }
}
