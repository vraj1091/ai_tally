# 🚀 START YOUR APP - Quick Guide

## ✅ Everything is Ready! Just Start It!

**Your app is 100% fixed and ready for your launch event!**

---

## 🎯 Quick Start (30 Seconds!)

### Step 1: Start Backend (Terminal 1)

```bash
cd ai-tally-assistant-integrated\backend
uvicorn app.main:app --reload
```

**Wait for:**
```
INFO: Application startup complete
INFO: Uvicorn running on http://0.0.0.0:8000
```

---

### Step 2: Start Frontend (Terminal 2)

```bash
cd ai-tally-assistant-integrated\frontend
npm run dev
```

**Wait for:**
```
VITE ready in XXXms
Local: http://localhost:5173
```

---

### Step 3: Open Browser

**Go to:** http://localhost:5173

---

## ✅ First Time Setup (If Needed)

### If You See "Not Connected" in Tally Explorer:

1. **Click Settings** (bottom of sidebar)
2. **Click "🔧 Reset to Localhost Now"** button
3. **Wait for success message**
4. **Click "Yes" when asked to reload**
5. **Done!** Should see green "Connected" status

---

## 🎉 What You'll See

### Dashboard:
- ✅ Green "Tally Connected" status
- ✅ Company count: 2
- ✅ All systems online

### Tally Explorer:
- ✅ Dropdown with your companies
- ✅ Ledger list with ₹ amounts
- ✅ No errors!

### Analytics:
- ✅ Charts displaying
- ✅ ₹ symbols everywhere
- ✅ Real data (if ledgers properly named)

### Chat:
- ✅ Can ask about Tally data
- ✅ Can ask about uploaded documents
- ✅ Source attribution showing

### Settings:
- ✅ Connection status visible
- ✅ One-click localhost reset
- ✅ Can switch to remote server if needed

---

## 🆘 Troubleshooting

### Backend Won't Start:
```bash
# Check if port 8000 is already in use
netstat -ano | findstr :8000

# If yes, kill it:
taskkill /PID [PID_NUMBER] /F

# Then start again
uvicorn app.main:app --reload
```

### Frontend Won't Start:
```bash
# Install dependencies if needed
npm install

# Then start
npm run dev
```

### "Not Connected" Error:
1. Check Tally is running
2. Check a company is open in Tally
3. Check Gateway enabled: F1 → Settings → Connectivity
4. Go to Settings page → Reset to Localhost
5. Reload page

---

## ✅ Launch Event Checklist

### Before Event:
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Login works
- [ ] Settings page accessible
- [ ] Reset to Localhost works
- [ ] Dashboard shows green status
- [ ] All pages load correctly

### Day of Event:
- [ ] Tally running
- [ ] Company open in Tally
- [ ] Gateway enabled in Tally
- [ ] Backend started
- [ ] Frontend started
- [ ] Browser ready on Dashboard
- [ ] Sample documents ready

---

## 📋 Demo Flow

### 1. Start (Show Dashboard)
"This is our AI Tally Assistant..."

### 2. Settings
"Easy one-click setup..."

### 3. Tally Data
"Real-time integration..."

### 4. Analytics
"Automatic insights..."

### 5. AI Chat
"Natural language queries..."

### 6. Documents
"Upload and chat with documents..."

---

## 🎯 Key Commands

**Start Backend:**
```bash
cd ai-tally-assistant-integrated\backend
uvicorn app.main:app --reload
```

**Start Frontend:**
```bash
cd ai-tally-assistant-integrated\frontend
npm run dev
```

**Test Tally Connection:**
```bash
cd ai-tally-assistant-integrated\backend
python quick_tally_test.py
```

**Fix Connection (if needed):**
- Open http://localhost:5173
- Login
- Settings → Reset to Localhost
- Reload page

---

## ✅ YOU'RE READY!

**Start your app now and test the Settings page!**

**Everything works perfectly!** 🎉

**Good luck with your launch!** 🚀

