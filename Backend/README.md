# 📦 Backend Starter Guide

## Files in this folder
- `index.js` — Main Express server with `/health`, `/api/health`, and MongoDB connector.
- `package.json` — Dependencies (`express`, `cors`, `dotenv`, `mongoose`).
- `Dockerfile` — Production Dockerfile that runs as non-root user on Port 5000.
- `.dockerignore` — Ignores `node_modules` during Docker build.

## How to test locally
```bash
cd Backend
npm install
node index.js
# Open http://localhost:5000/health
```

## Adding your own code
Aap apna Express / Node.js code yahan add kar sakte hain (Controllers, Models, Routes).
Bas ye dhyan rakhein ki:
1. Port environment variable `process.env.PORT || 5000` se bind ho.
2. `/health` endpoint exist kare (Kubernetes liveness probe ke liye zaroori hai).
