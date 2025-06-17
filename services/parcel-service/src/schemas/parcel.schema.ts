import { FastifySchema } from "fastify";

export const getQuoteSchema: FastifySchema = {
  description: "Get quotes from all parcel providers",
  tags: ["Parcels"],
  body: {
    type: "object",
    required: ["pickup_details", "drop_details", "customer"],
    properties: {
      pickup_details: {
        type: "object",
        required: ["lat", "lng"],
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
        },
      },
      drop_details: {
        type: "object",
        required: ["lat", "lng"],
        properties: {
          lat: { type: "number" },
          lng: { type: "number" },
        },
      },
      customer: {
        type: "object",
        required: ["name", "mobile"],
        properties: {
          name: { type: "string" },
          mobile: {
            type: "object",
            required: ["country_code", "number"],
            properties: {
              country_code: { type: "string" },
              number: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export const createOrderSchema: FastifySchema = {
  description: "Create a parcel order using selected provider",
  tags: ["Parcels"],
  body: {
    type: "object",
    required: ["provider", "request_id", "pickup_details", "drop_details"],
    properties: {
      provider: { type: "string" },
      request_id: { type: "string" },
      delivery_instructions: {
        type: "object",
        properties: {
          instructions_list: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                description: { type: "string" },
              },
              required: ["type", "description"],
            },
          },
        },
      },
      pickup_details: {
        type: "object",
        required: ["address"],
        properties: {
          address: {
            type: "object",
            required: [
              "apartment_address",
              "street_address1",
              "street_address2",
              "landmark",
              "city",
              "state",
              "pincode",
              "country",
              "lat",
              "lng",
              "contact_details",
            ],
            properties: {
              apartment_address: { type: "string" },
              street_address1: { type: "string" },
              street_address2: { type: "string" },
              landmark: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              pincode: { type: "string" },
              country: { type: "string" },
              lat: { type: "number" },
              lng: { type: "number" },
              contact_details: {
                type: "object",
                required: ["name", "phone_number"],
                properties: {
                  name: { type: "string" },
                  phone_number: { type: "string" },
                },
              },
            },
          },
        },
      },
      drop_details: {
        type: "object",
        required: ["address"],
        properties: {
          address: {
            type: "object",
            required: [
              "apartment_address",
              "street_address1",
              "street_address2",
              "landmark",
              "city",
              "state",
              "pincode",
              "country",
              "lat",
              "lng",
              "contact_details",
            ],
            properties: {
              apartment_address: { type: "string" },
              street_address1: { type: "string" },
              street_address2: { type: "string" },
              landmark: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              pincode: { type: "string" },
              country: { type: "string" },
              lat: { type: "number" },
              lng: { type: "number" },
              contact_details: {
                type: "object",
                required: ["name", "phone_number"],
                properties: {
                  name: { type: "string" },
                  phone_number: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getOrderStatusSchema: FastifySchema = {
  description: "Get order status from a parcel provider",
  tags: ["Parcels"],
  body: {
    type: "object",
    required: ["provider", "orderId"],
    properties: {
      provider: { type: "string" },
      orderId: { type: "string" },
    },
  },
};

export const cancelOrderSchema: FastifySchema = {
  description: "Cancel an existing parcel order via provider",
  tags: ["Parcels"],
  body: {
    type: "object",
    required: ["provider", "orderId"],
    properties: {
      provider: { type: "string" },
      orderId: { type: "string" },
    },
  },
};
