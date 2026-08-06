# Multi-Stage Production Dockerfile for Backend API
FROM node:20-alpine AS base

WORKDIR /usr/src/app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Security: Run as non-root user
USER node

# Expose API Port
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/public/stats || exit 1

CMD ["node", "server.js"]
