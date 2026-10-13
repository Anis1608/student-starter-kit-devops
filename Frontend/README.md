# 🎨 Frontend Starter Guide

## Files in this folder
- `index.html` — Responsive test UI with live `/api/health` tester.
- `package.json` — Vite build script (`npm run build` generates `dist/`).
- `nginx.conf` — Production Nginx server configuration with SPA routing fallback.
- `Dockerfile` — Multi-stage Dockerfile (Node build -> Nginx runner).

## How to use React / Vue / Next static
Agar aapka already ek React / Vue project hai:
1. Apne React/Vue project files ko is `Frontend/` folder mein paste karein.
2. Ensure karein ki `package.json` mein `"build"` script `dist/` folder banata ho.
3. Backend API calls ke liye always relative path use karein: e.g. `fetch('/api/...')`
   (Kubernetes Ingress automatically use backend service par route karega — Zero CORS error!).
