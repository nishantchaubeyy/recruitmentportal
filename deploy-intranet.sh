#!/usr/bin/env bash
# ==============================================================================
# DYPIU RECRUITMENT PORTAL — PRODUCTION INTRANET DEPLOYMENT SCRIPT
# ==============================================================================
# Target: https://intranet.dypiu.ac.in/recruitment/
# Frontend Web Root:    /var/www/recruitment/
# Backend Environment:  /opt/dypiu-recruitment/.env
# Persistent Uploads:   /var/lib/dypiu-recruitment/uploads/
# Backend Internal:     127.0.0.1:5000 (PM2: dypiu-recruitment-backend)
# ==============================================================================

set -e

# Color formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  DYPIU RECRUITMENT PORTAL — PRODUCTION DEPLOYMENT    ${NC}"
echo -e "${BLUE}  Target: https://intranet.dypiu.ac.in/recruitment/   ${NC}"
echo -e "${BLUE}======================================================${NC}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

PERSISTENT_ENV="/opt/dypiu-recruitment/.env"
WEB_ROOT="/var/www/recruitment"
UPLOAD_DIR="/var/lib/dypiu-recruitment/uploads"

# 1. Verify Backend Environment File
echo -e "\n${YELLOW}[1/6] Verifying backend environment configuration...${NC}"
if [ -f "$PERSISTENT_ENV" ]; then
    echo -e "${GREEN}✓ Found persistent environment at $PERSISTENT_ENV${NC}"
    cp "$PERSISTENT_ENV" "$PROJECT_DIR/backend/.env"
elif [ -f "$PROJECT_DIR/backend/.env" ]; then
    echo -e "${YELLOW}⚠️ $PERSISTENT_ENV not found, using existing $PROJECT_DIR/backend/.env${NC}"
else
    echo -e "${RED}❌ FATAL: Persistent environment file not found at $PERSISTENT_ENV${NC}"
    echo -e "${RED}Please create /opt/dypiu-recruitment/.env with production secrets before deploying.${NC}"
    exit 1
fi

# 2. Install Dependencies
echo -e "\n${YELLOW}[2/6] Installing dependencies...${NC}"
cd "$PROJECT_DIR"
npm install --include=dev --no-audit --no-fund

cd "$PROJECT_DIR/backend"
npm install --include=dev --no-audit --no-fund

cd "$PROJECT_DIR/frontend"
npm install --include=dev --no-audit --no-fund

# 3. Prisma Generate & Migrate Deploy
echo -e "\n${YELLOW}[3/6] Running Prisma generate and migrations...${NC}"
cd "$PROJECT_DIR/backend"
npx prisma generate --schema=../prisma/schema.prisma
npx prisma migrate deploy --schema=../prisma/schema.prisma

# 4. Build Frontend SPA for /recruitment/ Sub-Path
echo -e "\n${YELLOW}[4/6] Building Frontend React SPA (VITE_API_URL=/recruitment/api)...${NC}"
cd "$PROJECT_DIR/frontend"
export VITE_API_URL="/recruitment/api"
npm run build

# 5. Ensure Directories & Deploy Frontend Static Files
echo -e "\n${YELLOW}[5/6] Deploying frontend static build to $WEB_ROOT...${NC}"
mkdir -p "$WEB_ROOT" 2>/dev/null || sudo -n mkdir -p "$WEB_ROOT" || true
mkdir -p "$UPLOAD_DIR" 2>/dev/null || sudo -n mkdir -p "$UPLOAD_DIR" || true

if rsync -av --delete "$PROJECT_DIR/frontend/dist/" "$WEB_ROOT/" 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend copied to $WEB_ROOT${NC}"
else
    sudo -n rsync -av --delete "$PROJECT_DIR/frontend/dist/" "$WEB_ROOT/" || {
        echo -e "${RED}❌ Could not copy files to $WEB_ROOT. Check permissions.${NC}"
        exit 1
    }
fi

# 6. Reload Backend PM2 Process
echo -e "\n${YELLOW}[6/6] Reloading backend service via PM2...${NC}"
cd "$PROJECT_DIR"
if command -v pm2 &> /dev/null; then
    pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
    pm2 save || true
    echo -e "${GREEN}✓ PM2 service dypiu-recruitment-backend reloaded.${NC}"
else
    echo -e "${YELLOW}⚠️ PM2 not found in PATH. Please reload backend manually.${NC}"
fi

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN} ✅ INTRANET DEPLOYMENT COMPLETED!                     ${NC}"
echo -e "${GREEN} Portal URL: https://intranet.dypiu.ac.in/recruitment/ ${NC}"
echo -e "${GREEN}======================================================${NC}"
