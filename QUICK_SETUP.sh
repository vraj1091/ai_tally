#!/bin/bash

# AI Tally - One-Command Setup Script
# Run this on a fresh Ubuntu server to set up everything
# Usage: curl -sSL https://raw.githubusercontent.com/vraj1091/ai_tally/main/QUICK_SETUP.sh | sudo bash

set -e

echo "=========================================="
echo "   AI TALLY - QUICK SETUP"
echo "=========================================="
echo ""
echo "This script will:"
echo "  ✓ Install Docker & Docker Compose"
echo "  ✓ Install and configure nginx"
echo "  ✓ Clone AI Tally repository"
echo "  ✓ Start all services"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Update system
echo ""
echo "📦 Updating system packages..."
apt-get update

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo ""
    echo "🐳 Installing Docker..."
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    echo ""
    echo "🐳 Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install nginx
if ! command -v nginx &> /dev/null; then
    echo ""
    echo "📦 Installing nginx..."
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo "✅ nginx installed"
else
    echo "✅ nginx already installed"
fi

# Clone repository if not exists
if [ ! -d "/root/ai_tally" ]; then
    echo ""
    echo "📥 Cloning AI Tally repository..."
    cd /root
    git clone https://github.com/vraj1091/ai_tally.git
    cd ai_tally
    echo "✅ Repository cloned"
else
    echo ""
    echo "✅ Repository already exists"
    cd /root/ai_tally
    echo "🔄 Pulling latest changes..."
    git pull origin main
fi

# Configure nginx
echo ""
echo "🔧 Configuring nginx..."

# Remove swap files and old configs
rm -f /var/tmp/ai-tally.conf.swp
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/ai-tally.conf

# Copy nginx config
cp /root/ai_tally/ec2-nginx-config/ai-tally.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/ai-tally.conf /etc/nginx/sites-enabled/

# Test nginx config
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ nginx configuration valid"
    systemctl reload nginx
else
    echo "❌ nginx configuration invalid"
    exit 1
fi

# Start Docker containers
echo ""
echo "🐳 Starting Docker containers..."
cd /root/ai_tally
docker-compose down
docker-compose build
docker-compose up -d

# Wait for services to start
echo ""
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Test services
echo ""
echo "🧪 Testing services..."

# Test backend
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend health check failed"
fi

# Test nginx proxy
if curl -s http://localhost/api/health > /dev/null; then
    echo "✅ nginx proxy is working"
else
    echo "⚠️  nginx proxy test failed"
fi

# Get server IP
SERVER_IP=$(curl -s http://checkip.amazonaws.com)

echo ""
echo "=========================================="
echo "✅ AI TALLY SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Access your application:"
echo "   http://$SERVER_IP"
echo ""
echo "📋 Service URLs:"
echo "   Frontend: http://$SERVER_IP"
echo "   Backend API: http://$SERVER_IP/api/health"
echo "   API Docs: http://$SERVER_IP/docs"
echo ""
echo "🔍 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Restart: docker-compose restart"
echo "   Stop: docker-compose down"
echo ""
echo "📖 Full guide: /root/ai_tally/DEPLOYMENT_GUIDE.md"
echo ""

