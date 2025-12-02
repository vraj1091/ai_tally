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
cd backend
git add .
git commit -m "Fix: Document upload RAG error handling and Dashboard data accuracy improvements"
git push https://vraj1091:hf_token@huggingface.co/spaces/vraj1091/ai_tally_backend main
cd ..

echo.
echo ===================================================
echo Deployment Complete!
echo ===================================================
pause
