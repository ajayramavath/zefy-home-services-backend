// services/aggregator-service/src/aggregators/GozoAdapter.ts
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import {
  BaseAggregator,
  CreateBookingRequest,
  BookingResult,
} from "./BaseAggregator";
import {
  FareRequest,
  FareResponse,
  Credentials,
  TripType,
  OutstationSubType,
  AirportSubType,
} from "@zf/types"; // or '@zf/types'

interface GozoHoldSuccess {
  bookingId: string;
  referenceId: string;
  statusDesc: string;
  statusCode: number;
  // …plus any other fields
}

interface GozoHoldResponse {
  success: boolean;
  data?: GozoHoldSuccess;
  errorCode?: number;
  errors?: string[];
}

interface GozoConfirmSuccess {
  bookingId: string;
  referenceId: string;
  statusDesc: string;
  statusCode: number;
  // …plus any other fields
}

interface GozoConfirmResponse {
  success: boolean;
  data?: GozoConfirmSuccess;
  errorCode?: number;
  errors?: string[];
}

export default class GozoAdapter extends BaseAggregator {
  public readonly name = "gozo";
  private readonly apiKey: string;
  private readonly userServiceBaseUrl: string;

  constructor(apiKey: string, userServiceBaseUrl: string) {
    super();
    this.apiKey = apiKey;
    this.userServiceBaseUrl = "http://user-service:3000";
  }

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

