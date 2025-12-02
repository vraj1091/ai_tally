# ⚙️ Render Frontend Settings - Copy These Exactly

## 📋 Settings for Render Dashboard

When configuring your frontend on Render, use these **exact** settings:

### Basic Settings

| Setting | Value |
|---------|-------|
| **Name** | `ai-tally-frontend` |
| **Environment** | `Static Site` |
| **Region** | `Oregon (US West)` (or closest to you) |
| **Branch** | `main` (or your default branch) |

### Build Settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

### Environment Variables

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://vraj1091-ai-tally-backend.hf.space` |

---

## 🔧 How to Fix in Render Dashboard

1. **Go to**: https://dashboard.render.com
2. **Click**: Your `ai_tally_frontend` service
3. **Click**: "Settings" tab
4. **Scroll to**: "Build & Deploy" section
5. **Update**:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
6. **Scroll to**: "Environment" section
7. **Add/Update**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://vraj1091-ai-tally-backend.hf.space`
8. **Click**: "Save Changes"
9. **Click**: "Manual Deploy" → "Deploy latest commit"

---

## ✅ Verification

After deployment, check:

- ✅ Build completes without errors
- ✅ Frontend is accessible at your Render URL
- ✅ Frontend can connect to backend (check browser console)
- ✅ No CORS errors

---

**Copy these settings exactly into Render dashboard!** 🚀

