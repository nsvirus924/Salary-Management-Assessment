# --- Build the React app ---------------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# --- Python runtime serving API + built UI ---------------------------------
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    DATABASE_URL=sqlite:////data/salary.db \
    FRONTEND_DIST=/app/frontend-dist \
    CORS_ORIGINS="" \
    PORT=8000
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend-dist
RUN mkdir -p /data && useradd --create-home appuser && chown -R appuser /data /app
USER appuser
EXPOSE 8000
# Seed 10k employees on first boot only, then serve.
CMD python -m seed.seed --if-empty && \
    uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT}
