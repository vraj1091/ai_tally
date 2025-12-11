# 🚂 Railway.app Deployment - Step by Step

## Quick Deploy to Railway (Easiest Option)

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

### Step 2: Create Railway Account
1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (recommended)
4. Railway gives you $5 free credit/month

### Step 3: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your repository
4. Railway will detect it's a Python project

### Step 4: Configure Service

**Settings:**
- **Root Directory**: `backend` ⚠️ **IMPORTANT**
- **Start Command**: 
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

Railway auto-detects:
- Build command: `pip install -r requirements.txt`
- Python version: 3.11

### Step 5: Add Environment Variables

Click on your service → "Variables" tab → Add:

```env
# Required - Change these!
SECRET_KEY=your-random-secret-key-here
JWT_SECRET_KEY=your-random-jwt-secret-here

# CORS - Add your frontend URL
CORS_ORIGINS=http://localhost:5173,https://your-frontend.railway.app

# Database
DB_URL=sqlite:///./database.db

# Tally
TALLY_HOST=localhost
TALLY_PORT=9000

# Ollama
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

Railway automatically:
1. Builds your app
2. Deploys it
3. Gives you a URL: `https://your-app.up.railway.app`

**That's it!** Your backend is live! 🎉

### Step 7: Get Your Backend URL

1. Click on your service
2. Go to "Settings" tab
3. Copy "Public Domain" URL
4. Use this in your frontend `.env`

---

## ⚠️ Important Notes

### Free Credits
- $5 free credit/month
- Usually enough for small apps
- Check usage in dashboard
- Upgrade if needed ($5/month for hobby plan)

### No Sleep Mode
- Services stay awake 24/7
- Fast response times
- Better than Render for production

### Database
- SQLite works (file-based)
- PostgreSQL available (add as service)
- Data persists between deployments

---

## 🔧 Update Frontend After Deployment

Update `frontend/.env`:

```env
VITE_API_URL=https://your-app.up.railway.app
```

---

## 📊 Monitoring

1. View logs in real-time
2. Check metrics (CPU, Memory, Network)
3. View deployment history
4. Monitor usage/credits

---

## 🆘 Troubleshooting

### Build Fails
- Check logs in Railway dashboard
- Verify `requirements.txt` exists
- Check root directory is `backend`

### Service Won't Start
- Check start command
- Verify environment variables
- Check logs for errors

### Out of Credits
- Check usage in dashboard
- Optimize your app
- Upgrade to paid plan ($5/month)

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] New project created
- [ ] Root directory set to `backend`
- [ ] Environment variables added
- [ ] Secret keys generated and set
- [ ] CORS_ORIGINS updated
- [ ] Service deployed successfully
- [ ] Backend URL copied
- [ ] Frontend updated with backend URL

---

## 🎉 You're Done!

Your backend is now live on Railway.app!

**Advantages:**
- ✅ No sleep mode
- ✅ Fast deployment
- ✅ Easy to use
- ✅ Good documentation
- ✅ $5 free credit/month

**Next Steps:**
1. Deploy frontend
2. Update frontend with backend URL
3. Test the full application
4. Monitor usage in dashboard

