# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zefy Home Services Backend is a microservices architecture built with Node.js, TypeScript, and Fastify. It's a location-based home services platform with multi-provider authentication and user management.

## Architecture

### Services Structure
- **Gateway Service** (`services/gateway/`) - API gateway with HTTP proxy routing to microservices
- **User Service** (`services/user-service/`) - User management, authentication, and profile handling
- **Shared Packages** (`packages/`) - Common utilities and types shared across services

### Key Components
- **@zf/common** - Shared Fastify plugins (Redis, MongoDB, RabbitMQ, Session management)
- **@zf/types** - TypeScript type definitions shared across services
- **nginx/** - Reverse proxy configuration for production deployment

### Data Flow
1. Nginx routes traffic to Gateway (port 3000)
2. Gateway proxies `/users/*` requests to User Service (port 3001)
3. User Service handles authentication via Firebase and manages user profiles
4. Session management via Redis with Bearer token authentication
5. MongoDB stores user data with multi-provider auth support

## Development Commands

### Root Level (Yarn Workspaces)
```bash
# Build all services and packages
yarn build

# Run all services in development mode
yarn dev

# Start all services in production mode
yarn start

# Run linting across all workspaces
yarn lint
```

### Individual Services
```bash
# Build specific service
cd services/user-service && yarn build

# Run specific service in development
cd services/user-service && yarn dev

# Start specific service
cd services/user-service && yarn start
```

### Docker Development
```bash
# Start all infrastructure services (MongoDB, Redis, RabbitMQ)
docker-compose up mongo redis rabbitmq

# Start full stack including services
docker-compose up

# Start specific service
docker-compose up user-service
```

## Authentication Flow

### Multi-Provider System
- Supports Google, Apple, and Phone authentication via Firebase
- Users can link multiple providers to single account
- Firebase ID tokens are verified server-side
- Session management with configurable multi-session support

### Session Management
- Redis-backed sessions with Bearer token authentication
- Configurable TTL (default: 180 days)
- Single or multi-session support per user
- Session validation on all routes except auth endpoints

### Protected Routes
Session validation automatically applied to all routes except:
- `/users/auth/*` - Authentication endpoints
- `/users/docs` - API documentation
- `/users/health` - Health checks
- `/health` - Service health checks

## Database Schema

### User Model
- Multi-provider authentication support
- Extensible metadata field
- Profile information (name, DOB, gender)
- Favorite locations (home, work, other) with coordinates
- Timestamps for creation and updates

### Indexes
- Unique compound index on `providers.provider` and `providers.providerId`
- Prevents duplicate provider entries across users

## Common Patterns

### Error Handling
- Firebase token validation with proper error responses
- Session validation with 401 responses for invalid/expired tokens
- Mongoose validation with custom error messages

### Plugin Architecture
- Shared plugins in `@zf/common` for database connections
- Session plugin decorates Fastify instance with session methods
- Firebase admin plugin for authentication

### API Documentation
- Swagger/OpenAPI integration on both services
- Gateway docs at `/docs`
- User service docs at `/users/docs`
- Interactive UI with swagger-ui integration

## Environment Variables

### Required for User Service
- `MONGO_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `AMQP_URL` - RabbitMQ connection string
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Firebase service account key
- `PORT` - Service port (default: 3000)

### Required for Gateway
- `USER_SERVICE_URL` - User service URL (default: http://user-service:3000)
- `PORT` - Gateway port (default: 3000)

## Key Files to Understand

### Authentication Flow
- `services/user-service/src/controllers/auth.controller.ts` - Google/phone auth implementation
- `packages/common/src/plugins/session.ts` - Session management with Redis
- `services/user-service/src/models/user.model.ts` - User schema with multi-provider support

### Service Architecture
- `services/gateway/src/routes/index.ts` - HTTP proxy routing configuration
- `services/user-service/src/index.ts` - Service initialization with plugins
- `packages/common/src/index.ts` - Shared plugin exports

### Infrastructure
- `docker-compose.yaml` - Full stack deployment configuration
- `nginx/nginx.conf` - Reverse proxy configuration