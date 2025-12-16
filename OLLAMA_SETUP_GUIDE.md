# 🤖 Ollama Setup Guide for AI Tally

Ollama is required for the AI Chat functionality in AI Tally. This guide will help you install and configure it.

---

## 📋 What is Ollama?

Ollama allows you to run large language models (LLMs) locally on your server:
- ✅ Chat with your Tally data using AI
- ✅ Get business insights from natural language queries
- ✅ No external API keys needed
- ✅ Privacy-focused (all data stays on your server)

---

## 🚀 Quick Installation

### **Method 1: Automated Script (Recommended)**

```bash
cd ~/ai_tally
sudo bash deploy-scripts/setup-ollama.sh
```

This script will:
- ✅ Install Ollama
- ✅ Start Ollama service
- ✅ Download phi4:14b model (recommended)
- ✅ Configure backend to use Ollama
- ✅ Test the installation

### **Method 2: Manual Installation**

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
sudo systemctl start ollama
sudo systemctl enable ollama

# Pull a model
ollama pull phi4:14b
```

---

## 🎯 Choosing the Right Model

### **phi4:14b (Recommended)**
- **Quality:** ⭐⭐⭐⭐⭐ Best
- **Speed:** ⭐⭐⭐ Good
- **RAM Required:** 8GB minimum
- **Best for:** Production use, complex queries
- **Pull command:** `ollama pull phi4:14b`

### **phi3:3.8b (Alternative)**
- **Quality:** ⭐⭐⭐⭐ Very Good
- **Speed:** ⭐⭐⭐⭐ Fast
- **RAM Required:** 4GB minimum
- **Best for:** Smaller servers, good balance
- **Pull command:** `ollama pull phi3:3.8b`

### **llama3.2:3b (Lightweight)**
- **Quality:** ⭐⭐⭐ Good
- **Speed:** ⭐⭐⭐⭐⭐ Very Fast
- **RAM Required:** 4GB minimum
- **Best for:** Limited resources, quick responses
- **Pull command:** `ollama pull llama3.2:3b`

### **mistral:7b (Business-Focused)**
- **Quality:** ⭐⭐⭐⭐ Very Good
- **Speed:** ⭐⭐⭐ Good
- **RAM Required:** 8GB minimum
- **Best for:** Business analysis, formal responses
- **Pull command:** `ollama pull mistral:7b`

---

## ⚙️ Configure Backend

Create `backend/.env` file with these settings:

```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi4:14b

# Change to use a different model:
# OLLAMA_MODEL=phi3:3.8b
# OLLAMA_MODEL=llama3.2:3b
# OLLAMA_MODEL=mistral:7b
```

Full `.env` example:

```bash
# Security
SECRET_KEY=your-random-secret-key
JWT_SECRET_KEY=your-random-jwt-secret

# Database
DB_URL=sqlite:///./database.db

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi4:14b

# Tally
TALLY_HOST=localhost
TALLY_PORT=9000

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🧪 Test Ollama Installation

### **1. Check Service Status**

```bash
# Check if Ollama is running
sudo systemctl status ollama

# Or check process
ps aux | grep ollama
```

### **2. Test API**

```bash
# List available models
curl http://localhost:11434/api/tags

# Should return JSON with your installed models
```

### **3. Test Chat**

```bash
# Interactive chat (Ctrl+D to exit)
ollama run phi4:14b

# Or test with a simple prompt
echo "Hello, how are you?" | ollama run phi4:14b
```

### **4. Test from Backend**

```bash
# Restart backend to load new config
docker-compose restart backend

# Check backend logs
docker-compose logs backend | grep -i ollama

# Should see: "✓ Ollama loaded successfully"
```

---

## 🔧 Useful Ollama Commands

### **Model Management**

```bash
# List installed models
ollama list

# Pull a new model
ollama pull phi4:14b

# Remove a model (free up space)
ollama rm phi4:14b

# Show model info
ollama show phi4:14b
```

### **Service Management**

```bash
# Start Ollama
sudo systemctl start ollama

# Stop Ollama
sudo systemctl stop ollama

# Restart Ollama
sudo systemctl restart ollama

# View logs
sudo journalctl -u ollama -f

# Or if running manually:
sudo tail -f /var/log/ollama.log
```

### **Performance Tuning**

