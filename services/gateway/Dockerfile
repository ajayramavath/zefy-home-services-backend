# services/gateway/Dockerfile

# 1) Use Node.js 22 on Alpine
FROM node:22-alpine

RUN corepack enable

# 2) Set working directory to monorepo root for build
WORKDIR /zefy-backend

# 3) Copy root manifest, lockfile, and base TS config
COPY package.json yarn.lock tsconfig.base.json .yarnrc.yml ./

# 4) Copy shared packages for workspace resolution
COPY packages ./packages

# 5) Copy gateway workspace manifest and TS config
COPY services/gateway/package.json services/gateway/tsconfig.json ./services/gateway/

# 6) Copy gateway source files
COPY services/gateway/src ./services/gateway/src

# 7) Install dependencies for all workspaces
RUN yarn install

# 8) Build only the gateway workspace
RUN yarn workspace @zf/gateway build

# 9) Set working directory to the gateway service folder for runtime
WORKDIR /zefy-backend/services/gateway

# 10) Expose HTTP port
EXPOSE 3000

# 11) Launch the compiled gateway
CMD ["node", "dist/index.js"]
