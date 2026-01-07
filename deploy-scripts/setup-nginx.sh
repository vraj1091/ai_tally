#!/bin/bash

# AI Tally - nginx Setup Script for EC2/VPS
# This script automates nginx configuration for AI Tally deployment
# Run with: sudo bash deploy-scripts/setup-nginx.sh

set -e

echo "========================================"
echo "AI Tally - nginx Setup"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ ERROR: Please run as root (sudo bash setup-nginx.sh)"
    exit 1
fi

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    apt-get update
    apt-get install -y nginx
else
    echo "✅ nginx already installed"
fi

echo ""
echo "🔧 Configuring nginx..."

# Remove any swap files
rm -f /var/tmp/ai-tally.conf.swp

# Remove old configurations
rm -f /etc/nginx/sites-enabled/ai-tally.conf
rm -f /etc/nginx/sites-enabled/default

# Copy the nginx config
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/ec2-nginx-config/ai-tally.conf" ]; then
    echo "📋 Copying nginx configuration..."
    cp "$PROJECT_DIR/ec2-nginx-config/ai-tally.conf" /etc/nginx/sites-available/ai-tally.conf
    
    # Create symlink
    ln -sf /etc/nginx/sites-available/ai-tally.conf /etc/nginx/sites-enabled/
    
    echo "✅ Configuration copied"
else
    echo "❌ ERROR: Config file not found at $PROJECT_DIR/ec2-nginx-config/ai-tally.conf"
    exit 1
fi

echo ""
echo "🧪 Testing nginx configuration..."
if nginx -t; then
    echo "✅ Configuration test passed"
else
    echo "❌ Configuration test failed"
    exit 1
fi

echo ""
echo "🔄 Reloading nginx..."
systemctl reload nginx

echo ""
echo "✅ Checking nginx status..."
if systemctl is-active --quiet nginx; then
    echo "✅ nginx is running"
else
    echo "⚠️  nginx is not running, attempting to start..."
    systemctl start nginx
fi

echo ""
echo "========================================"
echo "✅ nginx Setup Complete!"
echo "========================================"
echo ""
echo "📋 Next steps:"
echo "1. Start your Docker containers: docker-compose up -d"
echo "2. Test API endpoint: curl http://localhost/api/health"
echo "3. Open browser: http://YOUR_SERVER_IP"
echo ""
echo "🔍 Useful commands:"
echo "  - Check nginx status: sudo systemctl status nginx"
echo "  - View nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "  - Restart nginx: sudo systemctl restart nginx"
echo ""

