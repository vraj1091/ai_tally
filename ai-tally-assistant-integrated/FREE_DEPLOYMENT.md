# 🆓 Free Backend Deployment Options

## Best Free Hosting Platforms for FastAPI Backend

### 🥇 **Railway.app** (Recommended - Easiest)
- **Free Tier**: $5 credit/month (usually enough for small apps)
- **Pros**: 
  - Very easy setup
  - Auto-deploy from GitHub
  - Free SSL included
  - Good documentation
- **Cons**: Limited free credits
- **Best for**: Quick deployment, testing, small projects

### 🥈 **Render.com** (Best Free Tier)
- **Free Tier**: Free web services (sleeps after 15 min inactivity)
- **Pros**: 
  - Truly free (no credit card needed)
  - Auto-deploy from GitHub
  - Free SSL
  - Good for development/testing
- **Cons**: 
  - Services sleep after inactivity (slow first request)
  - Limited resources
- **Best for**: Development, testing, low-traffic apps

### 🥉 **Fly.io**
- **Free Tier**: 3 shared VMs, 3GB storage
- **Pros**: 
  - Generous free tier
  - Global edge network
  - Good performance
- **Cons**: Slightly more complex setup
- **Best for**: Production-ready free hosting

### 4. **PythonAnywhere**
- **Free Tier**: Limited web apps
- **Pros**: 
  - Python-focused
  - Simple setup
- **Cons**: Limited features on free tier
- **Best for**: Simple Python apps

### 5. **Heroku** (Limited Free Tier)
- **Note**: Heroku removed free tier, but alternatives exist
- **Best for**: Not recommended anymore

---

## 🚀 Quick Deployment Guides

### Option 1: Railway.app (Easiest - Recommended)

#### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

#### Step 2: Login
```bash
railway login
```

#### Step 3: Deploy Backend
```bash
cd backend
railway init
railway up
```

#### Step 4: Set Environment Variables
In Railway dashboard:
1. Go to your project
2. Click on your service
3. Go to "Variables" tab
4. Add these variables:

```env
TALLY_HOST=localhost
TALLY_PORT=9000
OLLAMA_BASE_URL=http://localhost:11434
DB_URL=sqlite:///./database.db
API_HOST=0.0.0.0
API_PORT=$PORT
DEBUG=False
CORS_ORIGINS=https://your-frontend-url.com
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
LOG_LEVEL=INFO
```

#### Step 5: Get Your Backend URL
Railway will give you a URL like: `https://your-app.railway.app`

**That's it!** Your backend is live! 🎉

---

### Option 2: Render.com (Truly Free)

#### Step 1: Create Account
1. Go to https://render.com
2. Sign up with GitHub (free)

#### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select your repository

#### Step 3: Configure Service
- **Name**: `ai-tally-backend`
- **Root Directory**: `backend`
- **Environment**: `Python 3`
- **Build Command**: 
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command**: 
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```

#### Step 4: Add Environment Variables
Click "Environment" tab and add:

```env
TALLY_HOST=localhost
TALLY_PORT=9000
OLLAMA_BASE_URL=http://localhost:11434
DB_URL=sqlite:///./database.db
API_HOST=0.0.0.0
API_PORT=$PORT
DEBUG=False
CORS_ORIGINS=https://your-frontend-url.com
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
LOG_LEVEL=INFO
```

#### Step 5: Deploy
Click "Create Web Service" - Render will:
1. Build your app
2. Deploy it
3. Give you a URL like: `https://your-app.onrender.com`

**Note**: First deployment takes 5-10 minutes. After inactivity, service sleeps (first request after sleep takes ~30 seconds).

---

### Option 3: Fly.io (Best Performance)

#### Step 1: Install Fly CLI
```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Mac/Linux
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Login
```bash
fly auth login
```

#### Step 3: Create Fly App
```bash
cd backend
fly launch
```

#### Step 4: Create fly.toml
Create `backend/fly.toml`:

```toml
app = "your-app-name"
primary_region = "iad"

[build]

[env]
  PORT = "8000"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

#### Step 5: Set Secrets
```bash
fly secrets set SECRET_KEY=your-secret-key
fly secrets set JWT_SECRET_KEY=your-jwt-secret
fly secrets set CORS_ORIGINS=https://your-frontend-url.com
```

#### Step 6: Deploy
```bash
fly deploy
```

---

## 📊 Comparison Table

| Platform | Free Tier | Setup Difficulty | Sleep Mode | Best For |
|----------|-----------|------------------|------------|----------|
| **Railway** | $5/month credit | ⭐ Easy | No | Quick deployment |
| **Render** | Free forever | ⭐ Easy | Yes (15 min) | Development/Testing |
| **Fly.io** | 3 VMs free | ⭐⭐ Medium | No | Production-ready |
| **PythonAnywhere** | Limited | ⭐⭐ Medium | Yes | Simple apps |

---

## 🎯 My Recommendation

### For Quick Testing → **Render.com**
- No credit card needed
- Easiest setup
- Good for development

### For Production → **Railway.app**
- Better performance
- No sleep mode
- Easy to use
- $5 credit usually enough

### For Best Free Performance → **Fly.io**
- Generous free tier
- No sleep mode
- Global edge network

---

## 🔧 Quick Setup Script for Render

Create `backend/render-setup.sh`:

```bash
#!/bin/bash
echo "Setting up Render.com deployment..."

# Create render.yaml if it doesn't exist
cat > render.yaml << EOF
services:
  - type: web
    name: ai-tally-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port \$PORT
    envVars:
      - key: DB_URL
        value: sqlite:///./database.db
      - key: DEBUG
        value: False
EOF

echo "✅ Render configuration created!"
echo "Now go to render.com and connect your GitHub repo"
```

---

## 📝 Important Notes

### Database on Free Tier
- **SQLite** works on all platforms (file-based)
- **PostgreSQL** available on some platforms (Render, Railway)
- For production, consider upgrading to managed database

### File Storage
- Free tiers have limited storage
- Use cloud storage (S3, Cloudinary) for uploads
- Or use platform's file system (temporary)

### Environment Variables
Always set these in your hosting platform:
- `SECRET_KEY` - Random string
- `JWT_SECRET_KEY` - Random string  
- `CORS_ORIGINS` - Your frontend URL
- `DEBUG=False` - For production

---

## 🚀 Next Steps After Deployment

1. ✅ Backend deployed
2. 🔗 Get your backend URL
3. 📝 Update frontend `.env` with backend URL
4. 🌐 Deploy frontend (see frontend deployment guide)
5. ✅ Test the connection

---

## 🆘 Troubleshooting

### Render.com - Service Sleeping
- First request after sleep takes 30 seconds
- Upgrade to paid plan to avoid sleep
- Or use Railway/Fly.io

### Railway - Out of Credits
- Check usage in dashboard
- Optimize your app
- Or switch to Render.com

### Database Issues
- SQLite works on all platforms
- For PostgreSQL, use platform's managed database
- Check database URL in environment variables

---

## 💡 Pro Tips

1. **Start with Render.com** - Easiest, truly free
2. **Move to Railway** - If you need better performance
3. **Use Fly.io** - For production-ready free hosting
4. **Monitor usage** - Check platform dashboards
5. **Backup database** - Export SQLite file regularly

---

**Recommended: Start with Render.com for easiest free deployment!** 🎉

