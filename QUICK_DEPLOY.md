# ⚡ Quick Deploy Guide - Hugging Face + Render

## 🎯 5-Minute Deployment

### Backend → Hugging Face Spaces

1. **Create Space**: https://huggingface.co/spaces
   - Name: `ai-tally-backend`
   - SDK: **Docker**

2. **Upload Files** (via Git or Web):
   ```bash
   # All files from backend/ directory
   - app.py
   - Dockerfile.hf
   - README.md
   - requirements.txt
   - app/ (entire directory)
   ```

3. **Set Variables** (Settings → Variables):
   ```env
   SECRET_KEY=generate-random-32-chars
   JWT_SECRET_KEY=generate-random-32-chars
   CORS_ORIGINS=https://your-frontend.onrender.com
   ```

4. **Wait for Build** (5-10 min)
   - Your URL: `https://yourusername-ai-tally-backend.hf.space`

### Frontend → Render.com

1. **Push to GitHub**
2. **Create Static Site** on Render.com
   - Root: `frontend`
   - Build: `npm install && npm run build`
   - Publish: `dist`
3. **Add Variable**:
   ```env
   VITE_API_URL=https://yourusername-ai-tally-backend.hf.space
   ```
4. **Deploy** (2-5 min)

### Connect Them

1. Update backend `CORS_ORIGINS` with frontend URL
2. Restart Hugging Face Space
3. Test! 🎉

---

**See `DEPLOY_NOW.md` for detailed steps!**

