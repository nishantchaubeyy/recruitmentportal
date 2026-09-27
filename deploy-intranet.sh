#!/usr/bin/env bash
# ==============================================================================
# DYPIU RECRUITMENT PORTAL — SAFE INTRANET SUB-PATH DEPLOYMENT SCRIPT
# ==============================================================================
# Sub-path: /recruitment/ on https://intranet.dypiu.ac.in
# Target Web Directory: /var/www/recruitment/
# Backend Internal Port: 5000 (proxied via existing Nginx)
# ==============================================================================

set -e

# Color formatting
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}  DYPIU RECRUITMENT PORTAL — INTRANET DEPLOYMENT      ${NC}"
echo -e "${BLUE}  Sub-path: /recruitment/                             ${NC}"
echo -e "${BLUE}======================================================${NC}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

WEB_ROOT="/var/www/recruitment"

# 1. Verify Backend Environment File
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo -e "${YELLOW}⚠️ backend/.env not found! Please ensure backend/.env is configured before starting.${NC}"
fi

# 2. Install Dependencies
echo -e "\n${YELLOW}[1/4] Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
npm install --include=dev --no-audit --no-fund

echo -e "\n${YELLOW}[2/4] Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
npm install --include=dev --no-audit --no-fund

# 3. Build Frontend SPA for /recruitment/ Sub-Path
echo -e "\n${YELLOW}[3/4] Building Frontend React SPA with VITE_API_URL=/recruitment/api...${NC}"
cd "$PROJECT_DIR/frontend"
export VITE_API_URL="/recruitment/api"
npm run build

# 4. Deploy Frontend Static Files
echo -e "\n${YELLOW}[4/4] Deploying static build to $WEB_ROOT...${NC}"
mkdir -p "$WEB_ROOT" 2>/dev/null || sudo -n mkdir -p "$WEB_ROOT" || true

if rsync -av --delete "$PROJECT_DIR/frontend/dist/" "$WEB_ROOT/" 2>/dev/null; then
    echo -e "${GREEN}✓ Frontend copied to $WEB_ROOT${NC}"
else
    sudo -n rsync -av --delete "$PROJECT_DIR/frontend/dist/" "$WEB_ROOT/" || echo -e "${RED}⚠️ Could not copy files to $WEB_ROOT. Check permissions.${NC}"
fi

# 5. Reload Backend via PM2
echo -e "\n${YELLOW}Reloading Recruitment Backend PM2 service...${NC}"
cd "$PROJECT_DIR"
if command -v pm2 &> /dev/null; then
    pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production || true
    pm2 save || true
    echo -e "${GREEN}✓ PM2 process updated.${NC}"
else
    echo -e "${YELLOW}⚠️ PM2 not found in PATH. Please start or reload backend manually.${NC}"
fi

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN} ✅ INTRANET DEPLOYMENT COMPLETED!                     ${NC}"
echo -e "${GREEN} Portal URL: https://intranet.dypiu.ac.in/recruitment/ ${NC}"
echo -e "${GREEN}======================================================${NC}"
