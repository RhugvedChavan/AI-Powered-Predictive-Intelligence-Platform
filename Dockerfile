# ==============================================================================
# Multi-stage Dockerfile for Intelligent Data Analytics & Predictive Intelligence Platform
# ==============================================================================

# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js ./
COPY src/ ./src/

RUN npm run build

# Stage 2: Production Python Backend Runtime
FROM python:3.10-slim AS runner
WORKDIR /app

# Install system dependencies for build tools and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY app/ ./app/
COPY tests/ ./tests/

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Create storage directories
RUN mkdir -p storage/uploads storage/processed storage/models storage/reports storage/duckdb

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    STORAGE_DIR=/app/storage

EXPOSE 8000

# Run Uvicorn serving both API and bundled Single Page App
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

