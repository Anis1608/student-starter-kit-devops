# =============================================================================
# Skilli Student DevOps Lab - Multi-Stage Production Dockerfile Example
# Default Stack: Node.js (with instructions for other stacks below)
# =============================================================================

# --- Stage 1: Build & Dependencies ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies (including devDependencies needed for build)
RUN npm ci

# Copy application source code
COPY . .

# Build application if build script exists
RUN npm run build --if-present

# --- Stage 2: Minimal Production Runtime ---
FROM node:18-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install dumb-init or curl for healthchecks
RUN apk add --no-cache curl

# Create non-root student user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Copy package definitions and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application files from builder
COPY --from=builder /app/src ./src

# If your project has public or build directories, uncomment:
# COPY --from=builder /app/public ./public
# COPY --from=builder /app/dist ./dist

# Change file ownership to non-root user
RUN chown -R nodeuser:nodejs /app

USER nodeuser

# Expose container port (must match containerPort in k8s/deployment.yaml)
EXPOSE 3000

# Health check to ensure pod liveness
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "src/index.js"]


# =============================================================================
# 💡 TIP FOR PYTHON DEVELOPERS (FastAPI / Flask / Django):
# Replace contents above with:
#
#   FROM python:3.10-slim
#   WORKDIR /app
#   COPY requirements.txt .
#   RUN pip install --no-cache-dir -r requirements.txt
#   COPY . .
#   EXPOSE 3000
#   CMD ["python", "app.py"] # or ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
# =============================================================================
