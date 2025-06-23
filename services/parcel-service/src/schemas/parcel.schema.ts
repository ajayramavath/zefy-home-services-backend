import { FastifySchema } from "fastify";

const parcelOrderProps = {
  _id: { type: "string" },
  provider: { type: "string" },
  requestId: { type: "string" },
  status: { type: "string" },
  pickup: {
    type: "object",
    properties: {
      address: {
        type: "object",
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
            properties: {
              name: { type: "string" },
              phone_number: { type: "string" },
            },
          },
        },
      },
    },
  },
  drop: {
    type: "object",
    properties: {
      address: {
        /* same as pickup.address */
      },
    },
  },
  deliveryInstructions: {
    type: "object",
    nullable: true,
    properties: {
      instructions_list: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            description: { type: "string" },
          },
        },
      },
    },
  },
  rawResponse: {
    type: "object",
    additionalProperties: true,
  },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};

const errorResponse = {
  type: "object",
  properties: {
    success: { type: "boolean", const: false },
    message: { type: "string" },
  },
};

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
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              provider: { type: "string" },
              quote: {
                type: "object",
                properties: {
                  vehicles: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        eta: { type: ["integer", "null"] },
                        fare: {
                          type: "object",
                          properties: {
                            currency: { type: "string" },
                            minor_amount: { type: "number" },
                          },
                          required: ["currency", "minor_amount"],
                        },
                        capacity: {
                          type: "object",
                          properties: {
                            value: { type: "number" },
                            unit: { type: "string" },
                          },
                          required: ["value", "unit"],
                        },
                        size: {
                          type: "object",
                          properties: {
                            length: {
                              type: "object",
                              properties: {
                                value: { type: "number" },
                                unit: { type: "string" },
                              },
                            },
                            breadth: {
                              type: "object",
                              properties: {
                                value: { type: "number" },
                                unit: { type: "string" },
                              },
                            },
                            height: {
                              type: "object",
                              properties: {
                                value: { type: "number" },
                                unit: { type: "string" },
                              },
                            },
                          },
                          required: ["length", "breadth", "height"],
                        },
                      },
                      required: ["type", "fare", "capacity", "size"],
                    },
                  },
                },
                required: ["vehicles"],
              },
              error: { type: "string", nullable: true },
            },
            required: ["provider"],
          },
        },
      },
    },
    400: errorResponse,
    401: errorResponse,
    500: errorResponse,
  },
};

export const createOrderSchema: FastifySchema = {
  description: "Create a parcel order using selected provider",
  tags: ["Parcels"],
  body: {
    type: "object",
    required: ["provider", "pickup_details", "drop_details"],
    properties: {
      provider: { type: "string" },
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
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: parcelOrderProps,
        },
      },
    },
    400: errorResponse,
    401: errorResponse,
    500: errorResponse,
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
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          anyOf: [
            { type: "null" },
            { type: "object", properties: parcelOrderProps },
          ],
        },
      },
    },
    400: errorResponse,
    401: errorResponse,
    500: errorResponse,
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
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            code: { type: "number" },
            message: { type: "string" },
          },
        },
      },
    },
    400: errorResponse,
    401: errorResponse,
    500: errorResponse,
  },
};

export const listParcelOrdersSchema: FastifySchema = {
  description:
    "List parcel orders for the authenticated user using cursor-based pagination",
  tags: ["Parcels"],
  querystring: {
    type: "object",
    properties: {
      limit: {
        type: "string",
        description: "Maximum number of orders to return (default 10, max 50)",
      },
      cursor: {
        type: "string",
        format: "date-time",
        description:
          "ISO date string of the last order’s createdAt to paginate",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              _id: { type: "string" },
              provider: { type: "string" },
              requestId: { type: "string" },
              status: { type: "string" },
              pickup: { type: "object", additionalProperties: true },
              drop: { type: "object", additionalProperties: true },
              deliveryInstructions: {
                type: "object",
                nullable: true,
                additionalProperties: true,
              },
              rawResponse: { type: "object", additionalProperties: true },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        },
        meta: {
          type: "object",
          properties: {
            limit: { type: "number" },
            nextCursor: {
              type: ["string", "null"],
              format: "date-time",
            },
            hasMore: { type: "boolean" },
          },
        },
      },
    },
    401: errorResponse,
    400: errorResponse,
    500: errorResponse,
  },
};

export const getParcelOrderByIdSchema: FastifySchema = {
  description: "Fetch a single parcel order using its unique _id",
  tags: ["Parcels"],
  params: {
    type: "object",
    required: ["orderId"],
    properties: {
      orderId: {
        type: "string",
        description: "MongoDB _id of the parcel order",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            _id: { type: "string" },
            provider: { type: "string" },
            requestId: { type: "string" },
            status: { type: "string" },
            pickup: { type: "object", additionalProperties: true },
            drop: { type: "object", additionalProperties: true },
            deliveryInstructions: {
              type: "object",
              nullable: true,
              additionalProperties: true,
            },
            rawResponse: { type: "object", additionalProperties: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    400: errorResponse,
    404: errorResponse,
    500: errorResponse,
  },
};
