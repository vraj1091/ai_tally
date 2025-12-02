# 🚀 Deploy Now - Step by Step Guide

## Quick Deployment: Backend (Hugging Face) + Frontend (Render)

---

## Part 1: Deploy Backend to Hugging Face (15 minutes)

### Step 1: Create Hugging Face Account
1. Go to https://huggingface.co
2. Click "Sign Up" (free)
3. Verify your email

### Step 2: Create New Space
1. Go to https://huggingface.co/spaces
2. Click **"Create new Space"**
3. Fill in:
   - **Space name**: `ai-tally-backend` (or your choice)
   - **SDK**: Select **"Docker"** ⚠️ Important!
   - **Visibility**: Public or Private
4. Click **"Create Space"**

### Step 3: Upload Backend Files

**Option A: Using Git (Recommended)**
```bash
# Install Hugging Face CLI
pip install huggingface_hub

# Login
huggingface-cli login
# Enter your token from: https://huggingface.co/settings/tokens

# Clone your space (replace YOUR_USERNAME)
git clone https://huggingface.co/spaces/YOUR_USERNAME/ai-tally-backend
cd ai-tally-backend

# Copy all backend files
cp -r ../backend/* .

# Commit and push
git add .
git commit -m "Initial deployment"
git push
```

**Option B: Using Web Interface**
1. Go to your Space page
2. Click "Files and versions" tab
3. Click "Add file" → "Upload files"
4. Upload all files from `backend/` directory:
   - `app.py`
   - `Dockerfile.hf`
   - `README.md`
   - `requirements.txt`
   - All files in `app/` directory

### Step 4: Set Environment Variables

1. Go to your Space → **Settings** → **Variables and secrets**
2. Click **"Add a new variable"** for each:

```env
SECRET_KEY=generate-random-string-here
JWT_SECRET_KEY=generate-random-string-here
CORS_ORIGINS=https://your-frontend.onrender.com
DB_URL=sqlite:///./database.db
API_PORT=7860
DEBUG=False
LOG_LEVEL=INFO
```

**Generate Secret Keys:**
```python
import secrets
print("SECRET_KEY=" + secrets.token_urlsafe(32))
print("JWT_SECRET_KEY=" + secrets.token_urlsafe(32))
```

### Step 5: Wait for Build
- First build takes 5-10 minutes
- Watch the "Logs" tab for progress
- Your backend URL: `https://YOUR_USERNAME-ai-tally-backend.hf.space`

### Step 6: Test Backend
1. Visit: `https://YOUR_USERNAME-ai-tally-backend.hf.space/docs`
2. You should see FastAPI documentation
3. Test `/health` endpoint

**✅ Backend Deployed!** Copy your backend URL for next step.

---

## Part 2: Deploy Frontend to Render (10 minutes)

### Step 1: Push Code to GitHub
```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Deployment ready"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/your-repo.git
git push -u origin main
```

### Step 2: Create Render Account
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended)

### Step 3: Create Static Site
1. Click **"New +"** → **"Static Site"**
2. Connect your GitHub repository
3. Select your repository

### Step 4: Configure Static Site

**Settings:**
- **Name**: `ai-tally-frontend`
- **Branch**: `main` (or your default branch)
- **Root Directory**: `frontend` ⚠️ Important!
- **Build Command**: 
  ```bash
  npm install && npm run build
  ```
- **Publish Directory**: `dist`

### Step 5: Add Environment Variable

1. Click **"Environment"** tab
2. Click **"Add Environment Variable"**
3. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://YOUR_USERNAME-ai-tally-backend.hf.space`
   - ⚠️ **Replace with your actual Hugging Face backend URL**

### Step 6: Deploy
1. Click **"Create Static Site"**
2. Wait for build (2-5 minutes)
3. Your frontend URL: `https://ai-tally-frontend.onrender.com`

**✅ Frontend Deployed!**

---

## Part 3: Connect Frontend to Backend (5 minutes)

### Step 1: Update Backend CORS
1. Go back to Hugging Face Space
2. Go to **Settings** → **Variables and secrets**
3. Find `CORS_ORIGINS` variable
4. Update value to:
   ```env
   https://ai-tally-frontend.onrender.com
   ```
   (Or your actual Render frontend URL)

### Step 2: Restart Backend
1. In Hugging Face Space
2. Go to **Settings** → **Restart this Space**
3. Wait for restart (1-2 minutes)

### Step 3: Test Full Application
1. Visit your frontend: `https://ai-tally-frontend.onrender.com`
2. Open browser console (F12)
3. Check for any errors
4. Test login/registration
5. Test dashboards

---

## ✅ Deployment Complete!

### Your URLs:
- **Backend API**: `https://YOUR_USERNAME-ai-tally-backend.hf.space`
- **Backend Docs**: `https://YOUR_USERNAME-ai-tally-backend.hf.space/docs`
- **Frontend**: `https://ai-tally-frontend.onrender.com`

### Cost:
- **Hugging Face**: Free (with limits)
- **Render Static Site**: Free forever
- **Total**: $0/month 🎉

---

## 🆘 Troubleshooting

### Backend Issues

**Build fails:**
- Check `Dockerfile.hf` exists
- Verify `app.py` is in root
- Check logs in Hugging Face

**CORS errors:**
- Update `CORS_ORIGINS` in Space settings
- Include your Render frontend URL
- Restart Space

### Frontend Issues

**Can't connect to backend:**
- Verify `VITE_API_URL` in Render environment
- Check it matches your Hugging Face URL
- Rebuild frontend after updating

**Build fails:**
- Check Node.js version (18+)
- Verify `package.json` is correct
- Check build logs in Render

---

## 📝 Quick Reference

### Backend Environment Variables (Hugging Face)
```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
CORS_ORIGINS=https://your-frontend.onrender.com
DB_URL=sqlite:///./database.db
API_PORT=7860
DEBUG=False
```

### Frontend Environment Variable (Render)
```env
VITE_API_URL=https://your-backend.hf.space
```

---

## 🎉 You're Live!

Your application is now deployed and accessible worldwide!

**Next Steps:**
1. Test all features
2. Share your app
3. Monitor usage
4. Enjoy! 🚀

