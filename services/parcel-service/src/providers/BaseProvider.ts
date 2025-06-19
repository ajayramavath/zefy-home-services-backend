import { OrderRequest, QuoteRequest, QuoteResponse } from "@zf/types";
import {
  ParcelOrderResponse,
  PorterStatus,
  ProviderCancelResponse,
} from "./PorterAdapter";
import { IParcelOrder } from "../models/ParcelOrder.model";

export abstract class BaseProvider {
  abstract name: string;
  abstract getQuote(req: QuoteRequest): Promise<QuoteResponse>;
  abstract createPorterOrder(
    req: OrderRequest,
    userId: string
  ): Promise<ParcelOrderResponse>;
  abstract getPorterOrderStatus(
    req: PorterStatus,
    userId: string
  ): Promise<IParcelOrder | null>;
  abstract cancelPorterOrder(
    req: PorterStatus,
    userId: string
  ): Promise<ProviderCancelResponse>;
}
