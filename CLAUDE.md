# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zefy Home Services Backend is a microservices architecture built with Node.js, TypeScript, and Fastify. It's a real-time, location-based home services platform with comprehensive user/partner/admin management, booking workflows, and WebSocket communication.

## Architecture

### Services Structure
- **Gateway Service** (`services/gateway/`) - API gateway with HTTP proxy routing and WebSocket gateway (ports 3000 HTTP, 8080 WebSocket)
- **User Service** (`services/user-service/`) - User management, authentication, and profile handling (port 3001)
- **Partner Service** (`services/partner-service/`) - Partner management, availability tracking, location updates (port 3003)  
- **Booking Service** (`services/booking-service/`) - Booking workflows, hub management, assignment logic (port 3002)
- **Admin Service** (`services/admin-service/`) - Administrative functions, partner approval, system management (port 3004)
- **Shared Packages** (`packages/`) - Common utilities and types shared across services

### Key Components
- **@zf/common** - Shared Fastify plugins (Redis, MongoDB, RabbitMQ, Session management, Event system, Firebase auth)
- **@zf/types** - TypeScript type definitions (User, Partner, Booking, Admin, Hub, Availability, Service types)
- **nginx/** - Reverse proxy configuration for production deployment
- **WebSocket Gateway** - Real-time communication hub for users, partners, and admins

### Event-Driven Architecture
- **RabbitMQ** - Message broker for inter-service communication
- **Event Types** - Comprehensive event system for booking, partner, user, and admin workflows
- **Real-time Updates** - WebSocket events for live booking status, location tracking, partner availability

### Data Flow
1. Nginx routes HTTP traffic to Gateway (port 3000) and WebSocket traffic (port 8080)
2. Gateway proxies requests: `/users/*` → User Service, `/partners/*` → Partner Service, `/bookings/*` → Booking Service, `/admin/*` → Admin Service
3. Authentication: Firebase (users/partners) and bcrypt-based (admins)
4. Session management via Redis with Bearer tokens for users/partners, separate admin sessions
5. Real-time communication via WebSocket gateway for booking updates, location tracking, notifications
6. Event-driven workflows via RabbitMQ for booking assignments, partner notifications, status updates

## Development Commands

### Root Level (Yarn Workspaces)
```bash
# Build all services and packages
yarn build

# Run all services in development mode (includes WebSocket gateway on port 8080)
yarn dev

# Start infrastructure only (MongoDB, Redis, RabbitMQ)
yarn dev:infra

# Individual service development
yarn dev:gateway    # Gateway + WebSocket (ports 3000, 8080)
yarn dev:user      # User service (port 3001)
yarn dev:partner   # Partner service (port 3003)  
yarn dev:booking   # Booking service (port 3002)
yarn dev:admin     # Admin service (port 3004)

# Seed database with initial data
yarn seed:all       # Seeds all services + hub data
yarn seed:services  # Seeds service catalog
yarn seed:hub      # Seeds Bengaluru hub data

# Run linting (delegates to individual services)
yarn lint
```

### Production Deployment
```bash
# Start with PM2 (ecosystem.config.js)
pm2 start ecosystem.config.js

# Individual service management
pm2 start ecosystem.config.js --only gateway-service
pm2 start ecosystem.config.js --only user-service
pm2 start ecosystem.config.js --only booking-service
pm2 start ecosystem.config.js --only partner-service
```

### Docker Development
```bash
# Start infrastructure services
docker-compose up mongo redis rabbitmq

# Start specific infrastructure service
docker-compose up mongo
docker-compose up redis  
docker-compose up rabbitmq
```

## Authentication & Authorization

### Multi-Provider User/Partner Authentication
- **Firebase-based**: Google, Apple, and Phone authentication for users and partners
- **Multi-provider linking**: Users can link multiple authentication providers to single account
- **Server-side verification**: Firebase ID tokens verified server-side
- **Session management**: Redis-backed with Bearer tokens, configurable TTL (default: 180 days)

### Admin Authentication  
- **Password-based**: bcrypt hashing for admin credentials
- **Separate sessions**: Admin session management independent from user/partner sessions
- **Role-based access**: Administrative functions restricted to authenticated admins

### WebSocket Authentication
- **Real-time auth**: WebSocket connections authenticate via token-based system
- **Multi-user support**: Separate channels for users, partners, and admins
- **Connection management**: Active connection tracking and cleanup

### Protected Routes
Session validation automatically applied except:
- `/users/auth/*`, `/partners/auth/*`, `/admin/auth/*` - Authentication endpoints
- `/docs`, `/users/docs`, `/partners/docs` - API documentation  
- `/health` - Service health checks
- WebSocket endpoint `/ws` - Separate authentication flow

## Database Schema

### User Model
- Multi-provider authentication support (Google, Apple, Phone)
- Profile information (name, DOB, gender, phone, email)
- Favorite locations (home, work, other) with coordinates
- Extensible metadata field for custom data
- Timestamps for creation and updates

### Partner Model
- Authentication providers and profile data
- Service offerings and specializations
- Availability schedules and location tracking
- Hub assignments and service areas
- Status management (pending, approved, active)
- AWS S3 integration for document storage

### Booking Model
- User and partner relationships
- Service details and pricing
- Hub and location information
- Status workflow (pending, assigned, in-progress, completed, cancelled)
- Assignment logic and partner selection

### Admin Model
- Password-based authentication with bcrypt
- Role and permission management
- System administration capabilities

### Hub Model  
- Geographic service areas
- Partner assignments and capacity
- Service availability and coverage zones

## Event System & Real-Time Communication

### Event-Driven Workflows
- **RabbitMQ Integration**: Reliable message queuing between services
- **Event Types**: Comprehensive events for booking, partner, user, admin, and WebSocket workflows
- **Publisher/Consumer Pattern**: Each service publishes and consumes relevant events
- **Event Priorities**: Critical events processed with higher priority

### WebSocket Real-Time Features  
- **Live Booking Updates**: Status changes broadcasted to users and partners
- **Location Tracking**: Real-time partner location updates during service delivery
- **Availability Updates**: Partner availability changes pushed to booking system
- **Admin Notifications**: System alerts and partner status changes for administrators
- **Connection Management**: Automatic reconnection, heartbeat monitoring

### Event Categories
- **Booking Events**: Created, assigned, updated, completed, cancelled
- **Partner Events**: Registration, approval, availability changes, location updates
- **User Events**: Registration, profile updates, booking requests  
- **WebSocket Events**: Connection management, real-time data synchronization

## Common Patterns

### Error Handling
- Firebase token validation with structured error responses
- Session validation with 401 responses for invalid/expired tokens
- Mongoose validation with custom error messages
- WebSocket connection error handling and reconnection logic
- Event publishing failure handling with retry mechanisms

### Plugin Architecture
- Shared plugins in `@zf/common`: database connections, event system, session management
- Session plugins for both user/partner and admin authentication flows  
- Firebase admin plugin for multi-provider authentication
- Event publisher/consumer plugins for RabbitMQ integration
- WebSocket management plugins for real-time communication

### API Documentation
- Swagger/OpenAPI integration across all services
- Gateway docs at `/docs` with service proxy documentation
- Individual service docs: `/users/docs`, `/partners/docs`, `/bookings/docs`, `/admin/docs`
- WebSocket API documentation for real-time event specifications

## Environment Variables

### Core Infrastructure (All Services)
- `MONGO_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string  
- `AMQP_URL` - RabbitMQ connection string
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to Firebase service account key

### Gateway Service
- `PORT` - HTTP gateway port (default: 3000)
- `WEBSOCKET_PORT` - WebSocket server port (default: 8080)
- `USER_SERVICE_URL` - User service URL (default: http://user-service:3001)
- `PARTNER_SERVICE_URL` - Partner service URL (default: http://partner-service:3003)
- `BOOKING_SERVICE_URL` - Booking service URL (default: http://booking-service:3002)
- `ADMIN_SERVICE_URL` - Admin service URL (default: http://admin-service:3004)

### Individual Services
- `PORT` - Service-specific port (3001: user, 3002: booking, 3003: partner, 3004: admin)

### Partner Service Additional
- `AWS_ACCESS_KEY_ID` - AWS S3 access key for document storage
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret key
- `AWS_REGION` - AWS region for S3 bucket
- `S3_BUCKET_NAME` - S3 bucket for partner documents
- `JWT_SECRET` - JWT signing secret for partner tokens

### Testing & Development
- No testing framework currently configured
- Linting configuration delegated to individual services

## Key Files to Understand

### Authentication & Session Management
- `services/user-service/src/controllers/auth.controller.ts` - Firebase auth for users/partners
- `services/admin-service/src/controllers/auth.controller.ts` - Admin password-based auth  
- `packages/common/src/plugins/session.ts` - User/partner session management
- `packages/common/src/plugins/adminSession.ts` - Admin session management
- `services/user-service/src/models/user.model.ts` - Multi-provider user schema
- `services/admin-service/src/models/admin.model.ts` - Admin schema with bcrypt

### Service Architecture & Routing
- `services/gateway/src/routes/index.ts` - HTTP proxy routing for all services
- `services/gateway/src/websocket/` - WebSocket gateway implementation  
- `services/gateway/src/index.ts` - Gateway initialization with dual ports
- Service initialization: `services/*/src/index.ts` - Plugin registration and startup
- `packages/common/src/index.ts` - Shared plugin exports

### Event System & Real-Time Communication
- `packages/common/src/events/` - Event type definitions and publisher/consumer patterns
- `services/*/src/events/publisher.ts` - Service-specific event publishing
- `services/*/src/events/consumer.ts` - Service-specific event consumption
- `services/gateway/src/websocket/websocketManager.ts` - WebSocket connection management

### Business Logic & Models
- `services/booking-service/src/controllers/booking.controller.ts` - Booking workflows
- `services/partner-service/src/controllers/partner.controller.ts` - Partner management
- `services/booking-service/src/models/hub.model.ts` - Geographic hub management
- `services/partner-service/src/models/availability.model.ts` - Partner availability tracking

### Production Deployment  
- `ecosystem.config.js` - PM2 configuration for all services
- `docker-compose.yaml` - Infrastructure services configuration
- `nginx/nginx.conf` - Reverse proxy with WebSocket support
- Package configurations: `services/*/package.json` - Service-specific dependencies