FROM python:3.10-slim

WORKDIR /app

# Install system dependencies including build tools for psutil
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    libc-dev \
    libpq-dev \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Upgrade pip and install packages (CPU-only mode)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install CPU-only PyTorch (use available CPU version)
RUN pip install --no-cache-dir torch==2.6.0+cpu --extra-index-url https://download.pytorch.org/whl/cpu

# Install remaining requirements
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
    LOG_LEVEL=INFO \
    CUDA_VISIBLE_DEVICES="" \
    TORCH_DEVICE="cpu"

# Use uvicorn with 1 worker for WebSocket state consistency
# Multiple workers don't share WebSocket connections - bridge on worker1 invisible to worker2
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--ws-max-size", "2147483648", "--timeout-keep-alive", "120"]

