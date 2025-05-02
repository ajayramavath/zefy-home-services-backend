# services/user-service/Dockerfile

# 1) Use Node.js 22.14.0 on Alpine
FROM node:22.14.0-alpine

# 2) Set working directory to monorepo root for build
WORKDIR /zefy-backend

# 3) Copy root manifest, lockfile, and base TS config
COPY package.json yarn.lock tsconfig.base.json ./

# 4) Copy shared packages for workspace resolution
COPY packages ./packages

# 5) Copy user-service workspace manifest and TS config
COPY services/user-service/package.json services/user-service/tsconfig.json ./services/user-service/

# 6) Copy user-service source files
COPY services/user-service/src ./services/user-service/src

# 7) Install dependencies for all workspaces
RUN yarn install --frozen-lockfile

# 8) Build only the user-service workspace
RUN yarn workspace @zf/user-service build

# 9) Set working directory to the user-service folder for runtime
WORKDIR /zefy-backend/services/user-service

# 10) Expose HTTP port
EXPOSE 3001

# 11) Launch the compiled service
CMD ["node", "dist/index.js"]
