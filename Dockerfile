FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
# Generate Prisma client for TypeScript compilation
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app

# Install only ca-certificates (for HTTPS) and openssl (Prisma engine may need it)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/entrypoint.sh ./

RUN chmod +x entrypoint.sh

# Generate Prisma client for the production runtime
RUN npx prisma generate

EXPOSE 4000
CMD ["./entrypoint.sh"]