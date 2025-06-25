// services/aggregator-service/src/aggregators/GozoAdapter.ts
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import {
  BaseAggregator,
  CreateBookingRequest,
  BookingResult,
  CancellationReason,
  CancelBookingRequest,
  CancellationResult,
  ListBookingResult,
  BookingDetailsResult,
} from "./BaseAggregator";
import {
  FareRequest,
  FareResponse,
  Credentials,
  TripType,
  OutstationSubType,
  AirportSubType,
} from "@zf/types"; // or '@zf/types'
import { BookingModel, BookingStatus } from "../models/Booking.model";

interface GozoHoldSuccess {
  bookingId: string;
  referenceId: string;
  statusDesc: string;
  statusCode: number;
  cabRate: {
    cab: object;
    fare: object;
    cabModels: object;
  };
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
  cabRate: {
    cab: object;
    fare: object;
    cabModels: object;
  };
  // …plus any other fields
}

interface GozoConfirmResponse {
  success: boolean;
  data?: GozoConfirmSuccess;
  errorCode?: number;
  errors?: string[];
}

interface GozoCancellationListResponse {
  success: boolean;
  data?: { cancellationList: CancellationReason[] };
  errorCode?: number;
  errors?: string[];
}
interface GozoCancelResponse {
  success: boolean;
  data?: {
    bookingId: string;
    message: string;
    cancellationCharge: number;
    refundAmount: number;
  };
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
        // day rental (8hr/80km), code=10
        gozoTripType = 10;
        break;
      case "dayRental4":
        // day rental (12hr/120km), code=11
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
    console.log("body--->", JSON.stringify(body));
    try {
      //
      // 5) POST to Gozo with Basic + x-api-key
      //
      const response = await axios.post(
        "http://gozotech2.ddns.net:5192/api/cpapi/booking/getQuote",
        body,
        {
          headers: {
            Authorization: "Basic YWYzZWU1ZjJlMjIwZjAwYjIzNTdiY2E2MDZhMjQ1N2U=",
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
          rawVehicleType: req.vehicleType,
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
      console.log(`${this.userServiceBaseUrl}/users/getData/${req.userId}`);
      const userRes = await axios.get(
        `${this.userServiceBaseUrl}/users/getData/${req.userId}`
      );
      user = userRes.data;
    } catch (err: any) {
      throw new Error(
        `createBooking: failed to fetch user ${req.userId} – ${err.message}`
      );
    }

    // 2) Generate a unique referenceId for Gozo
    const referenceId = `ZFY${uuidv4()}`;

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
    let gozoCabType: number = req.vehicleCode;

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
        advanceReceived: req.price,
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
          code: user.phoneCode || "91",
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
    console.log("request body------>", JSON.stringify(holdBody));
    // 7) Call Gozo’s Hold (getQuote) endpoint
    let holdRes: GozoHoldResponse;
    try {
      const response = await axios.post<GozoHoldResponse>(
        "http://gozotech2.ddns.net:5192/api/cpapi/booking/hold",
        holdBody,
        {
          headers: {
            Authorization: "Basic YWYzZWU1ZjJlMjIwZjAwYjIzNTdiY2E2MDZhMjQ1N2U=",
            "Content-Type": "application/json",
            // "x-api-key": this.apiKey,
          },
        }
      );
      holdRes = response.data;
      console.log("response----->", holdRes);
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

    await BookingModel.create({
      universalBookingId: referenceId,
      adapter: this.name,
      adapterBookingId: gozoBookingId,
      status: BookingStatus.CREATED,
      requestPayload: req,
      holdResponse: holdRes.data,
      tripType: gozoTripType,
      cabType: gozoCabType,
      vehicleType: req.vehicleType, // or store the full array if you prefer
      startDate: req.startDate,
      startTime: req.startTime,
    });

    return {
      bookingId: holdRes.data.bookingId,
      fareData: holdRes.data?.cabRate?.fare,
      cabData: holdRes.data?.cabRate?.cab,
      referenceId: holdRes.data.referenceId,
      statusDesc: holdRes.data.statusDesc,
      statusCode: holdRes.data.statusCode,
    };
  }

  async confirmBooking(req: {
    aggregator: string;
    referenceId: string;
  }): Promise<BookingResult> {
    const booking = await BookingModel.findOne({
      adapter: req.aggregator,
      universalBookingId: req.referenceId,
    }).lean();
    if (!booking) {
      throw new Error(
        `confirm booking: failed to fetch booking - ${req.referenceId} `
      );
    }
    const gozoBookingId = booking.adapterBookingId;
    // 9) Call Gozo’s Confirm endpoint
    let confirmRes: GozoConfirmResponse;
    try {
      const response = await axios.post<GozoConfirmResponse>(
        "http://gozotech2.ddns.net:5192/api/cpapi/booking/confirm",
        { bookingId: gozoBookingId },
        {
          headers: {
            Authorization: "Basic YWYzZWU1ZjJlMjIwZjAwYjIzNTdiY2E2MDZhMjQ1N2U=",
            "Content-Type": "application/json",
            // "x-api-key": this.apiKey,
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
    console.log(confirmRes);
    await BookingModel.findOneAndUpdate(
      { universalBookingId: req.referenceId },
      {
        adapterBookingId: confirmRes.data.bookingId,
        status: "confirmed",
        confirmResponse: confirmRes.data,
      }
    );
    // 10) Return a BookingResult on success
    return {
      bookingId: confirmRes.data.bookingId,
      referenceId: confirmRes.data.referenceId,
      statusDesc: confirmRes.data.statusDesc,
      statusCode: confirmRes.data.statusCode,
      // fareData: confirmRes.data?.cabRate?.fare,
      // cabData: confirmRes.data?.cabRate?.cab,
    };
  }

  async getBookingDetails(
    creds: Credentials,
    universalBookingId: string,
    userId: string
  ): Promise<BookingDetailsResult> {
    // 1) Retrieve the saved booking to get Gozo's bookingId
    const booking = await BookingModel.findOne({ universalBookingId }).lean();
    if (!booking || !booking.adapterBookingId) {
      throw new Error(`Booking not found for id ${universalBookingId}`);
    }
    console.log("booking----->", booking);
    const gozoBookingId = booking.adapterBookingId;
    console.log("gozoBookingId----->", gozoBookingId);
    // 2) Call Gozo's Details endpoint
    let detailRes: {
      success: boolean;
      data?: any;
      errorCode?: number;
      errors?: string[];
    };
    try {
      const response = await axios.post(
        "http://gozotech2.ddns.net:5192/api/cpapi/booking/getDetails",
        { bookingId: gozoBookingId },
        {
          headers: {
            Authorization: "Basic YWYzZWU1ZjJlMjIwZjAwYjIzNTdiY2E2MDZhMjQ1N2U=",
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
        }
      );
      detailRes = response.data;
      console.log("detailRes------->", detailRes);
    } catch (err: any) {
      throw new Error(
        `getBookingDetails: Gozo details API failed – ${
          err.response?.status || ""
        } ${err.response?.data || err.message}`
      );
    }

    if (!detailRes.success || !detailRes.data) {
      throw {
        type: "DetailsError",
        errorCode: detailRes.errorCode || 500,
        errors: detailRes.errors || ["Unknown details error"],
      };
    }

    // 3) Format response for our app
    // const raw = detailRes.data;
    console.log("fare------>", booking?.confirmResponse?.cabRate?.fare);
    console.log(booking?.confirmResponse);
    const formatted = {
      userId,
      universalBookingId,
      adapterBookingId: booking.adapterBookingId,
      tripType: booking.requestPayload.tripType,
      subType: booking.requestPayload.subType || null,
      status: booking.status,
      source: booking.requestPayload.fromAddress,
      destination: booking.requestPayload.toAddress,
      sourceLat: booking.requestPayload.fromLat,
      sourceLng: booking.requestPayload.fromLng,
      destLat: booking.requestPayload.toLat,
      destLng: booking.requestPayload.toLng,
      vehicleType:
        booking.requestPayload.vehicleType ||
        booking.requestPayload.rawVehicleType,
      fare: booking?.confirmResponse?.cabRate?.fare,
      cabDetails: booking?.confirmResponse?.cabRate?.cab,
      driverDetails: booking?.driverDetails,
      otp: booking?.otp || "",
      assignedVehicle: booking?.assignedVehicle,
      createdAt: booking.createdAt,
      startDate: booking.startDate,
      startTime: booking.startTime,
      rideStatusUpdates: booking.rideStatusUpdates,
    };

    return formatted;
  }

  async getCancellationList(creds: Credentials): Promise<CancellationReason[]> {
    try {
      const response = await axios.post<GozoCancellationListResponse>(
        `http://gozotech2.ddns.net:5192/api/cpapi/booking/getCancellationList`,
        {},
        {
          headers: {
            Authorization:
              "Basic  YWYzZWU1ZjJlMjIwZjAwYjIzNTdiY2E2MDZhMjQ1N2U=",
            "Content-Type": "application/json",
            // "x-api-key": this.apiKey,
          },
        }
      );
      const payload = response.data;
      if (!payload.success || !payload.data) {
        throw {
          type: "CancelListError",
          errorCode: payload.errorCode || 500,
          errors: payload.errors || ["Failed to fetch cancellation list"],
        };
      }
      return payload.data.cancellationList;
    } catch (err: any) {
      // Network or unexpected
      throw new Error(`getCancellationList failed – ${err.message}`);
    }
  }

  async cancelBooking(
    creds: Credentials,
    req: CancelBookingRequest
  ): Promise<CancellationResult> {
    let cancelRes: GozoCancelResponse;
    try {
      const response = await axios.post<GozoCancelResponse>(
        `http://gozotech2.ddns.net:5192/api/cpapi/booking/cancelBooking`,
        {
          bookingId: req.bookingId,
          reasonId: req.reasonId,
          reason: req.reason,
        },
        {
          headers: {
            Authorization:
              "Basic  YWYzZWU1ZjJlMjIwZjAwYjIzNTdiY2E2MDZhMjQ1N2U=",
            "Content-Type": "application/json",
            // "x-api-key": this.apiKey,
          },
        }
      );
      cancelRes = response.data;
    } catch (err: any) {
      throw new Error(`cancelBooking failed – ${err.message}`);
    }

    if (!cancelRes.success || !cancelRes.data) {
      throw {
        type: "CancelError",
        errorCode: cancelRes.errorCode || 500,
        errors: cancelRes.errors || ["Cancellation failed"],
      };
    }

    // Update our Booking collection to status = CANCELED
    await BookingModel.findOneAndUpdate(
      { adapterBookingId: req.bookingId },
      {
        status: BookingStatus.CANCELED,
        raw: cancelRes.data,
      }
    );

    //Return the normalized cancellation result
    return {
      bookingId: cancelRes.data.bookingId,
      message: cancelRes.data.message,
      cancellationCharge: cancelRes.data.cancellationCharge,
      refundAmount: cancelRes.data.refundAmount,
    };
  }

  /**
   * List all bookings made by a given user through this aggregator.
   */
  public async listBookings(
    creds: Credentials,
    userId: string
  ): Promise<ListBookingResult[]> {
    // 1) Query our Booking collection for this user + this adapter
    const docs = await BookingModel.find({
      adapter: this.name,
      "requestPayload.userId": userId,
      status: { $ne: "created" }, // exclude bookings with status "created"
    }).lean();
    console.log("docs----->", docs);
    // 2) Map each stored booking into a minimal details result
    return docs.map((doc) => ({
      userId,
      universalBookingId: doc.universalBookingId,
      adapterBookingId: doc.adapterBookingId,
      tripType: doc.requestPayload.tripType,
      subType: doc.requestPayload.subType ?? null,
      source: doc.requestPayload.fromAddress,
      destination: doc.requestPayload.toAddress,
      sourceLat: doc.requestPayload.fromLat,
      sourceLng: doc.requestPayload.fromLng,
      destLat: doc.requestPayload.toLat,
      destLng: doc.requestPayload.toLng,
      status: doc.status,
      vehicleType:
        doc.requestPayload.vehicleType || doc.requestPayload.rawVehicleType,
      // fare: doc.confirmResponse?.cabRate?.fare || {},
      // cabDetails: doc.confirmResponse?.cabRate?.cab || {},
    }));
  }
}
