---
title: AI Tally Assistant Backend
emoji: 📊
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# AI Tally Assistant - Backend API

FastAPI backend for AI Tally Assistant with 20 advanced financial dashboards.

## 🚀 Features

- 🔐 User Authentication (JWT)
- 📊 20 Specialized Dashboards
- 💬 AI Chat Interface
- 📄 Document Analysis
- 🔗 Tally ERP Integration
- 📈 Real-time Analytics
- 💾 Automatic Data Caching

## 📚 API Documentation

Visit `/docs` for interactive Swagger API documentation.

## 🔧 Environment Variables

Set these in Hugging Face Spaces Settings → Variables:

### Required:
```env
SECRET_KEY=your-random-secret-key-here
JWT_SECRET_KEY=your-random-jwt-secret-here
CORS_ORIGINS=https://your-frontend.onrender.com
```

### Optional:
```env
DB_URL=sqlite:///./database.db
TALLY_HOST=localhost
TALLY_PORT=9000
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi4:14b
API_PORT=7860
DEBUG=False
LOG_LEVEL=INFO
```

## 🏥 Health Check

Visit `/health` to check if the API is running.

## 📊 Available Dashboards

1. CEO Dashboard
2. CFO Dashboard
3. Executive Summary
4. Sales Performance
5. Inventory Management
6. Real-time Operations
7. Accounts Receivable
8. Accounts Payable
9. Cash Flow Analysis
10. Profit & Loss
11. Balance Sheet
12. Tax & Compliance
13. Regulatory Compliance
14. Budget vs Actual
15. Financial Forecasting
16. Customer Analytics
17. Vendor Analytics
18. Product Performance
19. Expense Analysis
20. Revenue Analysis

## 🔗 Frontend Integration

Update your frontend `.env` with:
```env
VITE_API_URL=https://your-username-ai-tally-assistant-backend.hf.space
```

## 📝 License

MIT
