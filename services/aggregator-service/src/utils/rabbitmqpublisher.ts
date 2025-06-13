import { Channel } from "amqplib";
import { handleGozoEvent } from "../services/gozoEventHandler";

export async function startGozoWebhookConsumer(channel: Channel) {
  const EXCHANGE = "gozo.webhook.events";
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });

  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE, "#");

  channel.consume(q.queue, async (msg) => {
    if (msg) {
      const eventType = msg.fields.routingKey;
      const data = JSON.parse(msg.content.toString());
      await handleGozoEvent(eventType, data);
    }
  });
}
