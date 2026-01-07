# 🚀 AI Tally - Complete Deployment Guide

This guide will help you deploy AI Tally on any EC2/VPS server.

---

## 📋 Prerequisites

- Ubuntu 20.04 or higher
- Docker and Docker Compose installed
- Port 80 (HTTP) open in firewall
- Port 8000 (backend) open in firewall
- At least 4GB RAM
- 20GB disk space

---

## 🛠️ Quick Deployment (5 Minutes)

### **Step 1: Clone Repository**

```bash
# SSH into your server
ssh ubuntu@YOUR_SERVER_IP

# Clone the repository
git clone https://github.com/vraj1091/ai_tally.git
cd ai_tally
```

### **Step 2: Setup nginx**

```bash
# Make the script executable
chmod +x deploy-scripts/setup-nginx.sh

# Run the nginx setup script
sudo bash deploy-scripts/setup-nginx.sh
```

This script will:
- ✅ Install nginx (if not installed)
- ✅ Copy the proper configuration
- ✅ Enable the site
- ✅ Test and reload nginx

### **Step 3: Install Ollama (for AI Chat)**

```bash
# Install and configure Ollama
sudo bash deploy-scripts/setup-ollama.sh
```

This installs Ollama and downloads the AI model for chat functionality.

**Skip this step if you don't need AI chat features.**

### **Step 4: Start Docker Containers**

```bash
# Start all services
docker-compose up -d

# Check if containers are running
docker ps

# Watch logs
docker-compose logs -f
```

Wait for this line in logs:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### **Step 5: Test Deployment**

```bash
# Test backend directly
curl http://localhost:8000/health

# Test through nginx
curl http://localhost/api/health

# Test Ollama (AI Chat)
curl http://localhost:11434/api/tags

# All should return valid responses
```

### **Step 6: Access Application**

Open browser: `http://YOUR_SERVER_IP`

You should see the AI Tally login page!

---

## 🔧 Manual nginx Configuration

If the automated script doesn't work, configure manually:

### **1. Install nginx**

```bash
sudo apt update
sudo apt install -y nginx
```

### **2. Copy Configuration**

```bash
# Copy the config file
sudo cp ec2-nginx-config/ai-tally.conf /etc/nginx/sites-available/

# Create symlink
sudo ln -sf /etc/nginx/sites-available/ai-tally.conf /etc/nginx/sites-enabled/

# Remove default config
sudo rm -f /etc/nginx/sites-enabled/default
```

### **3. Test and Reload**

```bash
# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx
```

---

## 🔄 Updating After Git Pull

When you pull new code from GitHub, use these scripts to automatically sync configurations:

### **Method 1: One-Command Update (Recommended)**

```bash
sudo bash update-from-git.sh
```

This script:
- ✅ Pulls latest code from GitHub
- ✅ Syncs nginx configuration to `/etc/nginx/`
- ✅ Rebuilds and restarts Docker containers
- ✅ Verifies all services are running

### **Method 2: Manual Update**

```bash
# Pull code
git pull origin main

# Sync all configurations and restart
sudo bash deploy-scripts/post-pull.sh
```

### **Method 3: Just Sync nginx Config**

```bash
# If only nginx config changed
git pull origin main
sudo bash deploy-scripts/sync-nginx.sh
docker-compose restart
```

---

## 🐳 Docker Commands

### **Start Services**
```bash
docker-compose up -d
```

### **Stop Services**
```bash
docker-compose down
```

### **Rebuild Services**
```bash
docker-compose build --no-cache
docker-compose up -d
```

### **View Logs**
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### **Restart Service**
```bash
# Restart backend
docker-compose restart backend

# Restart frontend
docker-compose restart frontend
```

---

## 🔍 Troubleshooting

### **Problem: 404 Not Found on /api endpoints**

**Cause:** nginx not configured properly

**Solution:**
```bash
# Re-run nginx setup
sudo bash deploy-scripts/setup-nginx.sh

# OR manually check config
sudo cat /etc/nginx/sites-enabled/ai-tally.conf

# Should have "location /api" block
```

### **Problem: 502 Bad Gateway**

**Cause:** Backend container not running

**Solution:**
```bash
# Check if backend is running
docker ps | grep backend

# If not running, check logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### **Problem: Tally Connector Won't Connect**

**Cause:** WebSocket not configured or firewall blocking

**Solution:**
```bash
# Check nginx WebSocket config
sudo grep -A 10 "location /ws/" /etc/nginx/sites-enabled/ai-tally.conf

# Test WebSocket endpoint
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost/ws/tally-bridge/user_tally_bridge

# Should return "101 Switching Protocols"
```

### **Problem: Frontend Shows White Screen**

**Cause:** Frontend container not running or build failed

**Solution:**
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

---

## 📊 Health Checks

### **Check All Services**

```bash
# Backend health
curl http://localhost:8000/health

# Through nginx
curl http://localhost/api/health

# Frontend (should return HTML)
curl http://localhost:5173

# Docker containers
docker ps

# nginx status
sudo systemctl status nginx
```

### **Expected Results**

All checks should return **200 OK**:

✅ Backend: `{"status":"healthy",...}`  
✅ nginx proxy: `{"status":"healthy",...}`  
✅ Frontend: `<!DOCTYPE html>...`  
✅ Docker: 2 containers running  
✅ nginx: `active (running)`  

---

## 🔐 Security Recommendations

### **1. Enable Firewall**

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (IMPORTANT!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS (for future SSL)
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### **2. Setup SSL (HTTPS)**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### **3. Change Default Passwords**

Edit `.env` file in backend directory:
```bash
SECRET_KEY=your-random-secret-key
JWT_SECRET_KEY=your-random-jwt-secret
```

---

## 📁 File Structure

```
ai_tally/
├── backend/                    # Backend API
│   ├── app/                   # Application code
│   ├── Dockerfile             # Backend Docker config
│   └── requirements.txt       # Python dependencies
├── frontend/                   # Frontend React app
│   ├── src/                   # Source code
│   ├── Dockerfile             # Frontend Docker config
│   └── package.json           # Node dependencies
├── ec2-nginx-config/          # nginx configurations
│   └── ai-tally.conf          # Main nginx config
├── deploy-scripts/            # Deployment scripts
│   └── setup-nginx.sh         # Automated nginx setup
├── docker-compose.yml         # Docker Compose config
└── DEPLOYMENT_GUIDE.md        # This file
```

---

## 🆘 Getting Help

### **View Logs**

```bash
# Backend logs
docker-compose logs backend | tail -100

# Frontend logs
docker-compose logs frontend | tail -100

# nginx error log
sudo tail -100 /var/log/nginx/error.log

# nginx access log
sudo tail -100 /var/log/nginx/access.log
```

### **Common Log Locations**

- Backend: `docker-compose logs backend`
- Frontend: `docker-compose logs frontend`
- nginx errors: `/var/log/nginx/error.log`
- nginx access: `/var/log/nginx/access.log`

---

## 🎯 Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Frontend loads in browser
- [ ] Can login to application
- [ ] Ollama installed and running (for AI chat)
- [ ] AI model downloaded (phi4:14b or similar)
- [ ] Tally Connector can connect
- [ ] Upload backup file works
- [ ] Dashboards load data
- [ ] WebSocket connection stable
- [ ] nginx properly proxying requests
- [ ] Firewall configured
- [ ] SSL certificate installed (optional)

---

## 📞 Support

If you encounter issues:

1. Check troubleshooting section above
2. Review logs for error messages
3. Verify all services are running
4. Test each component individually

---

**Happy Deploying! 🚀**

