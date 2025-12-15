# How to Get Real Data in Dashboards

## 🔴 Current Issue
All dashboards are showing **₹0** or **demo data** because:
1. ✅ Database is created (fixed!)
2. ❌ **NO BACKUP DATA uploaded yet**
3. ❌ **NO live Tally connection**

---

## ✅ Solution: Upload Backup Data

### Step 1: Start Backend Server
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Start Frontend (if not already running)
```bash
cd frontend
npm run dev
```

### Step 3: Upload Tally Backup File
1. Open your browser: `http://localhost:5173`
2. Go to **"Backup"** page (or **"Tally Data"** page)
3. Click **"Upload Backup"** button
4. Select your Tally backup file:
   - `.tbk` (Tally backup file)
   - `.xml` (Tally XML export)
   - `.zip` (compressed backup)
5. Wait for upload progress (may take 1-10 minutes for large files)
6. You'll see success message

### Step 4: View Dashboards
1. Go to any dashboard (CEO, Sales, CFO, etc.)
2. Select company from dropdown
3. **You should now see REAL DATA!** 🎉

---

## 🔄 Alternative: Connect to Live Tally

### Prerequisites:
- TallyPrime running on your computer
- Tally API enabled (Gateway of Tally → F12: Configure → Advanced → Allow HTTP/HTTPS API)
- Tally should be on port 9000

### Steps:
1. Start TallyPrime
2. Open your company
3. In the UI, select **"Live"** data source
4. Click **"Refresh"**
5. Dashboards will fetch data directly from Tally

---

## 📊 How to Export Backup from Tally

If you don't have a backup file:

1. Open TallyPrime
2. Go to **Data → Backup**
3. Select companies to backup
4. Choose destination path
5. Click **Backup**
6. This creates a `.tbk` file
7. Upload this file to AI Tally

### Alternative: XML Export
1. Gateway of Tally
2. **Export → Data**
3. Choose **Masters** and **Transactions**
4. Save as `.xml`
5. Upload this to AI Tally

---

## 🐛 Still Showing ₹0?

Run diagnostic script:
```bash
cd backend
python check_backup_data.py
```

This will tell you:
- If backup data exists in database
- How many ledgers/vouchers are stored
- If data has actual values
- What's causing the issue

---

## 📝 What We Fixed Today

1. ✅ Created database with all required tables
2. ✅ Removed hardcoded demo fallback values from:
   - CEO Dashboard
   - Sales Dashboard
3. ✅ Added data validation to show proper empty states
4. ✅ Created diagnostic tools

**Remaining:** Update other 19 dashboards (can be done incrementally)

---

## 🎯 Expected Behavior After Upload

### Before Upload:
- CEO Dashboard: "No CEO Dashboard Data" message
- Sales Dashboard: "No Sales Data Available" message
- All dashboards: Empty states with instructions

### After Upload:
- CEO Dashboard: Shows real ₹ revenue, expenses, profit
- Sales Dashboard: Shows real customers, orders, revenue
- All metrics calculated from your actual Tally data

---

## 💡 Quick Test

1. Upload ANY Tally backup file (even a sample one)
2. Go to CEO Dashboard
3. If you see numbers > ₹0, it's working!
4. If still ₹0, run the diagnostic script above

