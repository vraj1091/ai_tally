# Hugging Face Spaces Deployment - Quick Reference

## Files Required in Space Root

```
backend/
├── app.py              ✅ REQUIRED - Entry point
├── Dockerfile.hf       ✅ REQUIRED - Dockerfile (rename from Dockerfile.hf)
├── README.md           ✅ REQUIRED - Spaces metadata
├── requirements.txt    ✅ REQUIRED - Dependencies
└── app/                ✅ REQUIRED - Application directory
    ├── main.py
    ├── config.py
    ├── models/
    ├── routes/
    └── services/
```

## Important Notes

1. **Rename `Dockerfile.hf` to `Dockerfile`** when uploading to Hugging Face
2. **Port**: Hugging Face uses port 7860 (already configured)
3. **Entry Point**: `app.py` (not `app/main.py`)
4. **Environment Variables**: Set in Space Settings → Variables

## Environment Variables

```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
CORS_ORIGINS=https://your-frontend.onrender.com
DB_URL=sqlite:///./database.db
API_PORT=7860
DEBUG=False
```

## Build Time

- First build: 5-10 minutes
- Subsequent builds: 2-5 minutes

## Your Space URL

After deployment: `https://YOUR_USERNAME-ai-tally-backend.hf.space`

