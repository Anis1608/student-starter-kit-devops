# =============================================================================
# Multi-Stage Production Container for Backend (Node.js Express)
# Compatible with BuildKit and Kubernetes Non-Root Security Policies
# =============================================================================

# --- Stage 1: Build & Dependencies ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (production + build tools)
RUN npm ci || npm install

# Copy application source
COPY . .

# --- Stage 2: Minimal Production Runtime ---
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for Kubernetes readiness & liveness probes
RUN apk add --no-cache curl

# Security: Create non-root nodeuser
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy application code from builder stage
COPY --from=builder /app ./

# Fix permissions for non-root user
RUN chown -R nodeuser:nodejs /app

USER nodeuser

# Expose backend port (must match containerPort in k8s/deployment.yaml)
EXPOSE 5000

# Health check to ensure pod is healthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "index.js"]


# =============================================================================
# 💡 PYTHON DEVELOPERS (FastAPI / Flask / Django):
# Agar aapka backend Python mein hai, to upar ka content replace karke ye daalein:
#
# FROM python:3.10-slim
# WORKDIR /app
# RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
# COPY requirements.txt .
# RUN pip install --no-cache-dir -r requirements.txt
# COPY . .
# EXPOSE 5000
# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD curl -f http://localhost:5000/health || exit 1
# CMD ["python", "app.py"]
# =============================================================================
