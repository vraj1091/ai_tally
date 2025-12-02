# 🚀 Hugging Face Spaces + Render.com Deployment Guide

## Deployment Architecture

- **Backend**: Hugging Face Spaces (FastAPI)
- **Frontend**: Render.com (Static Site)

---

## Part 1: Deploy Backend to Hugging Face Spaces

### Step 1: Prepare Your Code

1. **Ensure you have these files in `backend/` directory:**
   - ✅ `app.py` (Hugging Face entry point)
   - ✅ `Dockerfile.hf` (Hugging Face Dockerfile)
   - ✅ `README.md` (Spaces metadata)
   - ✅ `requirements.txt`
   - ✅ All your application code

### Step 2: Create Hugging Face Space

1. Go to https://huggingface.co/spaces
2. Click "Create new Space"
3. Fill in:
   - **Space name**: `ai-tally-assistant-backend` (or your choice)
   - **SDK**: Select **Docker**
   - **Visibility**: Public or Private
4. Click "Create Space"

### Step 3: Push Code to Hugging Face

```bash
# Install Hugging Face CLI (if not installed)
pip install huggingface_hub

# Login to Hugging Face
huggingface-cli login

# Clone your space (replace with your space name)
git clone https://huggingface.co/spaces/yourusername/ai-tally-assistant-backend
cd ai-tally-assistant-backend

# Copy backend files
cp -r ../backend/* .

# Commit and push
git add .
git commit -m "Initial deployment"
git push
```

**OR use GitHub integration:**
1. In Space settings, connect your GitHub repo
2. Set root directory to `backend`
3. Hugging Face will auto-deploy

### Step 4: Configure Environment Variables

In your Hugging Face Space settings:

1. Go to "Settings" → "Variables and secrets"
2. Add these variables:

```env
SECRET_KEY=your-random-secret-key-here
JWT_SECRET_KEY=your-random-jwt-secret-here
CORS_ORIGINS=https://your-frontend.onrender.com,https://your-frontend.railway.app
DB_URL=sqlite:///./database.db
TALLY_HOST=localhost
TALLY_PORT=9000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi4:14b
LOG_LEVEL=INFO
DEBUG=False
```

**Generate Secret Keys:**
```python
import secrets
print(secrets.token_urlsafe(32))
```

### Step 5: Wait for Deployment

- Hugging Face will build and deploy automatically
- First build takes 5-10 minutes
- Your backend will be at: `https://yourusername-ai-tally-assistant-backend.hf.space`

### Step 6: Test Your Backend

1. Visit: `https://yourusername-ai-tally-assistant-backend.hf.space/docs`
2. Test health endpoint: `https://yourusername-ai-tally-assistant-backend.hf.space/health`
3. Copy your backend URL for frontend configuration

---

## Part 2: Deploy Frontend to Render.com

### Step 1: Update Frontend Configuration

1. **Update `frontend/.env.production`:**
```env
VITE_API_URL=https://yourusername-ai-tally-assistant-backend.hf.space
```

2. **Update `frontend/vite.config.js`** (already done, but verify):
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for production
  }
})
```

### Step 2: Push Code to GitHub

```bash
cd frontend
git init
git add .
git commit -m "Frontend deployment ready"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### Step 3: Deploy on Render.com

1. Go to https://render.com
2. Sign up/Login with GitHub
3. Click "New +" → "Static Site"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `ai-tally-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: 
     ```bash
     npm install && npm run build
     ```
   - **Publish Directory**: `dist`

### Step 4: Add Environment Variables

In Render.com dashboard:
1. Go to your static site
2. Click "Environment"
3. Add:
   ```env
   VITE_API_URL=https://yourusername-ai-tally-assistant-backend.hf.space
   ```

### Step 5: Deploy

1. Click "Create Static Site"
2. Wait for build (2-5 minutes)
3. Your frontend will be at: `https://ai-tally-frontend.onrender.com`

### Step 6: Update Backend CORS

1. Go back to Hugging Face Space settings
2. Update `CORS_ORIGINS` variable:
   ```env
   CORS_ORIGINS=https://ai-tally-frontend.onrender.com,https://your-frontend.onrender.com
   ```
3. Restart the Space (Settings → Restart)

---

## Part 3: Final Configuration

### Update Frontend API Client

The frontend should automatically use `VITE_API_URL` from environment variables.

Verify `frontend/src/api/client.js`:
```javascript
const API_URL = import.meta.env.VITE_API_URL || '/api'
```

### Test Full Application

1. ✅ Backend: `https://your-backend.hf.space/docs`
2. ✅ Frontend: `https://your-frontend.onrender.com`
3. ✅ Test login/registration
4. ✅ Test API calls from frontend
5. ✅ Test dashboards

---

## Troubleshooting

### Backend Issues

**Build Fails:**
- Check Dockerfile.hf exists
- Verify requirements.txt
- Check logs in Hugging Face Space

**CORS Errors:**
- Update CORS_ORIGINS in Space settings
- Include both http:// and https:// if needed
- Restart Space after updating

**Port Issues:**
- Hugging Face uses port 7860
- Ensure app.py uses port 7860

### Frontend Issues

**Can't Connect to Backend:**
- Verify VITE_API_URL in Render environment
- Check backend CORS_ORIGINS includes frontend URL
- Check browser console for errors

**Build Fails:**
- Check Node.js version (should be 18+)
- Verify all dependencies in package.json
- Check build logs in Render

---

## Deployment Checklist

### Backend (Hugging Face)
- [ ] Code pushed to Hugging Face Space
- [ ] Dockerfile.hf exists
- [ ] app.py exists and configured
- [ ] Environment variables set
- [ ] SECRET_KEY and JWT_SECRET_KEY generated
- [ ] CORS_ORIGINS configured
- [ ] Space deployed successfully
- [ ] API docs accessible at /docs
- [ ] Health check works

### Frontend (Render)
- [ ] Code pushed to GitHub
- [ ] Render static site created
- [ ] Root directory set to `frontend`
- [ ] Build command: `npm install && npm run build`
- [ ] Publish directory: `dist`
- [ ] VITE_API_URL environment variable set
- [ ] Frontend deployed successfully
- [ ] Can access frontend URL

### Integration
- [ ] Backend CORS includes frontend URL
- [ ] Frontend can call backend API
- [ ] Authentication works
- [ ] Dashboards load data
- [ ] All features tested

---

## URLs After Deployment

- **Backend API**: `https://yourusername-ai-tally-assistant-backend.hf.space`
- **Backend Docs**: `https://yourusername-ai-tally-assistant-backend.hf.space/docs`
- **Frontend**: `https://ai-tally-frontend.onrender.com`

---

## Cost

- **Hugging Face Spaces**: Free (with limitations)
- **Render.com Static Sites**: Free forever
- **Total Cost**: $0/month 🎉

---

## Next Steps

1. ✅ Both services deployed
2. 🔐 Test authentication
3. 📊 Test all 20 dashboards
4. 🔗 Share your application
5. 📈 Monitor usage

---

**You're all set! Your application is now live! 🚀**

