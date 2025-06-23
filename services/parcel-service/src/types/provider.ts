import { QuoteResponse } from "@zf/types";
import { ParcelOrderResponse } from "../providers/PorterAdapter";
import { IParcelOrder } from "../models/ParcelOrder.model";

export interface Success<T> {
  success: true;
  data: T;
}

export interface Failure {
  success: false;
  message: string;
}

export type GetQuotesResponse = Success<
  Array<{ provider: string; quote?: QuoteResponse; error?: string }>
>;

export type CreateOrderResponse = Success<ParcelOrderResponse>;

export type OrderStatusResponse = Success<IParcelOrder | null>;

export type CancelOrderResponse = Success<{ code: number; message: string }>;

export type ErrorResponse = Failure;
