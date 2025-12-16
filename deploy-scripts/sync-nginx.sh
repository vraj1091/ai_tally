#!/bin/bash

# AI Tally - Sync nginx Configuration
# This script copies nginx config from repo to system location
# Run after git pull: sudo bash deploy-scripts/sync-nginx.sh

set -e

echo "========================================"
echo "AI Tally - Syncing nginx Configuration"
echo "========================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ ERROR: Please run as root (sudo bash sync-nginx.sh)"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Source and destination paths
SOURCE_NGINX_CONF="$PROJECT_DIR/ec2-nginx-config/ai-tally.conf"
DEST_NGINX_AVAILABLE="/etc/nginx/sites-available/ai-tally.conf"
DEST_NGINX_ENABLED="/etc/nginx/sites-enabled/ai-tally.conf"

echo "📂 Project directory: $PROJECT_DIR"
echo "📄 Source config: $SOURCE_NGINX_CONF"
echo "📍 Destination: $DEST_NGINX_AVAILABLE"
echo ""

# Check if source file exists
if [ ! -f "$SOURCE_NGINX_CONF" ]; then
    echo "❌ ERROR: nginx config not found at $SOURCE_NGINX_CONF"
    exit 1
fi

# Backup existing config if it exists
if [ -f "$DEST_NGINX_AVAILABLE" ]; then
    BACKUP_FILE="/etc/nginx/sites-available/ai-tally.conf.backup.$(date +%Y%m%d_%H%M%S)"
    echo "💾 Backing up existing config to: $BACKUP_FILE"
    cp "$DEST_NGINX_AVAILABLE" "$BACKUP_FILE"
fi

# Copy new config
echo "📋 Copying nginx configuration..."
cp "$SOURCE_NGINX_CONF" "$DEST_NGINX_AVAILABLE"
echo "✅ Configuration copied"

# Create symlink if it doesn't exist
if [ ! -L "$DEST_NGINX_ENABLED" ]; then
    echo "🔗 Creating symlink in sites-enabled..."
    ln -sf "$DEST_NGINX_AVAILABLE" "$DEST_NGINX_ENABLED"
    echo "✅ Symlink created"
else
    echo "✅ Symlink already exists"
fi

# Remove default site if it exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "🗑️  Removing default nginx site..."
    rm -f /etc/nginx/sites-enabled/default
    echo "✅ Default site removed"
fi

# Test nginx configuration
echo ""
echo "🧪 Testing nginx configuration..."
if nginx -t 2>&1 | tee /tmp/nginx-test.log; then
    echo "✅ Configuration test passed"
    
    # Reload nginx
    echo ""
    echo "🔄 Reloading nginx..."
    systemctl reload nginx
    echo "✅ nginx reloaded"
    
    # Check status
    if systemctl is-active --quiet nginx; then
        echo "✅ nginx is running"
    else
        echo "⚠️  nginx is not running, attempting to start..."
        systemctl start nginx
    fi
else
    echo "❌ Configuration test failed!"
    echo ""
    echo "Error details:"
    cat /tmp/nginx-test.log
    
    # Restore backup if exists
    if [ -f "$BACKUP_FILE" ]; then
        echo ""
        echo "🔙 Restoring backup configuration..."
        cp "$BACKUP_FILE" "$DEST_NGINX_AVAILABLE"
        nginx -t && systemctl reload nginx
        echo "✅ Backup restored"
    fi
    
    exit 1
fi

echo ""
echo "========================================"
echo "✅ nginx Configuration Synced!"
echo "========================================"
echo ""
echo "🧪 Test the configuration:"
echo "   curl http://localhost/api/health"
echo ""