  async getFares(
    creds: Credentials,
    req: FareRequest
  ): Promise<FareResponse[]> {
    // const apiKey = creds.apiKey;
    // if (!apiKey) {
    //   throw new Error('GozoAdapter: Missing apiKey in credentials');
    // }

    //
    // 1) Map string tripType → Gozo numeric code
    //
    let gozoTripType: number;
    switch (req.tripType as TripType) {
      case "outstation":
        // must have subType = 'oneWay' | 'roundTrip'
        if (!req.subType) {
          throw new Error(
            'GozoAdapter: subType is required when tripType="outstation"'
          );
        }
        const outSub = req.subType as OutstationSubType;
        gozoTripType =
          outSub === "oneWay" ? 1 : outSub === "roundTrip" ? 2 : NaN;
        if (isNaN(gozoTripType)) {
          throw new Error(
            `GozoAdapter: invalid subType="${req.subType}" for outstation`
          );
        }
        break;

      case "airport":
        // must have subType = 'pickup' | 'dropOff'
        if (!req.subType) {
          throw new Error(
            'GozoAdapter: subType is required when tripType="airport"'
          );
        }
        const airSub = req.subType as AirportSubType;
        if (airSub === "pickup" || airSub === "dropOff") {
          gozoTripType = 4;
        } else {
          throw new Error(
            `GozoAdapter: invalid subType="${req.subType}" for airport`
          );
        }
        break;

      case "urban":
        // treat urban exactly like one‐way (Gozo’s code=1)
        gozoTripType = 1;
        break;

      case "dayRental4":
        // day rental (4hr/40km), code=9
        gozoTripType = 9;
        break;
      case "dayRental4":
        // day rental (8hr/80km), code=9
        gozoTripType = 10;
        break;
      case "dayRental4":
        // day rental (12hr/120km), code=9
        gozoTripType = 11;
        break;

      default:
        throw new Error(`GozoAdapter: unsupported tripType="${req.tripType}"`);
    }

    //
    // 2) Map vehicleType → Gozo cabType array
    //
    let gozoCabType: number[];
    switch (req.vehicleType) {
      case "hatchback":
        gozoCabType = [1, 72];
        break;
      case "sedan":
        gozoCabType = [3, 5, 73];
        break;
      case "suv":
        gozoCabType = [2, 6, 74];
        break;
      case "all":
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

    if (req.tripType === "outstation") {
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
      if ((req.subType as OutstationSubType) === "roundTrip") {
        if (!req.returnDate) {
          throw new Error(
            "GozoAdapter: returnDate is required for outstation roundTrip"
          );
        }
        const [rdDate, rdTime] = req.returnDate.split(" ");
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
    } else if (req.tripType === "airport") {
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
      if (airSub === "pickup") {
        source.isAirport = 1;
      } else if (airSub === "dropOff") {
        destination.isAirport = 1;
      }

      routes.push({
        startDate: req.startDate,
        startTime: req.startTime,
        source,
        destination,
      });
    } else if (req.tripType === "urban") {
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

    if (
      req.tripType === "outstation" &&
      (req.subType as OutstationSubType) === "roundTrip"
    ) {
      body.returnDate = req.returnDate;
    }

    try {
      //
      // 5) POST to Gozo with Basic + x-api-key
      //
      const response = await axios.post(
        "http://gozotech2.ddns.net:6183/api/cpapi/booking/getQuote",
        body,
        {
          headers: {
            Authorization: "Basic M2JlNmE5MzMxYjg2NDllN2M4YTdmMTRjZGZhOTAyY2Y",
            "Content-Type": "application/json",
            // "x-api-key": apiKey,
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
          currency: "INR",
          estimatedTimeMinutes: gozoPayload.data.estimatedDuration,
          vehicleType: entry.cab.type,
          vehicleCode: entry.cab.id,
          raw: entry,
        } as FareResponse;
      });
    } catch (err: any) {
      const status = err.response?.status;
      const payload = err.response?.data;
      throw new Error(
        `GozoAdapter: API request failed` +
          (status ? ` (status ${status})` : "") +
          (payload ? ` – ${JSON.stringify(payload)}` : "")
      );
    }
  }

  async createBooking(
    creds: Credentials,
    req: CreateBookingRequest
  ): Promise<BookingResult> {
    // 1) Fetch user info from user-service
    let user: {
      firstName: string;
      lastName: string;
      email: string;
      phoneCode: string;
      phoneNumber: string;
      address?: string;
      gstin?: string;
    };
    try {
      const userRes = await axios.get(
        `${this.userServiceBaseUrl}/users/${req.userId}`
      );
      user = userRes.data;
    } catch (err: any) {
      throw new Error(
        `createBooking: failed to fetch user ${req.userId} – ${err.message}`
      );
    }

    // 2) Generate a unique referenceId for Gozo
    const referenceId = `GOZO-${uuidv4()}`;

    // 3) Map FareRequest + extras → Gozo’s Hold payload
    let gozoTripType: number;
    switch (req.tripType as TripType) {
      case "outstation":
        if (!req.subType) {
          throw new Error(
            'GozoAdapter.createBooking: subType required when tripType="outstation"'
          );
        }
        const outSub = req.subType as OutstationSubType;
        gozoTripType =
          outSub === "oneWay" ? 1 : outSub === "roundTrip" ? 2 : NaN;
        if (isNaN(gozoTripType)) {
          throw new Error(
            `GozoAdapter.createBooking: invalid subType="${req.subType}" for outstation`
          );
        }
        break;

      case "airport":
        if (!req.subType) {
          throw new Error(
            'GozoAdapter.createBooking: subType required when tripType="airport"'
          );
        }
        const airSub = req.subType as AirportSubType;
        if (airSub === "pickup" || airSub === "dropOff") {
          gozoTripType = 4;
        } else {
          throw new Error(
            `GozoAdapter.createBooking: invalid subType="${req.subType}" for airport`
          );
        }
        break;

      case "urban":
        gozoTripType = 1;
        break;

      case "dayRental4":
        gozoTripType = 9;
        break;
      case "dayRental8":
        gozoTripType = 10;
        break;
      case "dayRental12":
        gozoTripType = 11;
        break;

      default:
        throw new Error(
          `GozoAdapter.createBooking: unsupported tripType="${req.tripType}"`
        );
    }

    // 4) Convert vehicleType → Gozo’s numeric array
    let gozoCabType: number[];
    switch (req.vehicleType) {
      case "hatchback":
        gozoCabType = [1, 72];
        break;
      case "sedan":
        gozoCabType = [3, 5, 73];
        break;
      case "suv":
        gozoCabType = [2, 6, 74];
        break;
      case "all":
        gozoCabType = [1, 2, 3, 5, 6, 14, 15, 16, 73, 74, 75];
        break;
      default:
        throw new Error(
          `GozoAdapter.createBooking: unsupported vehicleType="${req.vehicleType}"`
        );
    }

    // 5) Build Gozo’s “routes” array
    const routes: Array<{
      startDate: string;
      startTime: string;
      source: any;
      destination: any;
    }> = [];

    if (req.tripType === "outstation") {
      // → outbound leg
      routes.push({
        startDate: req.startDate,
        startTime: req.startTime,
        source: {
          address: req.fromAddress,
          coordinates: { latitude: req.fromLat, longitude: req.fromLng },
        },
        destination: {
          address: req.toAddress,
          coordinates: { latitude: req.toLat, longitude: req.toLng },
        },
      });
      // → return leg if roundTrip
      if ((req.subType as OutstationSubType) === "roundTrip") {
        if (!req.returnDate) {
          throw new Error(
            "GozoAdapter.createBooking: returnDate required for outstation roundTrip"
          );
        }
        const [rdDate, rdTime] = req.returnDate.split(" ");
        routes.push({
          startDate: rdDate,
          startTime: rdTime,
          source: {
            address: req.toAddress,
            coordinates: { latitude: req.toLat, longitude: req.toLng },
          },
          destination: {
            address: req.fromAddress,
            coordinates: { latitude: req.fromLat, longitude: req.fromLng },
          },
        });
      }
    } else if (req.tripType === "airport") {
      // single leg, mark isAirport=1 on pickup/drop side
      const source: any = {
        address: req.fromAddress,
        coordinates: { latitude: req.fromLat, longitude: req.fromLng },
      };
      const destination: any = {
        address: req.toAddress,
        coordinates: { latitude: req.toLat, longitude: req.toLng },
      };
      const airSub = req.subType as AirportSubType;
      if (airSub === "pickup") {
        source.isAirport = 1;
      } else if (airSub === "dropOff") {
        destination.isAirport = 1;
      }
      routes.push({
        startDate: req.startDate,
        startTime: req.startTime,
        source,
        destination,
      });
    } else if (req.tripType === "urban") {
      // local one‐way
      routes.push({
        startDate: req.startDate,
        startTime: req.startTime,
        source: {
          address: req.fromAddress,
          coordinates: { latitude: req.fromLat, longitude: req.fromLng },
        },
        destination: {
          address: req.toAddress,
          coordinates: { latitude: req.toLat, longitude: req.toLng },
        },
      });
    } else {
      // rental (one leg with same pick/drop)
      routes.push({
        startDate: req.startDate,
        startTime: req.startTime,
        source: {
          address: req.fromAddress,
          coordinates: { latitude: req.fromLat, longitude: req.fromLng },
        },
        destination: {
          address: req.fromAddress,
          coordinates: { latitude: req.fromLat, longitude: req.fromLng },
        },
      });
    }

    // 6) Build the Gozo “Hold” payload (getQuote)
    const holdBody: any = {
      tnc: 1,
      referenceId: referenceId,
      tripType: gozoTripType,
      cabType: gozoCabType,
      fare: {
        advanceReceived: 0,
        totalAmount: req.price,
      },
      platform: {
        deviceName: "",
        ip: "",
        type: "",
      },
      apkVersion: "",
      sendEmail: 1,
      sendSms: 1,
      routes: routes,
      traveller: {
        firstName: user.firstName,
        lastName: user.lastName,
        primaryContact: {
          code: user.phoneCode,
          number: user.phoneNumber,
        },
        alternateContact: { code: "", number: "" },
        email: user.email,
        companyName: "",
        address: user.address || "",
        gstin: user.gstin || "",
      },
      additionalInfo: {
        specialInstructions: "",
        noOfPerson: req.passengers ?? 1,
        noOfLargeBags: 0,
        noOfSmallBags: 0,
        carrierRequired: 0,
        kidsTravelling: 0,
        seniorCitizenTravelling: 0,
        womanTravelling: 0,
      },
    };

    // If outstation roundTrip, Gozo also expects returnDate
    if (
      req.tripType === "outstation" &&
      (req.subType as OutstationSubType) === "roundTrip"
    ) {
      holdBody.returnDate = req.returnDate;
    }

    // 7) Call Gozo’s Hold (getQuote) endpoint
    let holdRes: GozoHoldResponse;
    try {
      const response = await axios.post<GozoHoldResponse>(
        "http://gozotech2.ddns.net:6183/api/cpapi/booking/getQuote",
        holdBody,
        {
          headers: {
            Authorization: "Basic M2JlNmE5MzMxYjg2NDllN2M4YTdmMTRjZGZhOTAyY2Y",
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
        }
      );
      holdRes = response.data;
    } catch (err: any) {
      throw new Error(
        `createBooking: Gozo hold (getQuote) failed – ${
          err.response?.status || ""
        } ${err.response?.data || err.message}`
      );
    }

    if (!holdRes.success || !holdRes.data) {
      throw {
        type: "HoldError",
        errorCode: holdRes.errorCode || 500,
        errors: holdRes.errors || ["Unknown hold error"],
      };
    }

    // 8) Extract Gozo’s “bookingId” from hold response
    const gozoBookingId = holdRes.data.bookingId;

    // 9) Call Gozo’s Confirm endpoint
    let confirmRes: GozoConfirmResponse;
    try {
      const response = await axios.post<GozoConfirmResponse>(
        "http://gozotech2.ddns.net:6183/api/cpapi/booking/confirm",
        { bookingId: gozoBookingId },
        {
          headers: {
            Authorization: "Basic M2JlNmE5MzMxYjg2NDllN2M4YTdmMTRjZGZhOTAyY2Y",
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
        }
      );
      confirmRes = response.data;
    } catch (err: any) {
      throw new Error(
        `createBooking: Gozo confirm failed – ${err.response?.status || ""} ${
          err.response?.data || err.message
        }`
      );
    }

    if (!confirmRes.success || !confirmRes.data) {
      throw {
        type: "ConfirmError",
        errorCode: confirmRes.errorCode || 500,
        errors: confirmRes.errors || ["Unknown confirm error"],
      };
    }

    // 10) Return a BookingResult on success
    return {
      bookingId: confirmRes.data.bookingId,
      referenceId: confirmRes.data.referenceId,
      statusDesc: confirmRes.data.statusDesc,
      statusCode: confirmRes.data.statusCode,
      // …you can spread any other confirmRes.data fields if needed…
    };
  }
}
