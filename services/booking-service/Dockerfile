# services/user-service/Dockerfile

# 1) Use Node.js 22 on Alpine
FROM node:22-alpine

RUN corepack enable

# 2) Set working directory to monorepo root for build
WORKDIR /zefy-backend

# 3) Copy root manifest, lockfile, and base TS config
COPY package.json yarn.lock tsconfig.base.json .yarnrc.yml ./

# 4) Copy shared packages for workspace resolution
COPY packages ./packages

# 5) Copy user-service workspace manifest and TS config
COPY services/booking-service/package.json services/booking-service/tsconfig.json ./services/booking-service/

# 6) Copy user-service source files
COPY services/booking-service/src ./services/booking-service/src

# 7) Install dependencies for all workspaces
RUN yarn install

# 8) Build only the user-service workspace
RUN yarn workspace @zf/booking-service build

# 9) Set working directory to the user-service folder for runtime
WORKDIR /zefy-backend/services/booking-service

# 10) Expose HTTP port
EXPOSE 3000

# 11) Launch the compiled service
CMD ["node", "dist/index.js"]
