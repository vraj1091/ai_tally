# 🚀 Render.com Deployment - Step by Step

## Quick Deploy to Render.com (Free Forever)

### Prerequisites
- GitHub account
- Your code pushed to GitHub

---

## Step-by-Step Guide

### Step 1: Push Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### Step 2: Create Render Account
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub (recommended)

### Step 3: Create New Web Service
1. Click "New +" button (top right)
2. Select "Web Service"
3. Connect your GitHub repository
4. Select the repository

### Step 4: Configure Service

**Basic Settings:**
- **Name**: `ai-tally-backend` (or any name)
- **Region**: Choose closest to you
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend` ⚠️ **IMPORTANT**
- **Runtime**: `Python 3`
- **Build Command**: 
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**: 
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

**Instance Type:**
- Select "Free" tier

### Step 5: Add Environment Variables

Click "Advanced" → "Add Environment Variable" and add:

```env
# Required - Change these!
SECRET_KEY=your-random-secret-key-here
JWT_SECRET_KEY=your-random-jwt-secret-here

# CORS - Add your frontend URL later
CORS_ORIGINS=http://localhost:5173,https://your-frontend.onrender.com

# Database
DB_URL=sqlite:///./database.db

# Tally
TALLY_HOST=localhost
TALLY_PORT=9000

# Ollama (if using)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi4:14b

# API
API_HOST=0.0.0.0
API_PORT=$PORT
DEBUG=False

# Logging
LOG_LEVEL=INFO
```

**Generate Secret Keys:**
```bash
# On Linux/Mac:
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Or use online generator:
# https://randomkeygen.com/
```

### Step 6: Deploy

1. Click "Create Web Service"
2. Wait 5-10 minutes for first build
3. Your backend will be live at: `https://your-app-name.onrender.com`

### Step 7: Test Your Backend

1. Visit: `https://your-app-name.onrender.com/docs`
2. You should see FastAPI documentation
3. Test health endpoint: `https://your-app-name.onrender.com/health`

---

## ⚠️ Important Notes

### Service Sleep Mode
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Subsequent requests are fast
- **Solution**: Upgrade to paid plan ($7/month) to avoid sleep

### Database
- SQLite works but data is lost on redeploy
- For persistent data, use Render's PostgreSQL (free tier available)
- Or use external database service

### File Storage
- Files uploaded to `/uploads` are temporary
- Use cloud storage (S3, Cloudinary) for production
- Or use Render's disk storage (limited on free tier)

---

## 🔧 Update Frontend After Deployment

Update `frontend/.env`:

```env
VITE_API_URL=https://your-app-name.onrender.com
```

Then rebuild and redeploy frontend.

---

## 📊 Monitoring

1. Go to your service dashboard
2. View logs in real-time
3. Check metrics (CPU, Memory, Requests)
4. View deployment history

---

## 🆘 Troubleshooting

### Build Fails
- Check logs in Render dashboard
- Verify `requirements.txt` exists
- Check Python version compatibility

### Service Won't Start
- Check start command is correct
- Verify `app.main:app` path
- Check environment variables

### 502 Bad Gateway
- Service might be sleeping (wait 30 seconds)
- Check service logs
- Verify port is `$PORT` (not hardcoded)

### CORS Errors
- Update `CORS_ORIGINS` with your frontend URL
- Include both `http://` and `https://` if needed
- Restart service after updating

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] Web service created
- [ ] Root directory set to `backend`
- [ ] Build command: `pip install -r requirements.txt`
- [ ] Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- [ ] Environment variables added
- [ ] Secret keys generated and set
- [ ] CORS_ORIGINS updated
- [ ] Service deployed successfully
- [ ] API docs accessible at `/docs`
- [ ] Frontend updated with backend URL

---

## 🎉 You're Done!

Your backend is now live on Render.com for free!

**Next Steps:**
1. Deploy frontend (see frontend deployment guide)
2. Update frontend with backend URL
3. Test the full application
4. Share your app! 🚀

