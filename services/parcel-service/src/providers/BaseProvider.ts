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
  abstract createPorterOrder(req: OrderRequest): Promise<ParcelOrderResponse>;
  abstract getPorterOrderStatus(
    req: PorterStatus
  ): Promise<IParcelOrder | null>;
  abstract cancelPorterOrder(
    req: PorterStatus
  ): Promise<ProviderCancelResponse>;
}
