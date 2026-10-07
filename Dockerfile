# ==============================================================================
# Stage 1: Build Frontend Single Page App (React + TS + TailwindCSS + Vite)
# ==============================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Runtime Production Image (Python 3.11 + FastAPI + SimPy + LightGBM)
# ==============================================================================
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    D2_VAR_DIR=/app/backend/var \
    D2_FRONTEND_DIST=/app/frontend/dist \
    PORT=8000

# Install system dependencies: libgomp1 is strictly required by LightGBM C++ engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend application source and initialized datasets/models
COPY backend/app /app/backend/app
COPY backend/var /app/backend/var

# Copy compiled frontend distribution from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 8000

WORKDIR /app/backend

# Dynamic port binding for local Docker, Render, Railway, and Cloud Run ($PORT)
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
