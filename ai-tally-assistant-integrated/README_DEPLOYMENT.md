# 🚀 Deployment Guide - AI Tally Assistant

## Quick Start

### For Windows Users:
```cmd
deploy.bat
```

### For Linux/Mac Users:
```bash
chmod +x deploy.sh
./deploy.sh
```

### Manual Docker Compose:
```bash
docker-compose build
docker-compose up -d
```

---

## 📋 Pre-Deployment Checklist

- [ ] Docker Desktop installed and running
- [ ] Environment variables configured (see `.env.example`)
- [ ] Backend `.env` file created
- [ ] Frontend `.env` file created
- [ ] Security keys updated (SECRET_KEY, JWT_SECRET_KEY)

---

## 🔧 Environment Setup

### 1. Backend Environment (backend/.env)

```env
# Required - Change these!
SECRET_KEY=your-random-secret-key-here
JWT_SECRET_KEY=your-random-jwt-secret-here

# CORS - Add your frontend URL
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Database (SQLite default)
DB_URL=sqlite:///./database.db

# Tally Configuration
TALLY_HOST=localhost
TALLY_PORT=9000

# Ollama (if using)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi4:14b
```

### 2. Frontend Environment (frontend/.env)

```env
# Development
VITE_API_URL=http://localhost:8000

# Production (update with your backend URL)
# VITE_API_URL=https://api.yourdomain.com
```

---

## 🌐 Deployment Options

### Option 1: Local Docker (Recommended for Testing)

```bash
docker-compose up -d
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option 2: Railway.app

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Deploy backend: `cd backend && railway up`
4. Deploy frontend: `cd frontend && railway up`

### Option 3: Render.com

**Backend:**
- New Web Service
- Root: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Frontend:**
- New Static Site
- Root: `frontend`
- Build: `npm install && npm run build`
- Publish: `dist`

### Option 4: VPS (DigitalOcean, Linode, etc.)

1. SSH into server
2. Install Docker: `curl -fsSL https://get.docker.com | sh`
3. Clone repo: `git clone <your-repo>`
4. Deploy: `docker-compose up -d`
5. Setup Nginx + SSL (see nginx/nginx.conf)

---

## 🔒 Production Security Checklist

- [ ] Change SECRET_KEY to random string
- [ ] Change JWT_SECRET_KEY to random string
- [ ] Update CORS_ORIGINS with production URLs
- [ ] Enable HTTPS/SSL
- [ ] Set DEBUG=False
- [ ] Configure firewall rules
- [ ] Setup database backups
- [ ] Enable log monitoring

---

## 📊 Monitoring & Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### Health Checks
- Backend: http://localhost:8000/health
- Frontend: http://localhost:3000/health

---

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Change ports in docker-compose.yml
# Or find and stop the service using the port
netstat -ano | findstr :8000  # Windows
lsof -i :8000                 # Linux/Mac
```

### Can't Connect Frontend to Backend
1. Check `VITE_API_URL` in frontend/.env
2. Check `CORS_ORIGINS` in backend/.env
3. Verify backend is running: `docker-compose ps`

### Database Errors
1. Check `DB_URL` in backend/.env
2. Ensure database file has write permissions
3. Check logs: `docker-compose logs backend`

---

## 📚 Additional Resources

- [Full Deployment Guide](./DEPLOYMENT.md)
- [Quick Start Guide](./QUICK_START.md)
- [Docker Documentation](https://docs.docker.com/)

---

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Check Docker is running: `docker ps`
4. Review error messages in browser console (F12)

---

**Happy Deploying! 🚀**

