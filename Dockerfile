# ==============================================================================
# ElasticCloud - Production Multi-Stage Container Dockerfile
# Optimized for AWS EC2, AWS ECS/Fargate, and Kubernetes (EKS/GKE/K3s)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Stage (compile frontend SPA & backend TypeScript)
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS builder

# Install build dependencies for native Node addons (better-sqlite3, node-pty)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    gcc \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies across root, server, and client
RUN npm ci || npm install
RUN cd client && (npm ci || npm install)
RUN cd server && (npm ci || npm install)

# Copy source trees
COPY shared/ ./shared/
COPY client/ ./client/
COPY server/ ./server/

# Build client React SPA and server TypeScript bundle
RUN cd client && npm run build
RUN cd server && npm run build

# Remove development dependencies from server to reduce final image size
RUN cd server && npm prune --omit=dev

# ------------------------------------------------------------------------------
# Stage 2: Production Minimal Runtime Stage
# ------------------------------------------------------------------------------
FROM node:20-bookworm-slim AS runner

# Labels for OCI container image metadata
LABEL org.opencontainers.image.title="ElasticCloud Control Plane" \
      org.opencontainers.image.description="Production-grade AWS EC2 Cloud Console & Compute Orchestrator" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="ElasticCloud" \
      org.opencontainers.image.licenses="MIT"

# Install dumb-init for POSIX signal handling and PID 1 zombie process reaping,
# curl for healthchecks, and basic networking utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    curl \
    ca-certificates \
    bash \
    openssh-client \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user and group (UID 1001) for secure unprivileged runtime
RUN groupadd -g 1001 elastic && \
    useradd -u 1001 -g elastic -m -s /bin/bash elastic

# Create application, persistent data, and sandbox directories
RUN mkdir -p /app /data /tmp/elastic-sandboxes && \
    chown -R elastic:elastic /app /data /tmp/elastic-sandboxes && \
    chmod 777 /tmp/elastic-sandboxes

WORKDIR /app

# Copy built artifacts and production dependencies from builder stage
COPY --from=builder --chown=elastic:elastic /app/package.json ./package.json
COPY --from=builder --chown=elastic:elastic /app/shared ./shared
COPY --from=builder --chown=elastic:elastic /app/client/dist ./client/dist
COPY --from=builder --chown=elastic:elastic /app/server/package.json ./server/package.json
COPY --from=builder --chown=elastic:elastic /app/server/node_modules ./server/node_modules
COPY --from=builder --chown=elastic:elastic /app/server/dist ./server/dist

# Define environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/data \
    CLIENT_DIST=/app/client/dist

# Expose primary Web Console + REST API + WebSocket port
EXPOSE 3000

# Expose microVM SSH ports for EC2 / host network mode (optional)
EXPOSE 2201-2220

# Mount persistent volume for SQLite database storage
VOLUME ["/data"]

# Switch to non-root user
USER elastic

# Container healthcheck for AWS Target Groups, ECS, and Kubernetes
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# dumb-init forwards SIGTERM/SIGINT to Node for clean database closing & WebSocket draining
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server/dist/server/src/index.js"]
