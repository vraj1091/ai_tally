@echo off
echo ===================================================
echo AI Tally Assistant - Deployment Script
echo ===================================================

echo.
echo 1. Pushing to GitHub (vraj1091/ai_tally)...
git add .
git commit -m "Fix: Document upload RAG error handling and Dashboard data accuracy improvements"
git push origin main

echo.
echo 2. Pushing to Hugging Face (vraj1091/ai_tally_backend)...
cd hf-backend
echo.
set /p HF_TOKEN="Enter your Hugging Face Access Token (hidden input not supported, paste carefully): "
echo.
git add .
git commit -m "Fix: Document upload RAG error handling and Dashboard data accuracy improvements"
echo.
echo Pulling latest changes from Hugging Face to avoid conflicts...
git pull https://vraj1091:%HF_TOKEN%@huggingface.co/spaces/vraj1091/ai_tally_backend main
echo.
echo Pushing to Hugging Face...
git push https://vraj1091:%HF_TOKEN%@huggingface.co/spaces/vraj1091/ai_tally_backend main
cd ..

echo.
echo ===================================================
echo Deployment Complete!
echo ===================================================
pause
