# ⚡ Quick Start Guide - Launch in 5 Minutes

## 🚀 **Start Your App**

### **Step 1: Start Backend (Terminal 1)**
```bash
cd C:\Users\vrajr\Desktop\ai-tally-assistant-integrated\ai-tally-assistant-integrated\backend
uvicorn app.main:app --reload
```

**Wait for:** `✓ Ready to accept requests`

---

### **Step 2: Start Frontend (Terminal 2)**
```bash
cd C:\Users\vrajr\Desktop\ai-tally-assistant-integrated\ai-tally-assistant-integrated\frontend
npm run dev
```

**Wait for:** `Local: http://localhost:5173/`

---

### **Step 3: Open Browser**
```
http://localhost:5173
```

---

## 🎯 **Feature Quick Access**

### **📊 20 Dashboards**
```
http://localhost:5173/dashboards
```
**What you get:**
- CEO, CFO, Executive dashboards
- Sales, Inventory, Real-time ops
- Financial dashboards (AR, AP, Cash, P&L, Balance Sheet)
- Compliance & Tax
- Forecasting & Budget
- Customer, Vendor, Product analytics

### **📈 35+ Charts**
**On ANY dashboard:**
1. Click "Change Chart Type" button
2. Select category
3. Pick chart type
4. Instant switch!

### **💰 Multi-Bill Comparison**
```
http://localhost:5173/bill-comparison
```
**Upload multiple bills and get:**
- Total comparison
- Category breakdown
- Vendor analysis
- Trends & insights
- Export report

### **📄 Document Analysis**
```
http://localhost:5173/documents
```
**Upload PDF/Excel/CSV for:**
- Automatic analysis
- Visual charts
- Key insights
- AI-powered summary

### **🗄️ Tally Explorer**
```
http://localhost:5173/tally
```
**Browse Tally data:**
- Companies
- Ledgers  
- Vouchers
- Real-time sync

---

## 🎨 **Chart Types Available**

### **Click "Change Chart Type" to Access:**

**Bar Charts (5):**
- Vertical Bar
- Horizontal Bar
- Stacked Bar
- Grouped Bar
- Bar with Labels

**Line Charts (5):**
- Simple Line
- Multi Line
- Dashed Line
- Step Line
- Curved Line

**Area Charts (5):**
- Simple Area
- Stacked Area
- Percentage Area
- Gradient Area
- Multi Area

**Pie & Donut (5):**
- Simple Pie
- Donut
- Semi-Circle
- Two-Level
- Custom Labels

**Radar & Radial (5):**
- Radar
- Radial Bar
- Full Circle
- Multi Radar
- Gauge

**Scatter & Composed (5):**
- Scatter
- Multi Scatter
- Line + Bar
- Multi Composed
- Bubble

**Specialized (5):**
- Waterfall
- Candlestick
- Heatmap
- Treemap
- Bullet

---

## 💡 **Pro Tips**

### **Tip 1: Offline Mode**
**When Tally disconnects:**
- App keeps working!
- Shows cached data
- "Using Cached Data" badge appears
- All features functional

**When Tally reconnects:**
- Auto-sync triggers
- Fresh data loaded
- Cache updated

### **Tip 2: Export Data**
**On any page with data:**
- Look for "Export CSV" button
- Click to download
- Opens in Excel
- Ready for analysis

### **Tip 3: Time Ranges**
**Change time period:**
- Click Day/Week/Month/Quarter/Year
- Data filters automatically
- Charts update in real-time

### **Tip 4: Search Dashboards**
**In Dashboard Hub:**
- Type in search box
- Filter by category
- Instant results

### **Tip 5: Status Indicators**
**Watch for:**
- 🟢 Green = Online, live data
- 🟠 Orange = Offline, cached data
- ⏱️ Timestamp = last sync time

---

## 🔥 **Common Use Cases**

### **Use Case 1: Monthly Review**
```
1. Go to /dashboards
2. Select "CEO Dashboard"
3. Check KPI cards
4. Switch chart to "Waterfall" to see changes
5. Export data
```

