import axios from "axios";
import { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { OrderRequest, QuoteRequest, QuoteResponse } from "@zf/types";
import { BaseProvider } from "./BaseProvider";
import { IParcelOrder, ParcelOrder } from "../models/ParcelOrder.model";

interface PorterApiError {
  code: number;
  type: string;
  message: string;
}

export interface PorterStatus {
  orderId: string;
  provider: string;
}

export interface ProviderCancelResponse {
  code: number;
  message: string;
}

export interface ParcelOrderResponse {
  _id: string | Types.ObjectId;
  provider: string;
  requestId: string;
  status: string;
  pickup: any;
  drop: any;
  deliveryInstructions?: any;
  rawResponse: any;
  createdAt: Date;
}

export default class PorterAdapter extends BaseProvider {
  public readonly name = "porter";
  private readonly apiKey: string;
  private readonly userServiceBaseUrl: string;
  constructor(apiKey: string, userServiceBaseUrl: string) {
    super();
    this.apiKey = apiKey;
    this.userServiceBaseUrl = "http://user-service:3000";
  }

  // Get porter quotes for request
  async getQuote(req: QuoteRequest): Promise<QuoteResponse> {
    let body = req;
    console.log("quote body----->", body);
    try {
      const response = await axios.post(
        `${process.env.PORTER_HOST}/v1/get_quote`,
        body,
        {
          headers: {
            "X-API-KEY": process.env.PORTER_API_KEY!,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("quote--->", response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        "Error fetching Porter quote:",
        error.response?.data || error.message
      );
      throw new Error("Failed to fetch quote from Porter");
    }
  }

  // Create an order in porter
  async createPorterOrder(
    req: OrderRequest,
    userId: string
  ): Promise<ParcelOrderResponse> {
    try {
      const referenceId = `ZFY${uuidv4()}`;
      (req as any).request_id = referenceId;
      // req.request_id = referenceId;
      console.log(JSON.stringify(req));
      const response = await axios.post(
        `${process.env.PORTER_HOST}/v1/orders/create`,
        req,
        {
          headers: {
            "x-api-key": process.env.PORTER_API_KEY!,
            "Content-Type": "application/json",
          },
        }
      );

      const porterResponse = response.data;
      console.log("porterResponse---->", porterResponse);
      // const referenceId = `ZFY${uuidv4()}`;
      const saveOrder = await ParcelOrder.create({
        userId,
        provider: "porter",
        requestId: referenceId,
        status: porterResponse?.status || "open",
        pickup: req.pickup_details,
        drop: req.drop_details,
        deliveryInstructions: req.delivery_instructions,
        rawResponse: porterResponse,
      });

      return saveOrder.toObject();
    } catch (error: any) {
      console.log("error---->", error);
      const status = error.response?.status;
      const body = error.response?.data;

      const apiError: PorterApiError = {
        code: status || 500,
        type: body?.type || "unknown_error",
        message:
          body?.message ||
          "An unexpected error occurred while creating the order",
      };

      // Optional logging
      console.error("Porter API error:", apiError);

      // Throw standardized error for controller or caller
      const err = new Error(apiError.message) as Error & {
        code: number;
        type: string;
      };
      err.code = apiError.code;
      err.type = apiError.type;
      throw err;
    }
  }

  async getPorterOrderStatus(
    req: PorterStatus,
    userId: string
  ): Promise<IParcelOrder | null> {
    try {
      // First lookup by _id to get rawResponse.order_id
      const localOrder = await ParcelOrder.findById(req.orderId).lean();

      if (!localOrder || !localOrder.rawResponse?.order_id) {
        throw new Error("Invalid order ID or missing Porter order_id");
      }

      const porterOrderId = localOrder.rawResponse.order_id;

      const response = await axios.get(
        `${process.env.PORTER_HOST}/v1/orders/${porterOrderId}`,
        {
          headers: {
            "x-api-key": process.env.PORTER_API_KEY!,
          },
        }
      );

      const data = response.data;

      const updatedOrder = await ParcelOrder.findByIdAndUpdate(
        req.orderId,
        {
          userId,
          status: data.status,
          partnerInfo: data.partner_info,
          orderTimings: data.order_timings,
          fareDetails: data.fare_details,
          rawResponse: data,
        },
        { new: true }
      );

      return updatedOrder?.toObject() || null;
    } catch (error: any) {
      const status = error.response?.status;
      const body = error.response?.data;

      const apiError: PorterApiError = {
        code: status || 500,
        type: body?.type || "unknown_error",
        message:
          body?.message ||
          "An unexpected error occurred while retrieving the order",
      };

      console.error("Porter API error:", apiError);

      const err = new Error(apiError.message) as Error & {
        code: number;
        type: string;
      };
      err.code = apiError.code;
      err.type = apiError.type;
      throw err;
    }
  }

  // Function to cancel order
  async cancelPorterOrder(
    req: PorterStatus,
    userId: string
  ): Promise<ProviderCancelResponse> {
    try {
      const localOrder = await ParcelOrder.findById(req.orderId).lean();

      if (!localOrder || !localOrder.rawResponse?.order_id) {
        throw new Error("Invalid order ID or missing Porter order_id");
      }

      const porterOrderId = localOrder.rawResponse.order_id;

      const response = await axios.post(
        `${process.env.PORTER_HOST}/v1/orders/${porterOrderId}/cancel`,
        {},
        {
          headers: {
            "x-api-key": process.env.PORTER_API_KEY!,
          },
        }
      );

      const result = response.data;

      await ParcelOrder.findByIdAndUpdate(req.orderId, {
        status: "cancelled",
      });

      return {
        code: result.code,
        message: result.message || "Order cancelled successfully",
      };
    } catch (error: any) {
      const status = error.response?.status;
      const body = error.response?.data;

      const apiError: PorterApiError = {
        code: status || 500,
        type: body?.type || "unknown_error",
        message:
          body?.message ||
          "An unexpected error occurred while cancelling the order",
      };

      console.error("Porter API error:", apiError);

      const err = new Error(apiError.message) as Error & {
        code: number;
        type: string;
      };
      err.code = apiError.code;
      err.type = apiError.type;
      throw err;
    }
  }
}
