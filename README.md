# 🚀 TallyDash Pro - Advanced AI-Powered Analytics for Tally ERP

<div align="center">
  <img src="frontend/public/logo.svg" alt="TallyDash Pro Logo" width="200"/>
  
  ### Professional Edition - World's Best Accounting Analytics Platform
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
  [![Deployed on HuggingFace](https://img.shields.io/badge/🤗-HuggingFace-yellow)](https://huggingface.co/spaces/vraj1091/ai_tally_backend)
</div>

---

## 📊 **20 Advanced Financial Dashboards**

Transform your Tally ERP data into actionable insights with AI-powered analytics:

### **Executive Dashboards**
- 📈 **CEO Dashboard** - Complete business overview with KPIs
- 💰 **CFO Dashboard** - Financial health & ratios
- 📊 **Executive Summary** - High-level performance metrics

### **Financial Analytics**
- 💵 **Revenue Analysis** - Revenue streams & growth trends
- 💸 **Expense Analysis** - Cost breakdown & optimization
- 📉 **Profit & Loss** - Comprehensive P&L statements
- 🏦 **Balance Sheet** - Assets, liabilities & equity
- 💧 **Cash Flow** - Operating, investing & financing activities

### **Operational Dashboards**
- 🛒 **Sales Performance** - Sales metrics & customer insights
- 📦 **Inventory Management** - Stock levels & turnover
- 🎯 **Product Performance** - Product profitability analysis
- ⚡ **Real-time Operations** - Live transaction monitoring

### **Accounts Management**
- 💳 **Accounts Receivable** - Customer payments & aging
- 💰 **Accounts Payable** - Vendor payments & aging
- 👥 **Customer Analytics** - Customer segmentation & behavior
- 🏢 **Vendor Analytics** - Vendor performance & spend

### **Strategic Planning**
- 📊 **Budget vs Actual** - Variance analysis & performance
- 🔮 **Financial Forecasting** - AI-powered predictions
- 📋 **Tax & Compliance** - GST, TDS & tax liabilities

---

## ✨ **Key Features**

### **🎯 Zero Fabricated Data**
- All metrics calculated from actual Tally data
- Real-time calculations from ledgers, vouchers & stock items
- No hardcoded values or estimates

### **🚀 Production-Ready**
- Handles 120,000+ transactions seamlessly
- 4GB file upload support
- 30-minute timeout for large files
- Robust error handling & logging

### **🎨 Beautiful UI**
- Modern, responsive design
- 20+ interactive charts & visualizations
- Real-time data updates
- Mobile-friendly interface

### **🤖 AI-Powered**
- Intelligent data analysis
- Automated insights generation
- Natural language chat interface
- Smart recommendations

### **🔒 Secure & Reliable**
- User authentication & authorization
- Secure data handling
- File-based caching for performance
- Anonymous access support

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+ (Frontend)
- Python 3.9+ (Backend)
- Tally ERP (for live data)

### **1. Clone Repository**
```bash
git clone https://github.com/vraj1091/ai_tally.git
cd ai_tally
```

### **2. Setup Backend**
```bash
cd hf-backend
pip install -r requirements.txt
python app.py
```
Backend runs on: `http://localhost:7860`

### **3. Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173`

### **4. Upload Tally Data**
1. Export Tally data as XML/TBK backup
2. Navigate to frontend
3. Upload backup file
4. Explore 20 dashboards!

---

## 🌐 **Live Demo**

**Backend API:** https://huggingface.co/spaces/vraj1091/ai_tally_backend  
**API Documentation:** https://huggingface.co/spaces/vraj1091/ai_tally_backend/docs

---

## 📁 **Project Structure**

```
TallyDash-Pro/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # UI Components
│   │   │   ├── dashboards/  # 20 Dashboard Components
│   │   │   └── common/      # Shared Components
│   │   ├── api/            # API Integration
│   │   ├── store/          # State Management
│   │   └── utils/          # Utilities
│   └── public/
│       ├── logo.svg        # TallyDash Pro Logo
│       └── favicon.svg     # Favicon
│
├── hf-backend/              # FastAPI Backend
│   ├── app.py              # Main Application
│   ├── app/
│   │   └── services/       # Business Logic
│   │       ├── tbk_parser.py      # Tally File Parser
│   │       └── tally_connector.py # Tally Integration
│   └── cache/              # File-based Cache
│
└── docs/                    # Documentation
```

---

## 🎯 **Dashboard Features**

### **CEO Dashboard**
- Total Revenue, Expenses, Net Profit
- Customer Count, Active Products
- Transaction Volume & Growth Rate
- Top 5 Revenue Sources & Expense Categories
- Performance Indicators

### **CFO Dashboard**
- Total Assets, Liabilities, Equity
- Working Capital & Cash Reserves
- Financial Ratios (Current, Quick, Debt-to-Equity)
- Return on Assets/Equity
- Cost Analysis

### **Sales Performance**
- Total Sales & Sales Count
- Average Sale Value
- Top Customers & Products
- Sales Pipeline & Conversion Rates
- Performance Metrics

### **Tax & Compliance**
- GST Payable & Receivable
- NET GST Calculation
- GST Breakdown (CGST, SGST, IGST)
- TDS Payable
- Compliance Status

*...and 16 more advanced dashboards!*

---

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18.2** - UI Framework
- **Vite** - Build Tool
- **Recharts** - Data Visualization
- **TailwindCSS** - Styling
- **Zustand** - State Management
- **React Router** - Navigation

### **Backend**
- **FastAPI** - API Framework
- **Python 3.9+** - Core Language
- **lxml** - XML Parsing
- **Uvicorn** - ASGI Server
- **Pydantic** - Data Validation

### **Deployment**
- **HuggingFace Spaces** - Backend Hosting
- **Render.com** - Frontend Hosting (optional)
- **GitHub** - Version Control

---

## 📊 **Sample Data**

Included sample Tally XML files:
- `tally_120000_FY2024_25_all_masters.xml` - 120,000 vouchers
- Comprehensive data with all master types
- Ready for testing all dashboards

---

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 **Acknowledgments**

- Tally Solutions for the amazing ERP system
- HuggingFace for hosting infrastructure
- React & FastAPI communities

---

## 📞 **Support**

For support, email support@tallydashpro.com or open an issue on GitHub.

---

<div align="center">
  <strong>Made with ❤️ for Accountants & Business Owners</strong>
  
  **TallyDash Pro** - Transform Data into Decisions
</div>
