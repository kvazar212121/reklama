#!/bin/bash
set -e

echo "=== AdForge Reklama Deploy Script ==="

# 1. Pull latest code from GitHub
echo "[1/4] Pulling latest code from GitHub..."
git pull origin main

# 2. Setup Backend
echo "[2/4] Installing backend dependencies..."
cd backend
npm install --production=false

# Check .env file
if [ ! -f .env ]; then
  echo "Creating default backend .env file..."
  cat << 'EOF' > .env
PORT=5000
NODE_ENV=production
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY
SESSION_SECRET=adforge-super-secret-key-2026
JCODE_PATH=/home/devops/.local/bin/jcode
EOF
fi

cd ..

# 3. Setup Frontend
echo "[3/4] Building frontend..."
cd frontend
npm install
npm run build
cd ..

# 4. Restart Backend Process (using PM2 if installed, or systemd/node)
echo "[4/4] Starting/restarting application..."
if command -v pm2 &> /devnull; then
  pm2 restart reklama-backend || pm2 start backend/server.js --name "reklama-backend"
  pm2 save
else
  echo "PM2 not found. You can start backend with: cd backend && npm start"
fi

echo "=== Deployment script finished successfully! ==="
