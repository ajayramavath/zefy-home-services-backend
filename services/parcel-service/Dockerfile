# services/parcel-service/Dockerfile

# 1) Use Node.js 22.14.0 on Alpine
FROM node:22.14.0-alpine

# 2) Set working directory to monorepo root for build
WORKDIR /zefy-backend

# 3) Copy root manifest, lockfile, and base TS config
COPY package.json yarn.lock tsconfig.base.json ./

# 4) Copy shared packages for workspace resolution
COPY packages ./packages

# 5) Copy parcel-service workspace manifest and TS config
COPY services/parcel-service/package.json services/parcel-service/tsconfig.json ./services/parcel-service/

# 6) Copy parcel-service source files
COPY services/parcel-service/src ./services/parcel-service/src

# 7) Install dependencies for all workspaces
RUN yarn install --frozen-lockfile

# 8) Build only the parcel-service workspace
RUN yarn workspace @zf/parcel-service build

# 9) Set working directory to the parcel-service folder for runtime
WORKDIR /zefy-backend/services/parcel-service

# 10) Expose HTTP port
EXPOSE 3000

# 11) Launch the compiled service
CMD ["node", "dist/index.js"]
