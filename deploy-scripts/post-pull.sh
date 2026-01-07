#!/bin/bash

# AI Tally - Post-Pull Script
# Run this after git pull to sync all configurations
# Usage: sudo bash deploy-scripts/post-pull.sh

set -e

echo "========================================"
echo "AI Tally - Post-Pull Configuration Sync"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ ERROR: Please run as root (sudo bash post-pull.sh)"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🔄 Syncing configurations after git pull..."
echo ""

# 1. Sync nginx configuration
if [ -f "$SCRIPT_DIR/sync-nginx.sh" ]; then
    echo "📋 Step 1: Syncing nginx configuration..."
    bash "$SCRIPT_DIR/sync-nginx.sh"
    echo ""
else
    echo "⚠️  sync-nginx.sh not found, skipping nginx sync"
fi

# 2. Restart Docker containers with new code
echo "📦 Step 2: Rebuilding and restarting Docker containers..."
cd "$(dirname "$SCRIPT_DIR")"

echo "   Stopping containers..."
docker-compose down

echo "   Rebuilding images..."
docker-compose build

echo "   Starting containers..."
docker-compose up -d

echo "✅ Containers restarted"
echo ""

# 3. Wait for services to be ready
echo "⏳ Step 3: Waiting for services to start (15 seconds)..."
sleep 15
echo ""

# 4. Verify all services
echo "🧪 Step 4: Verifying services..."
echo ""

# Check backend
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed"
fi

# Check nginx proxy
if curl -sf http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ nginx proxy is working"
else
    echo "⚠️  nginx proxy check failed"
fi

# Check frontend
if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend check failed"
fi

# Check Ollama (optional)
if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
else
    echo "ℹ️  Ollama not running (optional)"
fi

echo ""
echo "========================================"
echo "✅ Post-Pull Sync Complete!"
echo "========================================"
echo ""
echo "📋 Services Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🌐 Your application is ready at:"
echo "   http://$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo ""

