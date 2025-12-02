# AI Tally Assistant Backend - Dockerfile
# This is the main Dockerfile (can be used for Hugging Face or general Docker)

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/chroma_db /app/cache

# Expose port (default 8000, Hugging Face uses 7860)
EXPOSE 8000 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:7860/health')" || \
    python -c "import requests; requests.get('http://localhost:8000/health')"

# Run application
# Hugging Face will override this, but this works for general Docker
CMD ["python", "app.py"]
