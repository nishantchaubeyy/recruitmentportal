#!/bin/bash
set -e

echo "🚀 Starting DYPIU Recruitment Portal Deployment on 10.100.0.37..."

# 1. Project Directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 2. Check backend environment configuration
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo "⚠️ Warning: backend/.env not found! Copying backend/.env.example..."
    if [ -f "$PROJECT_DIR/backend/.env.example" ]; then
        cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
    fi
fi

# 3. Install Root, Backend, and Frontend Dependencies (include devDependencies for build tools like Vite)
echo "📦 Installing root dependencies..."
npm install --include=dev --no-audit --no-fund

echo "📦 Installing backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install --include=dev --no-audit --no-fund

echo "📦 Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm install --include=dev --no-audit --no-fund

# 4. Generate Prisma Client & Sync Database Schema
echo "🗄️ Generating Prisma Client & Syncing Database Schema..."
cd "$PROJECT_DIR/backend"
npx prisma generate --schema=../prisma/schema.prisma || true

# Try database sync; if DB is offline, print helpful warning rather than stopping build
if npx prisma db push --schema=../prisma/schema.prisma --skip-generate; then
    echo "✅ Database schema synced successfully."
else
    echo "⚠️ Warning: Could not connect to PostgreSQL database. Please ensure PostgreSQL service is running on Ubuntu ('sudo systemctl start postgresql')."
fi

# 5. Build Frontend SPA for Production
echo "🏗️ Building Frontend React Application..."
cd "$PROJECT_DIR/frontend"
export VITE_API_URL="http://10.100.0.37/api"
npm run build

# 6. Ensure Web & Upload Directories Exist
WEB_ROOT="/var/www/recruitment-portal/html"
UPLOADS_DIR="/var/www/recruitment-portal/uploads"

echo "📁 Ensuring target directories exist..."
sudo mkdir -p "$WEB_ROOT"
sudo mkdir -p "$UPLOADS_DIR"
sudo mkdir -p "$PROJECT_DIR/backend/uploads"

# 7. Copy Built Frontend Files to Nginx Web Root
echo "📋 Deploying static build to $WEB_ROOT..."
sudo rsync -av --delete "$PROJECT_DIR/frontend/dist/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"
sudo chown -R www-data:www-data "$UPLOADS_DIR"
sudo chmod -R 775 "$WEB_ROOT"
sudo chmod -R 775 "$UPLOADS_DIR"

# 8. Start / Reload PM2 Backend Process
echo "🔄 Reloading Node.js Backend Service via PM2..."
cd "$PROJECT_DIR"
if command -v pm2 &> /dev/null; then
    pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
    pm2 save
else
    echo "⚠️ PM2 not found. Installing PM2 globally..."
    sudo npm install -g pm2
    pm2 start ecosystem.config.js --env production
    pm2 save
fi

# 9. Reload Nginx Web Server
echo "🌐 Reloading Nginx Web Server..."
if command -v systemctl &> /dev/null; then
    sudo systemctl reload nginx || sudo service nginx reload
fi

echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "🌐 Portal is live at: http://10.100.0.37"
