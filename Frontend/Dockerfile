# =============================================================================
# Multi-Stage Production Container for Frontend (React / Vite SPA + Nginx)
# Stage 1: Build static assets via Node.js
# Stage 2: Serve via high-performance Nginx Alpine container
# =============================================================================

# --- Stage 1: Build Application ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy application source
COPY . .

# In production behind K8s Ingress, empty VITE_BACKEND_URL uses same-origin relative /api
ARG VITE_BACKEND_URL=""
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build production bundle (outputs to /app/dist)
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:alpine AS runner

# Copy built static assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (handles SPA routing + caching + gzip)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx serves on port 80
EXPOSE 80

# Health check to ensure Nginx is serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
