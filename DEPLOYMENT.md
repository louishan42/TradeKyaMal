# Deployment Guide — TradeTan

## Overview

| Service | Platform | When |
|---------|----------|------|
| Frontend (dashboard) | **Vercel** | Now |
| Backend (API) | **Railway** or **Render** | Later |
| Database | **MongoDB Atlas** | Required before backend deploy |

---

## Step 1 — Push to GitHub

The project is already committed locally. Run these commands:

```bash
# 1. Log in to GitHub (one-time)
gh auth login

# 2. Create repo and push
cd /Users/louiswalker/Desktop/TradeTan
gh repo create TradeTan --public --source=. --remote=origin --push
```

Or manually: create a repo at [github.com/new](https://github.com/new), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/TradeTan.git
git push -u origin main
```

---

## Step 2 — Deploy Frontend to Vercel

### 1. Import project

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New → Project**
3. Import your `TradeTan` repository

### 2. Configure build settings

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Framework Preset** | Next.js (auto-detected) |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` |

### 3. Environment variables (Vercel dashboard)

For now, before the backend is deployed, you can skip this — the dashboard will load with fallback data.

When the backend is live, add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-url.railway.app` |

### 4. Deploy

Click **Deploy**. Vercel will give you a URL like `https://tradetan.vercel.app`.

**Already deployed:** https://tradetan-louiswalker240904-4165s-projects.vercel.app

To connect GitHub for auto-deploys: Vercel Dashboard → tradetan project → Settings → Git → Connect Repository.

---

## Step 3 — Deploy Backend (Later)

Recommended: **Railway** (simple) or **Render** (free tier).

### A. MongoDB Atlas (database — do this first)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free **M0 cluster**
3. Create a database user (username + password)
4. Network Access → Add IP → **Allow access from anywhere** (`0.0.0.0/0`)
5. Copy the connection string:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/tradetan
   ```

### B. Railway (backend)

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select `TradeTan` repo
3. Set **Root Directory** to `backend`
4. Add environment variables:

| Variable | Value |
|----------|-------|
| `PORT` | `4000` (Railway sets this automatically — use `$PORT` if needed) |
| `MONGODB_URI` | Your Atlas connection string |
| `CORS_ORIGIN` | `https://your-app.vercel.app` |
| `FINNHUB_API_KEY` | Your Finnhub key (optional) |

5. Railway will assign a public URL like `https://tradetan-backend.up.railway.app`

### C. Connect frontend to backend

In **Vercel** → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL = https://tradetan-backend.up.railway.app
```

Redeploy the frontend (Deployments → ⋯ → Redeploy).

### D. Update backend CORS

Set `CORS_ORIGIN` on Railway to your exact Vercel URL. Multiple origins can be comma-separated:

```
CORS_ORIGIN=https://tradetan.vercel.app,http://localhost:3000
```

---

## Step 4 — Verify

| Check | URL |
|-------|-----|
| Frontend | `https://your-app.vercel.app` |
| Backend health | `https://your-backend.railway.app/api/health` |
| Data collection | Add a data point on the live dashboard |

---

## Troubleshooting

**Dashboard shows "Backend unavailable"**
- `NEXT_PUBLIC_API_URL` is missing or wrong in Vercel env vars
- Backend is not running or CORS is blocking requests

**CORS errors in browser console**
- Set `CORS_ORIGIN` on the backend to your exact Vercel URL (no trailing slash)

**MongoDB connection failed on Railway**
- Check Atlas IP whitelist includes `0.0.0.0/0`
- Verify username/password in connection string (URL-encode special characters)

**Vercel build fails**
- Ensure **Root Directory** is set to `frontend`, not the repo root