### **Use Case 2: Compare Bills**
```
1. Go to /bill-comparison
2. Upload 5-10 bills
3. View automatic analysis
4. Check category breakdown
5. Export comparison report
```

### **Use Case 3: Analyze Documents**
```
1. Go to /documents
2. Upload PDF/Excel
3. AI analyzes content
4. View charts & insights
5. Download summary
```

### **Use Case 4: Explore Tally Data**
```
1. Go to /tally
2. Select company
3. Switch between Overview/Ledgers/Vouchers
4. Apply filters
5. Export filtered data
```

---

## 🎯 **Dashboard Categories**

### **Executive** (3 dashboards)
- CEO Dashboard
- CFO Dashboard
- Executive Summary

### **Operations** (3 dashboards)
- Sales Dashboard
- Inventory Dashboard
- Real-time Operations

### **Financial** (5 dashboards)
- Accounts Receivable
- Accounts Payable
- Cash Flow
- Profit & Loss
- Balance Sheet

### **Compliance** (2 dashboards)
- Tax Dashboard
- Compliance Dashboard

### **Planning** (2 dashboards)
- Budget vs Actual
- Forecasting

### **Analytics** (5 dashboards)
- Customer Analytics
- Vendor Analytics
- Product Performance
- Expense Analysis
- Revenue Analysis

---

## ⚙️ **Keyboard Shortcuts**

| Key | Action |
|-----|--------|
| `Ctrl + R` | Refresh data |
| `Ctrl + E` | Export CSV |
| `Ctrl + /` | Search dashboards |
| `Esc` | Close modals |
| `Tab` | Navigate forms |

---

## 🆘 **Troubleshooting**

### **Problem: Blank Page**
**Solution:** 
- Hard refresh: `Ctrl + Shift + R`
- Check console: `F12`
- Restart frontend

### **Problem: No Data**
**Solution:**
- Check Tally is running
- Verify port 9000
- Check connection indicator

### **Problem: Charts Not Loading**
**Solution:**
- Wait for data load
- Check browser console
- Try different chart type

### **Problem: Export Not Working**
**Solution:**
- Disable popup blocker
- Check download folder
- Try different browser

---

## 📊 **Feature Checklist**

**Test these features:**
- [ ] Login/Register
- [ ] View Dashboard Hub
- [ ] Switch chart types
- [ ] Upload document
- [ ] Compare bills
- [ ] Export CSV
- [ ] Browse Tally data
- [ ] Test offline mode
- [ ] Use AI chat
- [ ] Check status indicators

---

## 🏆 **Success Indicators**

**You'll know it's working when:**
- ✅ Dashboards load smoothly
- ✅ Charts switch instantly
- ✅ Data exports successfully
- ✅ Status shows "Online"
- ✅ Tally data appears
- ✅ Bills analyze automatically
- ✅ No console errors

---

## 📱 **Mobile Access**

**Yes! Works on mobile:**
- Responsive design
- Touch-friendly
- Swipe gestures
- Mobile-optimized charts

**Access from phone:**
```
http://YOUR_IP_ADDRESS:5173
```

---

## 🎓 **Learning Path**

### **Day 1: Basics**
- Login & navigation
- View dashboards
- Export data

### **Day 2: Advanced**
- Switch chart types
- Upload documents
- Compare bills

### **Day 3: Expert**
- Custom time ranges
- Offline mode
- AI chat integration

---

## 💎 **Best Practices**

1. **Connect Tally** - Enable real-time data
2. **Upload Documents** - Enhance AI knowledge
3. **Export Regularly** - Keep offline copies
4. **Test Offline** - Verify cache works
5. **Use Categories** - Find dashboards fast

---

## 🚀 **You're Ready!**

**Your app has:**
✅ 20 Dashboards
✅ 35+ Charts
✅ Offline Mode
✅ AI Assistant
✅ Document Analysis
✅ Multi-Bill Compare
✅ Real-time Sync
✅ Beautiful UI

**Access Now:** `http://localhost:5173/dashboards`

---

**Happy Analyzing! 📊🚀**

*Need help? Check the comprehensive documentation in the markdown files!*

