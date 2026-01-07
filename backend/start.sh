#!/bin/bash
# Startup script for Hugging Face Spaces

echo "Starting AI Tally Assistant Backend..."

# Set default port for Hugging Face
export API_PORT=${PORT:-7860}
export API_HOST=0.0.0.0

# Run the application
python app.py

