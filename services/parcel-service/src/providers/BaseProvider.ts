import { QuoteRequest, QuoteResponse } from "@zf/types";

export abstract class BaseProvider {
  abstract name: string;
  abstract getQuote(req: QuoteRequest): Promise<QuoteResponse>;
}
