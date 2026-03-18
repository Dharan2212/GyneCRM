# ─────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifest files — package-lock.json is optional at this stage
# because the project may not yet have committed a lockfile.
# npm install is used so the build succeeds whether or not a lockfile exists.
# Once a lockfile is committed and stabilised, switch this line to:
#   RUN npm ci --omit=dev
COPY package.json package-lock.json* ./

RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# ─────────────────────────────────────────────────────────────
# Stage 2: Production image
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY package.json ./

# Set file ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Expose API port
EXPOSE 4000

# Health check — hits the /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/v1/health || exit 1

CMD ["node", "src/server.js"]
