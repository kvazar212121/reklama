#!/bin/bash
set -e

echo "=== AdForge Reklama Deploy Script ==="

# 0. Check Node.js and npm installation
if ! command -v node &> /devnull || ! command -v npm &> /devnull; then
  echo "[0/4] Node.js va npm topilmadi. Node.js v20 LTS o'rnatilmoqda..."
  if command -v apt-get &> /devnull; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential
  else
    echo "XATO: apt-get topilmadi. Node.js v20 ni qo'lda o'rnating va qayta urinib ko'ring."
    exit 1
  fi
fi

echo "Node.js versiyasi: $(node -v)"
echo "npm versiyasi: $(npm -v)"

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

# 4. Install PM2 and Start/Restart Application
echo "[4/4] Starting/restarting application..."
if ! command -v pm2 &> /devnull; then
  echo "PM2 o'rnatilmoqda..."
  sudo npm install -g pm2 || npm install -g pm2
fi

pm2 restart reklama-backend || pm2 start backend/server.js --name "reklama-backend"
pm2 save || true

echo "=== Deployment script finished successfully! ==="
