// services/aggregator-service/src/aggregators/GozoAdapter.ts
import axios from "axios";
import { BaseAggregator } from "./BaseAggregator";
import { FareRequest, FareResponse, Credentials } from "@zf/types";

export default class GozoAdapter extends BaseAggregator {
  public readonly name = "gozo";
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  /**
   * For Gozo we link by simply storing an API key.
   * Expects creds = { apiKey: string }.
   */
  async linkAccount(creds: unknown): Promise<Credentials> {
    if (
      typeof creds !== "object" ||
      creds === null ||
      typeof (creds as any).apiKey !== "string"
    ) {
      throw new Error("GozoAdapter: expected { apiKey: string }");
    }
    return { apiKey: (creds as any).apiKey };
  }

  /**
   * Calls Gozo’s fare endpoint via axios and normalizes the response.
   */
  async getFares(
    creds: Credentials,
    req: FareRequest
  ): Promise<FareResponse[]> {
    const apiKey = creds.apiKey;
    if (!apiKey) {
      throw new Error("GozoAdapter: Missing apiKey in credentials");
    }

    try {
      const response = await axios.get("https://api.gozo.com/v1/fare", {
        params: {
          from_lat: apiKey && req.from.lat,
          from_lon: req.from.lon,
          to_lat: req.to.lat,
          to_lon: req.to.lon,
          api_key: apiKey,
        },
      });

      const data = response.data as {
        rates: Array<{
          fare: number;
          currency: string;
          duration_minutes: number;
          vehicle: string;
        }>;
      };

      return data.rates.map((r) => ({
        aggregator: this.name,
        price: r.fare,
        currency: r.currency,
        estimatedTimeMinutes: r.duration_minutes,
        vehicleType: r.vehicle,
        raw: r,
      }));
    } catch (err: any) {
      // You can inspect err.response?.status / data here
      throw new Error(
        `GozoAdapter: API request failed${
          err.response ? ` (status ${err.response.status})` : ""
        }`
      );
    }
  }
}
