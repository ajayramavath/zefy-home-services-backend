// services/aggregator-service/src/schemas/aggregator.schema.ts
import { FastifySchema } from 'fastify';

/**
 * LinkAccountBody: { userId: string, aggregator: string }
 * Response: { success: boolean } or errors
 */
export const linkAccountSchema: FastifySchema = {
    description: 'Link an external aggregator account to the given user',
    tags: ['Aggregators'],
    body: {
        type: 'object',
        required: ['userId', 'aggregator'],
        properties: {
            userId: {
                type: 'string',
                description: 'Mongo ObjectId of the user',
                example: '60d21b4667d0d8992e610c85'
            },
            aggregator: {
                type: 'string',
                description: 'Key of the aggregator (e.g. "uber", "ola", "gozo")',
                example: 'gozo'
            }
        }
    },
    response: {
        200: {
            description: 'Account linked successfully',
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true }
            },
            required: ['success']
        },
        400: {
            description: 'Bad request (invalid userId or unknown aggregator)',
            type: 'object',
            properties: {
                error: { type: 'string', example: 'Invalid userId' }
            },
            required: ['error']
        },
        409: {
            description: 'Conflict (aggregator already linked for this user)',
            type: 'object',
            properties: {
                error: { type: 'string', example: 'This aggregator is already linked for this user' }
            },
            required: ['error']
        },
        500: {
            description: 'Internal server error',
            type: 'object',
            properties: {
                error: { type: 'string', example: 'Failed to link aggregator account' }
            },
            required: ['error']
        }
    }
};

/**
 * FareRequestBody:
 * {
 *   tripType: string,
 *   subType?: string,
 *   fromAddress: string,
 *   toAddress: string,
 *   startDate: string ("YYYY-MM-DD"),
 *   startTime: string ("HH:MM:SS"),
 *   vehicleType: "hatchback"|"sedan"|"suv"|"all",
 *   fromLat: number,
 *   fromLng: number,
 *   toLat: number,
 *   toLng: number,
 *   passengers?: number
 * }
 *
 * Response: { fares: FareResponse[] }
 * where FareResponse = {
 *   aggregator: string,
 *   price: number,
 *   currency: string,
 *   estimatedTimeMinutes: number,
 *   vehicleType: string,
 *   raw?: object
 * }
 */
const coordinatesProps = {
    type: 'object',
    properties: {
        lat: { type: 'number', example: 28.6893144 },
        lon: { type: 'number', example: 77.2919663 }
    },
    required: ['lat', 'lon']
};

export const getFaresSchema: FastifySchema = {
    description: 'Fetch fare quotes from all linked (or all) aggregators',
    tags: ['Aggregators'],
    body: {
        type: 'object',
        required: [
            'tripType',
            'fromAddress',
            'toAddress',
            'startDate',
            'startTime',
            'vehicleType',
            'fromLat',
            'fromLng',
            'toLat',
            'toLng'
        ],
        properties: {
            tripType: {
                type: 'string',
                description:
                    'Type of trip: e.g. "outstation", "airport", "dayRental4", etc. ' +
                    'If "outstation", also include subType.',
                example: 'outstation'
            },
            subType: {
                type: 'string',
                description:
                    'For tripType="outstation": "oneway" | "roundtrip". Not required otherwise.',
                example: 'oneway'
            },
            fromAddress: {
                type: 'string',
                description: 'Pickup address (freeform).',
                example: 'Shahdara, Delhi, India'
            },
            toAddress: {
                type: 'string',
                description: 'Dropoff address (freeform).',
                example: 'Agra, Uttar Pradesh'
            },
            startDate: {
                type: 'string',
                format: 'date',
                description: 'Trip start date in YYYY-MM-DD format.',
                example: '2024-12-06'
            },
            startTime: {
                type: 'string',
                pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$',
                description: 'Trip start time in HH:MM:SS (24-hour) format.',
                example: '17:50:00'
            },
            vehicleType: {
                type: 'string',
                enum: ['hatchback', 'sedan', 'suv', 'all'],
                description:
                    'Vehicle category: "hatchback", "sedan", "suv" or "all".',
                example: 'hatchback'
            },
            fromLat: {
                type: 'number',
                description: 'Pickup latitude.',
                example: 28.6893144
            },
            fromLng: {
                type: 'number',
                description: 'Pickup longitude.',
                example: 77.2919663
            },
            toLat: {
                type: 'number',
                description: 'Dropoff latitude.',
                example: 27.1767000
            },
            toLng: {
                type: 'number',
                description: 'Dropoff longitude.',
                example: 78.0081000
            },
            passengers: {
                type: 'integer',
                minimum: 1,
                description: 'Number of passengers (optional).',
                example: 2
            }
        }
    },
    response: {
        200: {
            description: 'Array of fare quotes (may be empty).',
            type: 'object',
            properties: {
                fares: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            aggregator: { type: 'string', example: 'gozo' },
                            price: { type: 'number', description: 'Total fare amount', example: 4584 },
                            currency: { type: 'string', example: 'INR' },
                            estimatedTimeMinutes: {
                                type: 'integer',
                                description: 'Estimated trip duration in minutes',
                                example: 360
                            },
                            vehicleType: {
                                type: 'string',
                                description: 'Vehicle class returned by aggregator',
                                example: 'Compact (Value)'
                            },
                            raw: {
                                type: 'object',
                                description: 'The raw payload from the aggregator’s API',
                                nullable: true
                            }
                        },
                        required: ['aggregator', 'price', 'currency', 'estimatedTimeMinutes', 'vehicleType']
                    }
                }
            },
            required: ['fares']
        },
        400: {
            description: 'Bad request (missing or invalid fields in body).',
            type: 'object',
            properties: {
                error: { type: 'string', example: 'tripType & vehicleType are required' }
            },
            required: ['error']
        },
        500: {
            description: 'Internal server error while fetching fares.',
            type: 'object',
            properties: {
                error: { type: 'string', example: 'Error fetching fares from aggregators' }
            },
            required: ['error']
        }
    }
};
