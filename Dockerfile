# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps for build
RUN apk add --no-cache bash netcat-openbsd

# Copy deps first (better caching)
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source files
COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma
COPY wait-for-it.sh start.sh ./

# Generate Prisma client & build TS
RUN npx prisma generate
RUN yarn build

# Stage 2: Runner (lighter image)
FROM node:22-alpine AS runner

WORKDIR /app

# Install only runtime deps
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy compiled code + prisma client
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=builder /app/node_modules/.bin /app/node_modules/.bin
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/wait-for-it.sh /app/start.sh ./

RUN chmod +x wait-for-it.sh start.sh

EXPOSE 4000
ENTRYPOINT ["/app/start.sh"]