```bash
# Set number of GPU layers (if you have GPU)
OLLAMA_NUM_GPU=1 ollama serve

# Set number of parallel requests
OLLAMA_NUM_PARALLEL=4 ollama serve

# Set context window size
OLLAMA_NUM_CTX=4096 ollama serve
```

---

## 🐛 Troubleshooting

### **Problem: "Connection refused" to Ollama**

**Solution:**
```bash
# Check if Ollama is running
ps aux | grep ollama

# If not running, start it
sudo systemctl start ollama

# Or start manually
nohup ollama serve > /var/log/ollama.log 2>&1 &
```

### **Problem: "Model not found"**

**Solution:**
```bash
# List installed models
ollama list

# Pull the missing model
ollama pull phi4:14b

# Update backend/.env to match
OLLAMA_MODEL=phi4:14b
```

### **Problem: "Out of memory"**

**Solutions:**
```bash
# Option 1: Use a smaller model
ollama pull phi3:3.8b
# Update backend/.env: OLLAMA_MODEL=phi3:3.8b

# Option 2: Increase server RAM
# Upgrade to at least 8GB RAM

# Option 3: Use quantized model
ollama pull phi4:14b-q4
# Smaller size, slightly lower quality
```

### **Problem: Slow responses**

**Solutions:**
```bash
# Option 1: Use a faster model
ollama pull llama3.2:3b

# Option 2: Reduce context size
# In backend code, reduce max_tokens

# Option 3: Use GPU acceleration (if available)
# Ollama automatically uses GPU if detected
```

---

## 📊 Resource Requirements

| Model | RAM Needed | Disk Space | Response Time* |
|-------|-----------|------------|----------------|
| phi4:14b | 8GB | 8.5GB | 2-5 seconds |
| phi3:3.8b | 4GB | 2.3GB | 1-3 seconds |
| llama3.2:3b | 4GB | 2.0GB | 1-2 seconds |
| mistral:7b | 8GB | 4.1GB | 2-4 seconds |

*Response times are approximate on CPU. With GPU, responses are 10-50x faster.

---

## 🔐 Security Considerations

### **1. Firewall Configuration**

Ollama runs on port 11434. Keep it internal:

```bash
# Ollama should only be accessible from localhost
# Do NOT open port 11434 to the internet

# Check firewall
sudo ufw status

# Make sure 11434 is NOT in the list
# Only ports 80, 443, 22 should be open externally
```

### **2. Model Data Privacy**

- ✅ All models run locally
- ✅ No data sent to external services
- ✅ Conversations stay on your server
- ✅ Full control over data

---

## 📦 Complete Setup Example

Here's the complete workflow:

```bash
# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Start service
sudo systemctl start ollama
sudo systemctl enable ollama

# 3. Pull model
ollama pull phi4:14b

# 4. Create/update backend/.env
cat >> backend/.env << EOF
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi4:14b
EOF

# 5. Restart backend
docker-compose restart backend

# 6. Test
curl http://localhost:11434/api/tags
docker-compose logs backend | grep ollama
```

---

## 🎯 Post-Installation Checklist

- [ ] Ollama service is running
- [ ] At least one model is downloaded
- [ ] Backend `.env` has correct `OLLAMA_BASE_URL`
- [ ] Backend `.env` has correct `OLLAMA_MODEL`
- [ ] Backend restarted after config change
- [ ] Backend logs show "Ollama loaded successfully"
- [ ] API test returns model list
- [ ] Chat functionality works in UI

---

## 🆘 Need Help?

### **Check Ollama Status**
```bash
# Service status
sudo systemctl status ollama

# API status
curl http://localhost:11434/api/tags

# Backend status
docker-compose logs backend | grep -i ollama
```

### **Common Log Messages**

✅ **Success:**
```
✓ Ollama loaded successfully
Ollama running on http://localhost:11434
Model: phi4:14b
```

❌ **Failure:**
```
✗ Could not connect to Ollama
Connection refused to http://localhost:11434
```

**Fix:** Start Ollama service

---

## 📚 Additional Resources

- **Ollama Documentation:** https://ollama.com/docs
- **Available Models:** https://ollama.com/library
- **GitHub:** https://github.com/ollama/ollama
- **Discord Community:** https://discord.gg/ollama

---

**Happy AI Chatting! 🤖**

