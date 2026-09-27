# DYPIU Recruitment Portal — Sub-path Deployment Guide

## Overview

This document describes how to deploy the Recruitment Portal under the sub-path `/recruitment/` on the existing DYPIU intranet server at `https://intranet.dypiu.ac.in`.

## Architecture

```
https://intranet.dypiu.ac.in/            → UniOne intranet (existing)
https://intranet.dypiu.ac.in/api/        → UniOne backend (existing)
https://intranet.dypiu.ac.in/keycloak/   → Keycloak SSO (existing)
https://intranet.dypiu.ac.in/recruitment/ → Recruitment Portal (this app)
```

## URL Structure

| Public URL | Description |
|---|---|
| `/recruitment/` | Frontend SPA |
| `/recruitment/login` | Candidate login |
| `/recruitment/register` | Candidate registration |
| `/recruitment/apply` | Application page |
| `/recruitment/teaching` | Teaching positions |
| `/recruitment/non-teaching` | Non-teaching positions |
| `/recruitment/admin/login` | Admin login |
| `/recruitment/admin/dashboard` | Admin dashboard |
| `/recruitment/applicant/dashboard` | Applicant dashboard |
| `/recruitment/api/*` | Express API (proxied) |
| `/recruitment/uploads/*` | Uploaded files (proxied) |

## Backend

The Express backend runs internally on port 5000:

```
http://127.0.0.1:5000/api/*
http://127.0.0.1:5000/uploads/*
```

It does not need to know about `/recruitment/`. NGINX handles the path translation.

## Frontend Build

```bash
cd frontend
VITE_API_URL=/recruitment/api npm run build
```

The built files should be placed at:

```
/var/www/recruitment/
```

## Backend Environment

Create `backend/.env` with production values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/recruitment_db
JWT_SECRET=<GENERATE_STRONG_RANDOM_SECRET>
JWT_REFRESH_SECRET=<GENERATE_STRONG_RANDOM_SECRET>
CORS_ORIGIN=https://intranet.dypiu.ac.in
PORT=5000
SMTP_HOST=<your-smtp-host>
SMTP_PORT=587
SMTP_USER=<your-smtp-user>
SMTP_PASS=<your-smtp-password>
SMTP_FROM=recruitment@dypiu.ac.in
```

## NGINX Configuration

Add the following to the existing intranet NGINX configuration. **Do NOT replace the existing server block — add these location blocks inside it.**

```nginx
# Redirect /recruitment to /recruitment/
location = /recruitment {
    return 301 /recruitment/;
}

# Recruitment API — proxy to Express backend
location /recruitment/api/ {
    proxy_pass http://127.0.0.1:5000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Prefix /recruitment;

    # For file uploads
    client_max_body_size 50M;
}

# Recruitment uploaded files — proxy to Express backend
location /recruitment/uploads/ {
    proxy_pass http://127.0.0.1:5000/uploads/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Recruitment frontend — serve static files with SPA fallback
location /recruitment/ {
    alias /var/www/recruitment/;
    try_files $uri $uri/ /recruitment/index.html;
}
```

### Important Notes

- The `location /recruitment/` block uses `alias` (not `root`) so that `/recruitment/index.html` maps to `/var/www/recruitment/index.html`.
- The `try_files` fallback to `/recruitment/index.html` enables client-side routing (React Router).
- `client_max_body_size` should match your backend's file upload limit.
- These location blocks must be placed **inside** the existing `server { }` block, not in a separate server block.

## Running the Backend with PM2

```bash
cd backend
pm2 start src/index.js --name recruitment-backend
pm2 save
```

## Automated Intranet Deployment Script

A helper script `deploy-intranet.sh` is provided in the repository root. It builds the frontend with `VITE_API_URL=/recruitment/api`, syncs static files to `/var/www/recruitment/`, and reloads PM2 without touching NGINX or PostgreSQL.

```bash
bash deploy-intranet.sh
```

## Deployment Checklist

- [ ] Build frontend with `VITE_API_URL=/recruitment/api`
- [ ] Copy `frontend/dist/*` to `/var/www/recruitment/`
- [ ] Configure `backend/.env` with production values
- [ ] Start backend with PM2
- [ ] Add NGINX location blocks (do not replace existing config)
- [ ] Test `nginx -t` before reloading
- [ ] Reload NGINX: `sudo systemctl reload nginx`
- [ ] Verify all routes work
- [ ] Verify API requests go to `/recruitment/api/*`
- [ ] Verify uploads/posters load from `/recruitment/uploads/*`
- [ ] Verify no requests go to `/api/*` or `/uploads/*` (those belong to UniOne)
