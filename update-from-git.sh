#!/bin/bash

# AI Tally - Complete Update Script
# This script pulls latest code and syncs all configurations
# Usage: sudo bash update-from-git.sh

set -e

echo "========================================"
echo "AI Tally - Update from GitHub"
echo "========================================"
echo ""

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check git status
echo "📂 Current directory: $SCRIPT_DIR"
echo "🌿 Current branch: $(git branch --show-current)"
echo ""

# Stash any local changes
if ! git diff-index --quiet HEAD --; then
    echo "💾 Stashing local changes..."
    git stash
    STASHED=true
fi

# Pull latest changes
echo "⬇️  Pulling latest changes from GitHub..."
if git pull origin main; then
    echo "✅ Successfully pulled latest code"
else
    echo "❌ Failed to pull from GitHub"
    if [ "$STASHED" = true ]; then
        echo "🔙 Restoring stashed changes..."
        git stash pop
    fi
    exit 1
fi

echo ""

# Restore stashed changes if any
if [ "$STASHED" = true ]; then
    echo "🔙 Restoring stashed changes..."
    git stash pop
    echo ""
fi

# Check if running as root for config sync
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Not running as root. Skipping system configuration sync."
    echo "   To sync nginx and restart services, run:"
    echo "   sudo bash deploy-scripts/post-pull.sh"
    echo ""
    exit 0
fi

# Run post-pull script
if [ -f "deploy-scripts/post-pull.sh" ]; then
    echo "🔄 Running post-pull configuration sync..."
    echo ""
    bash deploy-scripts/post-pull.sh
else
    echo "⚠️  post-pull.sh not found"
    echo "   Manually sync with: sudo bash deploy-scripts/sync-nginx.sh"
fi

echo ""
echo "✅ Update complete!"
echo ""

