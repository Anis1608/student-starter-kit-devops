const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

// Landing Page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Skilli DevOps Lab - Application Live</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0b0f19;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
        }
        .card {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 12px;
          padding: 32px 40px;
          text-align: center;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .badge {
          display: inline-block;
          background: #22c55e20;
          color: #22c55e;
          border: 1px solid #22c55e40;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        h1 { margin: 0 0 12px 0; font-size: 24px; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0; }
        .info {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 12px;
          font-family: monospace;
          font-size: 13px;
          color: #38bdf8;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">● Pipeline Deployed Successfully</div>
        <h1>Your Application is Live!</h1>
        <p>Congratulations! Your code was built by Jenkins, analyzed by SonarQube, pushed to Nexus, and deployed onto your isolated Kubernetes namespace.</p>
        <div class="info">
          Environment: Kubernetes Pod<br>
          Namespace: ${process.env.K8S_NAMESPACE || 'Student Namespace'}<br>
          Status: Healthy & Active
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint required by Kubernetes Liveness & Readiness Probes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[App] Server listening on port ${PORT}`);
});
