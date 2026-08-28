# DYPIU Recruitment Portal

Recruitment management system for **D Y Patil International University** — Phase 1 base version.

## Project Structure
```
/recruitment portal
  ├── prisma/          ← Prisma database schema
  ├── backend/         ← Node.js + Express REST API
  └── frontend/        ← React + Vite application
```

## Prerequisites

- **Node.js** v18+
- **PostgreSQL** (running locally or remote)

---

## 1. Database Setup (PostgreSQL)

Create a new PostgreSQL database:

```sql
CREATE DATABASE dypiu_recruitment;
```

Update `backend/.env` with your credentials:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/dypiu_recruitment?schema=public"
JWT_SECRET="your_strong_secret_key"
PORT=5000
UPLOAD_DIR="uploads"
```

---

## 2. Backend Setup

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push       # Pushes schema to database
npm run db:seed           # Seeds default admin + sample jobs
npm run dev               # Starts backend on port 5000
```

**Default Admin credentials (after seeding):**
- Email: `admin@dypiu.edu`
- Password: `AdminPassword123`

---

## 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev               # Starts frontend on port 5173
```

Open: http://localhost:5173

---

## API Base URL

All API requests go to: `http://localhost:5000/api`

---

## Phase 1 Test Flow

1. Login as Admin → Create/Publish a Teaching vacancy
2. Visit public site → Teaching Positions → Apply
3. Register as applicant → Fill form → Upload CV → Submit
4. Receive Application Number (e.g. `APP-2026-000001`)
5. Login as Admin → Applications → Review → Change Status → Add comment
6. Login as Applicant → Dashboard → See updated status
