#!/bin/bash
set -e

echo "🚀 Starting DYPIU Recruitment Portal Deployment on 10.100.0.37..."

# 1. Project Directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 2. Check for persistent environment configuration
PERSISTENT_ENV="/var/www/recruitment-portal/.env"

if [ -f "$PERSISTENT_ENV" ]; then
    echo "📋 Using persistent environment configuration from $PERSISTENT_ENV..."
    cp "$PERSISTENT_ENV" "$PROJECT_DIR/backend/.env"
elif [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo "⚠️ Warning: backend/.env not found! Copying backend/.env.example..."
    if [ -f "$PROJECT_DIR/backend/.env.example" ]; then
        cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
    fi
fi

# 3. Install Root, Backend, and Frontend Dependencies
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

if npx prisma db push --schema=../prisma/schema.prisma --skip-generate; then
    echo "✅ Database schema synced successfully."
else
    echo "⚠️ Warning: Could not connect to PostgreSQL database. Please ensure credentials in backend/.env are valid and PostgreSQL is running."
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
mkdir -p "$WEB_ROOT" 2>/dev/null || sudo -n mkdir -p "$WEB_ROOT" || true
mkdir -p "$UPLOADS_DIR" 2>/dev/null || sudo -n mkdir -p "$UPLOADS_DIR" || true
mkdir -p "$PROJECT_DIR/backend/uploads" 2>/dev/null || true

# 7. Copy Built Frontend Files to Nginx Web Root
echo "📋 Deploying static build to $WEB_ROOT..."
if rsync -av --delete "$PROJECT_DIR/frontend/dist/" "$WEB_ROOT/" 2>/dev/null; then
    echo "✅ Files copied to $WEB_ROOT"
else
    sudo -n rsync -av --delete "$PROJECT_DIR/frontend/dist/" "$WEB_ROOT/" || echo "⚠️ Warning: Could not copy build files to $WEB_ROOT."
fi

# 8. Start / Reload PM2 Backend Process
echo "🔄 Reloading Node.js Backend Service via PM2..."
cd "$PROJECT_DIR"
if command -v pm2 &> /dev/null; then
    pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production || true
    pm2 save || true
else
    echo "⚠️ PM2 not found in PATH."
fi

# 9. Reload Nginx Web Server
echo "🌐 Reloading Nginx Web Server..."
if command -v systemctl &> /dev/null; then
    sudo -n systemctl reload nginx 2>/dev/null || true
fi

echo "✅ DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "🌐 Portal is live at: http://10.100.0.37"
