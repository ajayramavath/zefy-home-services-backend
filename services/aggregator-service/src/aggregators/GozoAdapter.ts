// services/aggregator-service/src/aggregators/GozoAdapter.ts
import axios from 'axios';
import { BaseAggregator } from './BaseAggregator';
import {
  FareRequest,
  FareResponse,
  Credentials,
  TripType,
  OutstationSubType,
  AirportSubType,
} from '@zf/types'; // or '@zf/types'

export default class GozoAdapter extends BaseAggregator {
  public readonly name = 'gozo';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

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

  async getFares(
    creds: Credentials,
    req: FareRequest
  ): Promise<FareResponse[]> {
    const apiKey = creds.apiKey;
    if (!apiKey) {
      throw new Error('GozoAdapter: Missing apiKey in credentials');
    }

    //
    // 1) Map string tripType → Gozo numeric code
    //
    let gozoTripType: number;
    switch (req.tripType as TripType) {
      case 'outstation':
        // must have subType = 'oneWay' | 'roundTrip'
        if (!req.subType) {
          throw new Error(
            'GozoAdapter: subType is required when tripType="outstation"'
          );
        }
        const outSub = req.subType as OutstationSubType;
        gozoTripType =
          outSub === 'oneWay' ? 1 : outSub === 'roundTrip' ? 2 : NaN;
        if (isNaN(gozoTripType)) {
          throw new Error(
            `GozoAdapter: invalid subType="${req.subType}" for outstation`
          );
        }
        break;

      case 'airport':
        // must have subType = 'pickup' | 'dropOff'
        if (!req.subType) {
          throw new Error(
            'GozoAdapter: subType is required when tripType="airport"'
          );
        }
        const airSub = req.subType as AirportSubType;
        if (airSub === 'pickup' || airSub === 'dropOff') {
          gozoTripType = 4;
        } else {
          throw new Error(
            `GozoAdapter: invalid subType="${req.subType}" for airport`
          );
        }
        break;

      case 'urban':
        // treat urban exactly like one‐way (Gozo’s code=1)
        gozoTripType = 1;
        break;

      case 'dayRental4':
        // day rental (4hr/40km), code=9
        gozoTripType = 9;
        break;
      case 'dayRental4':
        // day rental (8hr/80km), code=9
        gozoTripType = 10;
        break;
      case 'dayRental4':
        // day rental (12hr/120km), code=9
        gozoTripType = 11;
        break;

      default:
        throw new Error(
          `GozoAdapter: unsupported tripType="${req.tripType}"`
        );
    }

    //
    // 2) Map vehicleType → Gozo cabType array
    //
    let gozoCabType: number[];
    switch (req.vehicleType) {
      case 'hatchback':
        gozoCabType = [1, 72];
        break;
      case 'sedan':
        gozoCabType = [3, 5, 73];
        break;
      case 'suv':
        gozoCabType = [2, 6, 74];
        break;
      case 'all':
        gozoCabType = [1, 2, 3, 5, 6, 14, 15, 16, 73, 74, 75];
        break;
      default:
        throw new Error(
          `GozoAdapter: unsupported vehicleType="${req.vehicleType}"`
        );
    }

    //
    // 3) Build Gozo’s routes[] exactly as per tripType/subType
    //
    const routes: Array<{
      startDate: string;
      startTime: string;
      source: any;
      destination: any;
    }> = [];

    if (req.tripType === 'outstation') {
      // TWO‐LEG: first leg = “one‐way” outward, second = return
      // Outward
      routes.push({
        startDate: req.startDate,
        startTime: req.startTime,
        source: {
          address: req.fromAddress,
          coordinates: {
            latitude: req.fromLat,
            longitude: req.fromLng,
          },
        },
        destination: {
          address: req.toAddress,
          coordinates: {
            latitude: req.toLat,
            longitude: req.toLng,
          },
        },
      });

      // Return leg uses returnDate if subType='roundTrip'
      if ((req.subType as OutstationSubType) === 'roundTrip') {
        if (!req.returnDate) {
          throw new Error(
            'GozoAdapter: returnDate is required for outstation roundTrip'
          );
        }
        const [rdDate, rdTime] = req.returnDate.split(' ');
        routes.push({
          startDate: rdDate,
          startTime: rdTime,
          source: {
            address: req.toAddress,
            coordinates: {
              latitude: req.toLat,
              longitude: req.toLng,
            },
          },
          destination: {
            address: req.fromAddress,
            coordinates: {
              latitude: req.fromLat,
              longitude: req.fromLng,
            },
          },
        });
      }
    } else if (req.tripType === 'airport') {
      // ONE‐LEG: set isAirport=1 on the correct side
      const source: any = {
        address: req.fromAddress,
        coordinates: {
          latitude: req.fromLat,
          longitude: req.fromLng,
        },
      };
      const destination: any = {
        address: req.toAddress,
        coordinates: {
          latitude: req.toLat,
          longitude: req.toLng,
        },
      };

      const airSub = req.subType as AirportSubType;
      if (airSub === 'pickup') {
        source.isAirport = 1;
      } else if (airSub === 'dropOff') {
        destination.isAirport = 1;
      }

      routes.push({
        startDate: req.startDate,
        startTime: req.startTime,
        source,
        destination,
      });
    } else if (req.tripType === 'urban') {
      // ONE LEG local trip (same as one‐way)
      routes.push({
        startDate: req.startDate,
        startTime: req.startTime,
        source: {
          address: req.fromAddress,
          coordinates: {
            latitude: req.fromLat,
            longitude: req.fromLng,
          },
        },
        destination: {
          address: req.toAddress,
          coordinates: {
            latitude: req.toLat,
            longitude: req.toLng,
          },
        },
      });
    } else {
      // rental: one leg with same source/destination
      routes.push({
        startDate: req.startDate,
        startTime: req.startTime,
        source: {
          address: req.fromAddress,
          coordinates: {
            latitude: req.fromLat,
            longitude: req.fromLng,
          },
        },
        destination: {
          address: req.fromAddress,
          coordinates: {
            latitude: req.fromLat,
            longitude: req.fromLng,
          },
        },
      });
    }

    //
    // 4) Build final Gozo payload
    //
    const body: any = {
      tripType: gozoTripType,
      cabType: gozoCabType,
      routes,
    };

    if (req.tripType === 'outstation' && (req.subType as OutstationSubType) === 'roundTrip') {
      body.returnDate = req.returnDate;
    }

    try {
      //
      // 5) POST to Gozo with Basic + x-api-key
      //
      const response = await axios.post(
        'https://api.gozo.com/v1/fare',
        body,
        {
          headers: {
            Authorization:
              'Basic M2JlNmE5MzMxYjg2NDllN2M4YTdmMTRjZGZhOTAyY2Y',
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
        }
      );

      //
      // 6) Normalize Gozo’s response (“gozoPayload formatting”)
      //
      const gozoPayload = response.data as {
        success: boolean;
        data: {
          quotedDistance: number;
          estimatedDuration: number;
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
          raw: entry,
        } as FareResponse;
      });
    } catch (err: any) {
      const status = err.response?.status;
      const payload = err.response?.data;
      throw new Error(
        `GozoAdapter: API request failed` +
        (status ? ` (status ${status})` : '') +
        (payload ? ` – ${JSON.stringify(payload)}` : '')
      );
    }
  }
}
