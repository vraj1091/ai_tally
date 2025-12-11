#!/bin/bash
# Build script for Render.com deployment

echo "Building frontend for production..."

# Install dependencies
npm install

# Build with production environment
npm run build

echo "Build complete! Output in dist/ directory"

