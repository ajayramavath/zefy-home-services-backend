import { FareRequest, FareResponse, Credentials } from "@zf/types";

export abstract class BaseAggregator {
  abstract name: string;
  abstract linkAccount(creds: unknown): Promise<Credentials>;
  abstract getFares(
    creds: Credentials,
    req: FareRequest
  ): Promise<FareResponse[]>;
}
