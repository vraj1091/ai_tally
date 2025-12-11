FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Upgrade pip and install packages
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code first
COPY . .

# Create non-root user
RUN groupadd -r appuser && \
    useradd -r -g appuser appuser

# Create directories with proper permissions
RUN mkdir -p \
    /app/data \
    /app/data/backups \
    /app/logs \
    /app/uploads \
    /app/chroma_db \
    /app/cache && \
    chown -R appuser:appuser /app

# Create __init__.py files
RUN touch app/__init__.py \
    app/routes/__init__.py \
    app/services/__init__.py \
    app/models/__init__.py 2>/dev/null || true

USER appuser

EXPOSE 8000

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    LOG_LEVEL=INFO

CMD ["gunicorn", "app.main:app", "--workers", "2", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120"]

