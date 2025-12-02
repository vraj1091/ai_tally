# 🚀 Quick Start Deployment Guide

## Option 1: Docker Compose (Recommended)

### Prerequisites
- Docker Desktop installed
- Git installed

### Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd ai-tally-assistant-integrated
   ```

2. **Setup environment variables**
   ```bash
   # Copy example files
   cp .env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit backend/.env and update:
   # - SECRET_KEY (generate a random string)
   # - JWT_SECRET_KEY (generate a random string)
   # - CORS_ORIGINS (add your frontend URL)
   ```

3. **Deploy**
   ```bash
   # Make deploy script executable (Linux/Mac)
   chmod +x deploy.sh
   ./deploy.sh
   
   # OR manually:
   docker-compose build
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

5. **View logs**
   ```bash
   docker-compose logs -f
   ```

6. **Stop services**
   ```bash
   docker-compose down
   ```

---

## Option 2: Railway.app (Easiest Cloud Deployment)

### Steps

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

---

## Option 3: Render.com

### Backend

1. Go to https://render.com
2. New → Web Service
3. Connect your GitHub repository
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy

### Frontend

1. New → Static Site
2. Connect your GitHub repository
3. Settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Add environment variable: `VITE_API_URL` = your backend URL
5. Deploy

---

## Option 4: VPS (DigitalOcean, Linode, etc.)

### Steps

1. **SSH into your server**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

3. **Clone and deploy**
   ```bash
   git clone <your-repo-url>
   cd ai-tally-assistant-integrated
   docker-compose up -d
   ```

4. **Setup Nginx and SSL** (see DEPLOYMENT.md)

---

## Environment Variables Quick Reference

### Backend (.env)
```env
SECRET_KEY=your-random-secret-key
JWT_SECRET_KEY=your-random-jwt-secret
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
DB_URL=sqlite:///./database.db
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
# For production: https://api.yourdomain.com
```

---

## Troubleshooting

### Port already in use
```bash
# Change ports in docker-compose.yml
# Or stop the service using the port
```

### Can't connect to backend
- Check CORS_ORIGINS in backend/.env
- Verify VITE_API_URL in frontend/.env
- Check backend logs: `docker-compose logs backend`

### Database errors
- Ensure database file has write permissions
- Check DB_URL in backend/.env

---

## Next Steps

1. ✅ Application deployed
2. ⚙️ Configure Tally connection (if using)
3. 🔐 Update security keys
4. 📊 Test all dashboards
5. 🌐 Setup custom domain (optional)
6. 🔒 Enable SSL/HTTPS (for production)

---

## Support

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
