# 🚀 Deployment Guide - AI Tally Assistant

This guide covers multiple deployment options for your AI Tally Assistant application.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Environment Variables](#environment-variables)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Platform Deployment](#cloud-platform-deployment)
6. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

- Docker & Docker Compose (for containerized deployment)
- Node.js 18+ and npm (for frontend)
- Python 3.11+ (for backend)
- Git
- Domain name (optional, for production)

---

## Deployment Options

### Option 1: Docker Compose (Recommended for VPS/Server)
### Option 2: Railway.app (Easiest)
### Option 3: Render.com
### Option 4: AWS/GCP/Azure
### Option 5: VPS (DigitalOcean, Linode, etc.)

---

## Environment Variables

### Backend (.env in backend/ directory)

```env
# Tally Configuration
TALLY_HOST=localhost
TALLY_PORT=9000
TALLY_REMOTE_ENABLED=True
TALLY_CONNECTOR_PATH=./TallyConnector

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi4:14b

# Database
DB_URL=sqlite:///./database.db
# OR for MySQL:
# DB_HOST=your-db-host
# DB_PORT=3306
# DB_USER=your-db-user
# DB_PASSWORD=your-db-password
# DB_NAME=tally_cache
# DB_URL=mysql+pymysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# CORS (Update with your frontend URL)
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com

# Security
SECRET_KEY=your-secret-key-here-change-this
JWT_SECRET_KEY=your-jwt-secret-key-here-change-this

# ChromaDB
CHROMA_DB_PATH=./chroma_db

# Logging
LOG_LEVEL=INFO
```

### Frontend (.env in frontend/ directory)

```env
VITE_API_URL=http://localhost:8000
# For production:
# VITE_API_URL=https://api.yourdomain.com
```

---

## Docker Deployment

### Step 1: Create Docker Compose File

See `docker-compose.yml` in root directory.

### Step 2: Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 3: Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Cloud Platform Deployment

### Railway.app (Easiest)

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   railway init
   railway up
   ```

3. **Deploy Frontend**
   ```bash
   cd frontend
   railway init
   railway up
   ```

4. **Set Environment Variables** in Railway dashboard

### Render.com

1. **Backend Deployment**
   - New Web Service
   - Connect GitHub repo
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

2. **Frontend Deployment**
   - New Static Site
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

### VPS Deployment (DigitalOcean, Linode, etc.)

1. **SSH into your server**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh

   # Install Docker Compose
   sudo apt install docker-compose -y
   ```

3. **Clone and Deploy**
   ```bash
   git clone your-repo-url
   cd ai-tally-assistant-integrated
   docker-compose up -d
   ```

4. **Setup Nginx (Reverse Proxy)**
   ```bash
   sudo apt install nginx
   # Configure nginx (see nginx.conf.example)
   sudo systemctl restart nginx
   ```

5. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database initialized
- [ ] CORS origins updated
- [ ] SSL certificate installed (for production)
- [ ] Backend API accessible
- [ ] Frontend connects to backend
- [ ] Tally connection configured (if using)
- [ ] Ollama service running (if using local)
- [ ] Logs monitoring setup
- [ ] Backup strategy configured

---

## Troubleshooting

### Backend won't start
- Check environment variables
- Verify database connection
- Check logs: `docker-compose logs backend`

### Frontend can't connect to backend
- Verify CORS settings
- Check API URL in frontend .env
- Ensure backend is running

### Database errors
- Verify database credentials
- Check database is accessible
- Run migrations if needed

---

## Support

For issues, check:
1. Application logs
2. Docker logs
3. Server logs
4. Browser console (for frontend issues)

