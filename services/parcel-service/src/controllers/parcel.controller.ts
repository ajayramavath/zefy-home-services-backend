import { FastifyReply, FastifyRequest } from "fastify";
import { OrderRequest, QuoteRequest } from "packages/types/dist";
import { PorterStatus } from "../providers/PorterAdapter";
import {
  GetQuotesResponse,
  CreateOrderResponse,
  OrderStatusResponse,
  CancelOrderResponse,
  ErrorResponse,
} from "../types/provider";

export class ParcelController {
  static async getQuote(
    req: FastifyRequest<{ Body: QuoteRequest }>,
    reply: FastifyReply
  ): Promise<GetQuotesResponse> {
    const adapters = req.server.parcels;
    const quotePromises = Object.values(adapters).map((adapter) =>
      adapter.getQuote(req.body).then(
        (quote) => ({ provider: adapter.name, quote }),
        (err) => ({ provider: adapter.name, error: err.message })
      )
    );

    const results = await Promise.all(quotePromises);
    return reply.send({ success: true, data: results });
  }

  static async createPorterOrder(
    req: FastifyRequest<{ Body: OrderRequest }>,
    reply: FastifyReply
  ): Promise<CreateOrderResponse | ErrorResponse> {
    const { provider } = req.body;
    const adapter = req.server.parcels[provider];

    if (!adapter) {
      return reply.status(400).send({
        success: false,
        message: "Invalid provider",
      });
    }

    const order = await adapter.createPorterOrder(req.body);
    return reply.send({ success: true, data: order });
  }

  static async getPorterOrderStatus(
    req: FastifyRequest<{ Body: PorterStatus }>,
    reply: FastifyReply
  ): Promise<OrderStatusResponse | ErrorResponse> {
    const { provider, orderId } = req.body;
    const adapter = req.server.parcels[provider];

    if (!adapter) {
      return reply.status(400).send({
        success: false,
        message: "Invalid provider",
      });
    }

    const status = await adapter.getPorterOrderStatus({ provider, orderId });
    return reply.send({ success: true, data: status });
  }

  static async cancelPorterOrder(
    req: FastifyRequest<{ Body: PorterStatus }>,
    reply: FastifyReply
  ): Promise<CancelOrderResponse | ErrorResponse> {
    const { provider, orderId } = req.body;
    const adapter = req.server.parcels[provider];

    if (!adapter) {
      return reply.status(400).send({
        success: false,
        message: "Invalid provider",
      });
    }

    const result = await adapter.cancelPorterOrder({ provider, orderId });
    return reply.send({ success: true, data: result });
  }
}
