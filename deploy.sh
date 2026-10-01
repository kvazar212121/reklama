#!/bin/bash
set -e

echo "=== AdForge Reklama Deploy Script ==="

# 0. Check and Install Node.js, npm & Nginx
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "[0/5] Node.js va npm topilmadi. Node.js v20 LTS o'rnatilmoqda..."
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs build-essential
  elif command -v yum >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs gcc-c++ make
  else
    echo "XATO: apt-get yoki yum paket boshqaruvchisi topilmadi."
    exit 1
  fi
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "[0/5] Nginx topilmadi. Nginx o'rnatilmoqda..."
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update && sudo apt-get install -y nginx
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y nginx
  fi
fi

echo "Node.js versiyasi: $(node -v)"
echo "npm versiyasi: $(npm -v)"

# 1. Pull latest code from GitHub
echo "[1/5] Pulling latest code from GitHub..."
git pull origin main

# 2. Setup Backend
echo "[2/5] Installing backend dependencies..."
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
echo "[3/5] Building frontend..."
cd frontend
npm install
npm run build
cd ..
chmod 755 "$HOME" 2>/dev/null || true
chmod -R 755 frontend/dist 2>/dev/null || true

# 4. Restart Application (systemd or PM2)
echo "[4/5] Starting/restarting application..."
if systemctl list-units --type=service | grep -q "adforge-backend"; then
  sudo systemctl restart adforge-backend || true
fi

if command -v pm2 >/dev/null 2>&1; then
  pm2 restart reklama-backend || pm2 start backend/server.js --name "reklama-backend" || true
  pm2 save || true
fi

# 5. Setup Nginx Configuration
echo "[5/5] Nginx sozlanmoqda..."
CURRENT_DIR="$(pwd)"
sudo mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
sed "s|/home/[^/]*/reklama|${CURRENT_DIR}|g" reklam.hubservis.uz.conf | sudo tee /etc/nginx/sites-available/reklam.hubservis.uz >/dev/null
sudo ln -sf /etc/nginx/sites-available/reklam.hubservis.uz /etc/nginx/sites-enabled/reklam.hubservis.uz

# Remove default site if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
if sudo nginx -t >/dev/null 2>&1; then

  sudo systemctl reload nginx || sudo service nginx reload || sudo systemctl restart nginx
  echo "Nginx sozlandi va qayta ishga tushirildi!"
else
  echo "OGOHLANTIRISH: Nginx test xatosi. Iltimos, Nginx sozlamalarini tekshiring."
fi

echo "=== Deployment script finished successfully! ==="
