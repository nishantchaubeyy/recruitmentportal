#!/usr/bin/env bash
# ==============================================================================
# DYPIU RECRUITMENT PORTAL — UBUNTU SERVER AUTOMATED DEPLOYMENT SCRIPT
# ==============================================================================
# OS Support: Ubuntu 20.04 LTS / 22.04 LTS / 24.04 LTS
# Stack: Node.js, Express.js, PostgreSQL, Prisma ORM, Nginx, PM2
# ==============================================================================

set -e # Exit immediately if a command exits with a non-zero status

# Color formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}   DYPIU RECRUITMENT PORTAL — UBUNTU SETUP & DEPLOY   ${NC}"
echo -e "${BLUE}======================================================${NC}"

# Ensure root privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[Error] Please run this script with sudo or as root.${NC}"
  echo -e "Usage: sudo bash deploy-ubuntu.sh"
  exit 1
fi

APP_DIR="/var/www/dypiu-recruitment"
STORAGE_DIR="/var/www/dypiu-recruitment/storage"
DB_NAME="dypiu_recruitment"
DB_USER="dypiu_user"
DB_PASS="DypiuSecurePass2026!"
APP_PORT="5000"

echo -e "\n${YELLOW}[1/7] Updating Ubuntu packages & installing dependencies...${NC}"
apt-get update -y
apt-get install -y curl wget git unzip build-essential ufw nginx postgresql postgresql-contrib

# Install Node.js 20 LTS if not present
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}[Node.js] Installing Node.js 20.x LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"
echo -e "${GREEN}✓ NPM version: $(npm -v)${NC}"

# Install PM2 globally
echo -e "\n${YELLOW}[2/7] Installing PM2 process manager...${NC}"
npm install -g pm2

echo -e "\n${YELLOW}[3/7] Setting up PostgreSQL Database...${NC}"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

sudo -u postgres psql -c "DO \$$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
  END IF;
END \$$;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

echo -e "${GREEN}✓ PostgreSQL database '$DB_NAME' and user '$DB_USER' configured.${NC}"

echo -e "\n${YELLOW}[4/7] Setting up Application Directory & Storage...${NC}"
mkdir -p "$APP_DIR/backend"
mkdir -p "$STORAGE_DIR/applications"

# Set permissions so www-data / server user can manage files safely
chown -R www-data:www-data "$APP_DIR"
chmod -R 775 "$APP_DIR"

echo -e "\n${YELLOW}[5/7] Preparing Environment Variables (.env)...${NC}"
ENV_FILE="$APP_DIR/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  cat <<EOT > "$ENV_FILE"
PORT=$APP_PORT
NODE_ENV=production
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"

JWT_SECRET="dypiu_prod_jwt_secret_key_$(date +%s)_key"
REFRESH_SECRET="dypiu_prod_refresh_secret_key_$(date +%s)_key"

UPLOAD_DIR="$STORAGE_DIR"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="careers@dypiu.ac.in"
SMTP_PASS="change_this_password"
EMAIL_FROM='"DYPIU Recruitment Cell" <careers@dypiu.ac.in>'
EOT
  echo -e "${GREEN}✓ Created production .env file at $ENV_FILE${NC}"
else
  echo -e "${BLUE}ℹ Production .env already exists at $ENV_FILE${NC}"
fi

echo -e "\n${YELLOW}[6/7] Building Prisma Client & Starting Backend with PM2...${NC}"
if [ -d "$APP_DIR/backend/src" ]; then
  cd "$APP_DIR/backend"
  npm install --production
  npx prisma db push --schema=../prisma/schema.prisma || true
  npx prisma generate --schema=../prisma/schema.prisma || true
  
  pm2 stop dypiu-backend 2>/dev/null || true
  pm2 start src/index.js --name "dypiu-backend"
  pm2 save
  pm2 startup systemd -u root --hp /root 2>/dev/null || true
  echo -e "${GREEN}✓ Backend service started with PM2.${NC}"
else
  echo -e "${BLUE}ℹ Copy your project code into $APP_DIR/backend and run 'cd $APP_DIR/backend && npm install && npx prisma db push --schema=../prisma/schema.prisma && pm2 start src/index.js --name dypiu-backend'${NC}"
fi

echo -e "\n${YELLOW}[7/7] Configuring Nginx Reverse Proxy...${NC}"
NGINX_CONF="/etc/nginx/sites-available/dypiu-recruitment"

cat <<EOT > "$NGINX_CONF"
server {
    listen 80;
    server_name _;

    # Strictly block direct web access to private application storage
    location /storage/ {
        deny all;
        return 403;
    }

    # API Proxy Pass to Express PM2 process
    location /api/ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        client_max_body_size 10M;
    }
}
EOT

# Enable site and disable default if exists
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

nginx -t
systemctl restart nginx

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN} 🎉 DEPLOYMENT SCRIPT COMPLETED SUCCESSFULLY!          ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "• Backend Direct Health Check: http://localhost:$APP_PORT/api/health"
echo -e "• Nginx Proxy API Endpoint:   http://your-server-ip/api/health"
echo -e "• PM2 Logs:                    pm2 logs dypiu-backend"
echo -e "• App Root Directory:          $APP_DIR"
