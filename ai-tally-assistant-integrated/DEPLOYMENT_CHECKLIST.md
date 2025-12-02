# ✅ Deployment Checklist

## 📦 Files to Upload to Hugging Face (Backend)

### Required Files:
```
backend/
├── app.py                    ✅ REQUIRED - Entry point
├── Dockerfile.hf             ✅ REQUIRED - Dockerfile
├── README.md                 ✅ REQUIRED - Spaces metadata
├── requirements.txt          ✅ REQUIRED - Dependencies
├── .dockerignore             ✅ Optional but recommended
└── app/                      ✅ REQUIRED - Application code
    ├── main.py
    ├── config.py
    ├── models/
    ├── routes/
    ├── services/
    └── ... (all subdirectories)
```

### Upload Method:
1. **Via Git** (Recommended):
   ```bash
   git clone https://huggingface.co/spaces/YOUR_USERNAME/ai-tally-backend
   cd ai-tally-backend
   cp -r ../backend/* .
   git add .
   git commit -m "Deploy"
   git push
   ```

2. **Via Web Interface**:
   - Go to your Space
   - Click "Files and versions"
   - Upload all files from `backend/` directory

---

## 🌐 Files for Render.com (Frontend)

### Required Files:
```
frontend/
├── package.json              ✅ REQUIRED
├── vite.config.js            ✅ REQUIRED
├── index.html                ✅ REQUIRED
├── .env.production           ✅ Optional (set in Render dashboard)
├── render.yaml               ✅ Optional (auto-config)
└── src/                      ✅ REQUIRED - Source code
    ├── main.jsx
    ├── App.jsx
    ├── api/
    ├── components/
    └── ... (all subdirectories)
```

### Render Configuration:
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Environment Variable**: `VITE_API_URL`

---

## 🔑 Environment Variables

### Backend (Hugging Face Spaces)

**Required:**
```env
SECRET_KEY=generate-this-randomly
JWT_SECRET_KEY=generate-this-randomly
CORS_ORIGINS=https://your-frontend.onrender.com
```

**Optional:**
```env
DB_URL=sqlite:///./database.db
API_PORT=7860
DEBUG=False
LOG_LEVEL=INFO
TALLY_HOST=localhost
TALLY_PORT=9000
OLLAMA_BASE_URL=http://localhost:11434
```

### Frontend (Render.com)

**Required:**
```env
VITE_API_URL=https://your-username-ai-tally-backend.hf.space
```

---

## 📝 Step-by-Step Deployment

### Backend Deployment (Hugging Face)

- [ ] Create Hugging Face account
- [ ] Create new Space (Docker SDK)
- [ ] Upload all backend files
- [ ] Set environment variables
- [ ] Wait for build (5-10 min)
- [ ] Test backend at `/docs`
- [ ] Copy backend URL

### Frontend Deployment (Render)

- [ ] Push code to GitHub
- [ ] Create Render account
- [ ] Create Static Site
- [ ] Set root: `frontend`
- [ ] Set build command
- [ ] Add `VITE_API_URL` variable
- [ ] Deploy (2-5 min)
- [ ] Copy frontend URL

### Connection

- [ ] Update backend `CORS_ORIGINS` with frontend URL
- [ ] Restart Hugging Face Space
- [ ] Test frontend → backend connection
- [ ] Test authentication
- [ ] Test dashboards

---

## 🧪 Post-Deployment Testing

- [ ] Backend API docs accessible
- [ ] Backend health check works
- [ ] Frontend loads correctly
- [ ] No CORS errors in console
- [ ] Login/Registration works
- [ ] Dashboards load data
- [ ] All 20 dashboards functional
- [ ] Charts and graphs display correctly

---

## 🆘 Common Issues

### Backend Build Fails
- ✅ Check Dockerfile.hf exists
- ✅ Verify app.py is in root
- ✅ Check requirements.txt
- ✅ Review build logs

### Frontend Can't Connect
- ✅ Verify VITE_API_URL is correct
- ✅ Check backend CORS_ORIGINS
- ✅ Ensure backend is running
- ✅ Check browser console

### CORS Errors
- ✅ Update CORS_ORIGINS in Hugging Face
- ✅ Include exact frontend URL
- ✅ Restart backend after updating
- ✅ Check for typos in URLs

---

## ✅ Final Checklist

- [ ] All files uploaded
- [ ] Environment variables set
- [ ] Backend deployed and running
- [ ] Frontend deployed and running
- [ ] CORS configured correctly
- [ ] All features tested
- [ ] Application fully functional

---

**You're ready to deploy! Follow `DEPLOY_NOW.md` for detailed steps.**

