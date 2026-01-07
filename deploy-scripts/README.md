# 🚀 AI Tally - Deployment Scripts

This directory contains automated deployment and maintenance scripts for AI Tally.

---

## 📁 Available Scripts

### **1. setup-nginx.sh** - Initial nginx Setup
```bash
sudo bash deploy-scripts/setup-nginx.sh
```

**What it does:**
- ✅ Installs nginx (if not installed)
- ✅ Copies nginx config from repo to `/etc/nginx/sites-available/`
- ✅ Creates symlink in `/etc/nginx/sites-enabled/`
- ✅ Tests configuration
- ✅ Reloads nginx

**When to use:** First-time server setup

---

### **2. setup-ollama.sh** - Install Ollama (AI Chat)
```bash
sudo bash deploy-scripts/setup-ollama.sh
```

**What it does:**
- ✅ Installs Ollama
- ✅ Starts Ollama service
- ✅ Downloads AI model (phi4:14b)
- ✅ Configures backend `.env` file
- ✅ Tests Ollama API

**When to use:** If you want AI chat functionality

---

### **3. sync-nginx.sh** - Sync nginx Config After Updates
```bash
sudo bash deploy-scripts/sync-nginx.sh
```

**What it does:**
- ✅ Backs up existing config
- ✅ Copies new config from repo to system
- ✅ Tests configuration
- ✅ Reloads nginx
- ✅ Restores backup if test fails

**When to use:** After `git pull` when nginx config was updated

---

### **4. post-pull.sh** - Complete Post-Pull Sync
```bash
sudo bash deploy-scripts/post-pull.sh
```

**What it does:**
- ✅ Syncs nginx configuration
- ✅ Rebuilds Docker containers
- ✅ Restarts all services
- ✅ Verifies all services are running

**When to use:** After `git pull` to apply all updates

---

## 🔄 Typical Workflow

### **Initial Setup (First Time)**

```bash
# 1. Clone repository
git clone https://github.com/vraj1091/ai_tally.git
cd ai_tally

# 2. Setup nginx
sudo bash deploy-scripts/setup-nginx.sh

# 3. Setup Ollama (optional, for AI chat)
sudo bash deploy-scripts/setup-ollama.sh

# 4. Start services
docker-compose up -d
```

### **After Git Pull (Updates)**

```bash
# Option 1: Use the update script (recommended)
sudo bash update-from-git.sh

# Option 2: Manual steps
git pull origin main
sudo bash deploy-scripts/post-pull.sh

# Option 3: Just sync nginx (if only nginx changed)
git pull origin main
sudo bash deploy-scripts/sync-nginx.sh
docker-compose restart
```

---

## 📋 Script Comparison

| Script | nginx | Ollama | Docker | Use Case |
|--------|-------|--------|--------|----------|
| `setup-nginx.sh` | ✅ Install | ❌ | ❌ | First time setup |
| `setup-ollama.sh` | ❌ | ✅ Install | ❌ | Add AI chat |
| `sync-nginx.sh` | ✅ Sync | ❌ | ❌ | nginx config updates |
| `post-pull.sh` | ✅ Sync | ❌ | ✅ Rebuild | Full update |

---

## 🛡️ Safety Features

### **Automatic Backups**
All scripts create backups before modifying system files:
```
/etc/nginx/sites-available/ai-tally.conf.backup.20251216_120000
```

### **Configuration Testing**
Scripts test nginx config before applying:
```bash
nginx -t  # Test configuration
# Only proceeds if test passes
```

### **Rollback on Failure**
If nginx test fails, scripts automatically restore the backup.

---

## 🔍 Troubleshooting

### **Permission Denied**
```bash
# Always run with sudo
sudo bash deploy-scripts/setup-nginx.sh
```

### **Script Not Found**
```bash
# Make sure you're in the project root
cd ~/ai_tally
bash deploy-scripts/sync-nginx.sh
```

### **nginx Test Failed**
```bash
# Check nginx error log
sudo tail -50 /var/log/nginx/error.log

# Test manually
sudo nginx -t

# View current config
sudo cat /etc/nginx/sites-enabled/ai-tally.conf
```

### **Docker Services Won't Start**
```bash
# Check logs
docker-compose logs

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📍 File Locations

### **Repository Files**
```
ai_tally/
├── ec2-nginx-config/
│   └── ai-tally.conf          # nginx config (source)
├── deploy-scripts/
│   ├── setup-nginx.sh         # Initial setup
│   ├── setup-ollama.sh        # Ollama setup
│   ├── sync-nginx.sh          # Config sync
│   └── post-pull.sh           # Full update
└── update-from-git.sh         # Pull + sync script
```

### **System Files (Created by Scripts)**
```
/etc/nginx/
├── sites-available/
│   └── ai-tally.conf          # Active config
├── sites-enabled/
│   └── ai-tally.conf          # Symlink
└── sites-available/
    └── ai-tally.conf.backup.* # Backups
```

---

## ⚡ Quick Reference

```bash
# Initial setup
sudo bash deploy-scripts/setup-nginx.sh

# Add AI chat
sudo bash deploy-scripts/setup-ollama.sh

# After git pull
sudo bash update-from-git.sh

# Just sync nginx
sudo bash deploy-scripts/sync-nginx.sh

# Full service restart
sudo bash deploy-scripts/post-pull.sh
```

---

## 🆘 Need Help?

1. **Check script output** - Scripts provide detailed logs
2. **View system logs** - `sudo journalctl -u nginx -f`
3. **Test manually** - Run commands step by step
4. **Restore backup** - Backup files are created automatically

---

**For detailed deployment guide, see:** `../DEPLOYMENT_GUIDE.md`  
**For Ollama setup, see:** `../OLLAMA_SETUP_GUIDE.md`

