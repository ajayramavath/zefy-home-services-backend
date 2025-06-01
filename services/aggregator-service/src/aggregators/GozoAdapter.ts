import axios from 'axios';
import { BaseAggregator } from './BaseAggregator';
import { FareRequest, FareResponse, Credentials } from '@zf/types'; // or '@ms/types'

export default class GozoAdapter extends BaseAggregator {
  public readonly name = 'gozo';
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
      typeof creds !== 'object' ||
      creds === null ||
      typeof (creds as any).apiKey !== 'string'
    ) {
      throw new Error('GozoAdapter: expected { apiKey: string }');
    }
    return { apiKey: (creds as any).apiKey };
  }

  /**
   * Takes our updated FareRequest (with fromLat/fromLng, toLat/toLng) 
   * and builds Gozo’s payload accordingly.  
   * Then calls Gozo’s API with Basic auth and returns a normalized array.
   */
  async getFares(
    creds: Credentials,
    req: FareRequest
  ): Promise<FareResponse[]> {
    const apiKey = creds.apiKey;
    if (!apiKey) {
      throw new Error('GozoAdapter: Missing apiKey in credentials');
    }

    //
    // 1) Map tripType + subType → Gozo’s numeric tripType code
    //
    let tripTypeCode: number;
    if (req.tripType === 'outstation') {
      if (req.subType === 'oneway') {
        tripTypeCode = 1;
      } else if (req.subType === 'roundtrip') {
        tripTypeCode = 2;
      } else {
        throw new Error(
          'GozoAdapter: For tripType="outstation", subType must be "oneway" or "roundtrip"'
        );
      }
    } else if (req.tripType === 'airport') {
      tripTypeCode = 4;
    } else if (req.tripType === 'dayRental4') {
      tripTypeCode = 9;
    } else if (req.tripType === 'dayRental8') {
      tripTypeCode = 10;
    } else if (req.tripType === 'dayRental12') {
      tripTypeCode = 11;
    } else {
      // Default to ONE WAY if not recognized
      tripTypeCode = 1;
    }

    //
    // 2) Map vehicleType → Gozo’s cabType array
    //
    let cabType: number[];
    switch (req.vehicleType) {
      case 'hatchback':
        cabType = [1, 72];
        break;
      case 'sedan':
        cabType = [3, 5, 73];
        break;
      case 'suv':
        cabType = [2, 6, 74];
        break;
      case 'all':
        cabType = [1, 2, 3, 5, 6, 14, 15, 16, 73, 74, 75];
        break;
      default:
        throw new Error(
          'GozoAdapter: vehicleType must be "hatchback", "sedan", "suv", or "all"'
        );
    }

    //
    // 3) Build Gozo’s routes array using fromLat/fromLng and toLat/toLng
    //
    const routes = [
      {
        startDate: req.startDate,
        startTime: req.startTime,
        source: {
          address: req.fromAddress,
          coordinates: {
            latitude: req.fromLat,
            longitude: req.fromLng
          }
        },
        destination: {
          address: req.toAddress,
          coordinates: {
            latitude: req.toLat,
            longitude: req.toLng
          }
        }
      }
    ];

    //
    // 4) Assemble Gozo’s request body
    //
    const body = {
      tripType: tripTypeCode,
      cabType,
      routes
    };

    try {
      //
      // 5) Call Gozo’s fare endpoint with Basic auth header
      //
      const response = await axios.post(
        'http://gozotech1.ddns.net:5192/api/cpapi/booking/getQuote',
        body,
        {
          headers: {
            // Replace with your actual Basic token
            Authorization: 'Basic M2JlNmE5MzMxYjg2NDllN2M4YTdmMTRjZGZhOTAyY2Y',
            'Content-Type': 'application/json',
            // If Gozo expects the API key via header:
            'x-api-key': apiKey
          }
        }
      );

      //
      // 6) Normalize Gozo’s response into our FareResponse[]
      //
      const gozoPayload = response.data as {
        success: boolean;
        data: {
          startDate: string;
          startTime: string;
          quotedDistance: number;
          estimatedDuration: number; // minutes
          cabRate: Array<{
            cab: {
              id: number;
              type: string;
              category: string;
              sClass: string;
              instructions: string[];
              model: string;
              image: string;
              seatingCapacity: number;
              bagCapacity: number;
              bigBagCapaCity: number;
              isAssured: string;
            };
            fare: {
              baseFare: number;
              driverAllowance: number;
              gst: number;
              tollIncluded: number;
              stateTaxIncluded: number;
              stateTax: number;
              vendorAmount: number;
              tollTax: number;
              nightPickupIncluded: number;
              nightDropIncluded: number;
              extraPerKmRate: number;
              totalAmount: number;
              airportChargeIncluded: number;
              airportEntryFee: number;
            };
          }>;
        };
      };

      return gozoPayload.data.cabRate.map((entry) => {
        const fareInfo = entry.fare;
        return {
          aggregator: this.name,
          price: fareInfo.totalAmount,
          currency: 'INR',
          estimatedTimeMinutes: gozoPayload.data.estimatedDuration,
          vehicleType: entry.cab.type,
          raw: entry
        } as FareResponse;
      });
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;
      throw new Error(
        `GozoAdapter: API request failed` +
        (status ? ` (status ${status})` : '') +
        (data ? ` – ${JSON.stringify(data)}` : '')
      );
    }
  }
}
