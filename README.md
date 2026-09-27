# DYPIU Recruitment Portal

Full-stack Recruitment Management System for **D Y Patil International University (DYPIU)**.

## Project Architecture
```
/recruitmentportal
  ├── prisma/          ← Prisma database schema (PostgreSQL)
  ├── backend/         ← Node.js + Express REST API
  ├── frontend/        ← React 18 + Vite SPA
  └── deploy-ubuntu.sh ← Automated Ubuntu Linux deployment script
```

## Environment Requirements
- **Node.js** v18+ or v20+ LTS
- **PostgreSQL** database server

---

## 1. Environment Setup

### Backend Environment Configuration
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=https://intranet.dypiu.ac.in
DATABASE_URL="postgresql://<DB_USER>:<DB_PASSWORD>@localhost:5432/dypiu_recruitment?schema=public"
JWT_SECRET="<CHANGE_ME_RANDOM_SECRET>"
REFRESH_SECRET="<CHANGE_ME_REFRESH_SECRET>"
UPLOAD_DIR="uploads"
SEED_ADMIN_EMAIL="admin@dypiu.edu"
SEED_ADMIN_PASSWORD="<CHANGE_ME_ADMIN_PASSWORD>"
SEED_APPLICANT_EMAIL="demo@applicant.com"
SEED_APPLICANT_PASSWORD="<CHANGE_ME_APPLICANT_PASSWORD>"
```

### Frontend Environment Configuration
Copy `frontend/.env.example` to `frontend/.env`:
```env
# For local development:
# VITE_API_URL=http://localhost:5000/api

# For intranet sub-path production:
VITE_API_URL=/recruitment/api
VITE_MOCK_API=false
```

---

## 2. Installation & Running Locally

Install dependencies for root, backend, and frontend with a single command:
```bash
npm run install:all
```

### Database Initialization
```bash
cd backend
npm run prisma:generate   # Generate Prisma client
npm run prisma:push       # Push PostgreSQL schema
npm run db:seed           # Seed admin user, demo applicant, and sample vacancies
```

### Running Development Servers
To run both backend API (port 5000) and frontend SPA (port 5173) concurrently:
```bash
npm run dev
```

Or start individually:
```bash
# Terminal 1: Backend REST API
npm run backend

# Terminal 2: Frontend Vite App
npm run frontend
```

---

## 3. Key Seed Credentials

- **Admin Account**: `admin@dypiu.edu` / `<CHANGE_ME_ADMIN_PASSWORD>`
- **Demo Applicant Account**: `demo@applicant.com` / `<CHANGE_ME_APPLICANT_PASSWORD>`

---

## 4. Canonical Status Architecture

The platform uses single-source-of-truth machine status enums defined in `backend/src/constants/statuses.js` and mapped in `frontend/src/utils/status.js`:

`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`, `SELECTED`, `WAITLISTED`, `REJECTED`, `WITHDRAWN`, `CLOSED`

---

## 5. Deployment Options

### A. Intranet Sub-path Deployment (/recruitment/)
For deploying under `/recruitment/` on `https://intranet.dypiu.ac.in` alongside UniOne and Keycloak, please follow:
👉 **[SUBPATH_DEPLOYMENT.md](SUBPATH_DEPLOYMENT.md)**

Use the safe deployment script:
```bash
bash deploy-intranet.sh
```

### B. Standalone Ubuntu Server Deployment
For dedicated standalone servers (NOT for the shared intranet server):
```bash
sudo bash deploy-ubuntu.sh
```
