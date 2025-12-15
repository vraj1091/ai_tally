#!/bin/bash

# Quick Deployment Script for AI Tally - Fixed Build
# Run this on your Ubuntu server after uploading the updated files

echo "🚀 Starting deployment with fixed build..."

# Navigate to project
cd ~/ai_tally || exit 1

echo "📦 Stopping existing containers..."
docker-compose down

echo "🔨 Building frontend WITHOUT cache (to pick up package changes)..."
docker-compose build --no-cache frontend

echo "🚢 Starting all services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "📋 Checking frontend logs..."
docker-compose logs --tail=50 frontend

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your app at: http://107.21.87.222:5173"
echo "🔍 Check logs with: docker-compose logs -f frontend"
echo "📊 Check status with: docker-compose ps"

