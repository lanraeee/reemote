FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.api.json tsconfig.server.json ./
COPY api/ ./api/
COPY server/ ./server/

RUN npx tsc -p tsconfig.server.json --noEmit false

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist-server ./dist-server

# Frontend static files are mounted at runtime via volume or copied by compose
ENV FRONTEND_DIR=/app/frontend/dist \
    PORT=8443 \
    NODE_ENV=production

EXPOSE 8443

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8443/api/health || exit 1

CMD ["node", "dist-server/server/index.js"]
