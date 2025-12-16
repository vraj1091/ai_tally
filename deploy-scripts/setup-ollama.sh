#!/bin/bash

# AI Tally - Ollama Setup Script
# This script installs and configures Ollama for AI chat functionality
# Run with: sudo bash deploy-scripts/setup-ollama.sh

set -e

echo "========================================"
echo "AI Tally - Ollama Setup"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ ERROR: Please run as root (sudo bash setup-ollama.sh)"
    exit 1
fi

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama already installed"
    OLLAMA_VERSION=$(ollama --version 2>&1 | head -n1 || echo "unknown")
    echo "   Version: $OLLAMA_VERSION"
else
    echo "📦 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    
    if command -v ollama &> /dev/null; then
        echo "✅ Ollama installed successfully"
    else
        echo "❌ Ollama installation failed"
        exit 1
    fi
fi

# Start Ollama service
echo ""
echo "🚀 Starting Ollama service..."
systemctl start ollama 2>/dev/null || true
systemctl enable ollama 2>/dev/null || true

# Wait for service to start
sleep 3

# Check if Ollama is running
if pgrep -x "ollama" > /dev/null; then
    echo "✅ Ollama service is running"
else
    echo "⚠️  Ollama service not running, starting manually..."
    nohup ollama serve > /var/log/ollama.log 2>&1 &
    sleep 3
fi

# Pull required models
echo ""
echo "📥 Pulling AI models (this may take a few minutes)..."
echo ""

# Pull phi4:14b (recommended model)
echo "Pulling phi4:14b model..."
if ollama pull phi4:14b; then
    echo "✅ phi4:14b model downloaded"
else
    echo "⚠️  Failed to pull phi4:14b, trying smaller model..."
    
    # Fallback to smaller model
    echo "Pulling phi3:3.8b model (smaller, faster)..."
    if ollama pull phi3:3.8b; then
        echo "✅ phi3:3.8b model downloaded"
    else
        echo "⚠️  Failed to pull phi3:3.8b"
    fi
fi

# List available models
echo ""
echo "📋 Available Ollama models:"
ollama list

# Test Ollama
echo ""
echo "🧪 Testing Ollama..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama API is responding"
else
    echo "⚠️  Ollama API test failed"
fi

# Update backend .env if it exists
ENV_FILE="$(dirname "$0")/../backend/.env"
if [ -f "$ENV_FILE" ]; then
    echo ""
    echo "🔧 Updating backend configuration..."
    
    # Update or add OLLAMA_BASE_URL
    if grep -q "OLLAMA_BASE_URL" "$ENV_FILE"; then
        sed -i 's|OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=http://localhost:11434|' "$ENV_FILE"
    else
        echo "OLLAMA_BASE_URL=http://localhost:11434" >> "$ENV_FILE"
    fi
    
    # Update or add OLLAMA_MODEL
    if grep -q "OLLAMA_MODEL" "$ENV_FILE"; then
        sed -i 's|OLLAMA_MODEL=.*|OLLAMA_MODEL=phi4:14b|' "$ENV_FILE"
    else
        echo "OLLAMA_MODEL=phi4:14b" >> "$ENV_FILE"
    fi
    
    echo "✅ Backend configuration updated"
else
    echo "⚠️  Backend .env file not found, skipping configuration update"
fi

echo ""
echo "========================================"
echo "✅ Ollama Setup Complete!"
echo "========================================"
echo ""
echo "📋 Ollama Information:"
echo "  - API URL: http://localhost:11434"
echo "  - Models location: ~/.ollama/models"
echo "  - Service status: systemctl status ollama"
echo ""
echo "🔍 Useful commands:"
echo "  - List models: ollama list"
echo "  - Pull model: ollama pull <model-name>"
echo "  - Test chat: ollama run phi4:14b"
echo "  - View logs: journalctl -u ollama -f"
echo ""
echo "💡 Recommended models:"
echo "  - phi4:14b (Best quality, 8GB RAM needed)"
echo "  - phi3:3.8b (Good quality, 4GB RAM needed)"
echo "  - llama3.2:3b (Fast, 4GB RAM needed)"
echo ""
echo "🔄 To use a different model, edit backend/.env:"
echo "   OLLAMA_MODEL=phi3:3.8b"
echo ""

