# services/aggregator-service/Dockerfile

# 1) Use Node.js 22.14.0 on Alpine
FROM node:22.14.0-alpine

# 2) Set working directory to monorepo root for build
WORKDIR /zefy-backend

# 3) Copy root manifest, lockfile, and base TS config
COPY package.json yarn.lock tsconfig.base.json ./

# 4) Copy shared packages for workspace resolution
COPY packages ./packages

# 5) Copy aggregator-service workspace manifest and TS config
COPY services/aggregator-service/package.json services/aggregator-service/tsconfig.json ./services/aggregator-service/

# 6) Copy aggregator-service source files
COPY services/aggregator-service/src ./services/aggregator-service/src

# 7) Install dependencies for all workspaces
RUN yarn install --frozen-lockfile

# 8) Build only the aggregator-service workspace
RUN yarn workspace @zf/aggregator-service build

# 9) Set working directory to the aggregator-service folder for runtime
WORKDIR /zefy-backend/services/aggregator-service

# 10) Expose HTTP port
EXPOSE 3002

# 11) Launch the compiled service
CMD ["node", "dist/index.js"]
