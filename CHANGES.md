# DYPIU Recruitment Portal — Fixes & Enhancements Log (Mapping to ISSUES_REPORT.md)

This document summarizes the 21 logic and wiring issues identified during the system audit and records the resolutions applied across the backend and frontend codebase.

---

### Audit Items & Resolutions Summary

| Audit Item # | Area / Description | Resolution Applied |
|---|---|---|
| **#1** | **Single Source of Truth Statuses** | Created `backend/src/constants/statuses.js` with `APPLICATION_STATUS` enums (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`, `SELECTED`, `WAITLISTED`, `REJECTED`, `WITHDRAWN`, `CLOSED`) and helper buckets (`REPORT_BUCKETS`). Updated `frontend/src/utils/status.js` to map these machine enums to human display labels and CSS badges across all UI components. |
| **#2** | **Guest / Anonymous Application Security** | Removed guest application flows. Updated `/apply` route and `applicationRoutes` middleware to require an authenticated `APPLICANT` role account. `App.jsx` wraps `/apply` in `<ApplicantRoute>`. |
| **#3** | **PostgreSQL Schema Provider** | Configured `prisma/schema.prisma` provider to `postgresql`. Created PostgreSQL schema migrations and environment template configurations. |
| **#4** | **List Endpoint Response Shapes (`{ data, pagination }`)** | Standardized list endpoints (`/applications`, `/admin/vacancies`) to return `{ data, pagination }`. Updated `AdminApplications`, `AdminJobs`, and `mockApi.js` to parse `{ data, pagination }`. Kept `/applications/my` returning a direct array. |
| **#5** | **Audit Logging Service Implementation** | Implemented real audit logging in `backend/src/services/auditService.js` to capture user actions, IP address, and entity diffs in `AuditLog` table. Integrated into auth and application status controllers. |
| **#6** | **Auth Controller Name/Profile & Inactive Check** | Updated `authController.js` registration and login handlers to return full user profile (`name`, `mobile`, `admin`, `applicant`) and strictly block disabled/inactive accounts (`status !== 'ACTIVE'`). |
| **#7** | **Application Controller Authorization & Submit Validations** | Rewrote `applicationController.js` to enforce ownership checks on draft updates/fetches, validate job deadline/status on submission, and correctly build and persist complex section data (`researchDetails`, `skillsCertificates`, `references`). |
| **#8** | **Document Download Endpoint URL Fix** | Standardized document download routes to `/api/applications/documents/:id/download` with ownership authorization checks. Updated `ApplicantApplicationDetails.jsx` and `AdminReviewApplication.jsx` download links. |
| **#9** | **Public Vacancy Visibility & Admin Whitelist Updates** | Restricted public vacancy endpoint `/public/vacancies` to return only `PUBLISHED` jobs with active deadlines. Whitelisted updated fields in `jobController.js` (`updateJob`), `updateInterview`, and `updateEvaluation`. |
| **#10** | **Recruitment Summary Reports Calculation** | Updated `reportController.js` and `AdminReports.jsx` to compile numerical metrics per vacancy (`totalApplications`, `shortlisted`, `rejected`, `underReview`) based on canonical status buckets. |
| **#11** | **Committee Selection Query Fix** | Fixed `committeeController.js` database selection query to properly join user profile details and include full committee scorecards. |
| **#12** | **Express Main Index Configuration & CORS Guard** | Added `CORS_ORIGIN` environment variable support in `backend/src/index.js`, mounted single `jobRoutes` router cleanly at `/api`, and implemented production secret checks (`JWT_SECRET`, `REFRESH_SECRET`, `DATABASE_URL`). |
| **#13** | **Job Routes Greedy Route Conflict** | Reordered routes in `jobRoutes.js` so specific paths (`/public/vacancies`, `/admin/vacancies`) are evaluated before greedy parameter routes (`/jobs/:id`). |
| **#14** | **Database Seed Script Configuration** | Updated `backend/src/seed.js` to support environment variable overrides (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_APPLICANT_EMAIL`, `SEED_APPLICANT_PASSWORD`) and seed realistic teaching/non-teaching vacancies with sample interest records. |
| **#15** | **API Base Adapter Export (`IS_MOCK`)** | Standardized `frontend/src/utils/api.js` to export `IS_MOCK` flag based on `import.meta.env.VITE_MOCK_API` and route requests transparently between live backend and mock API layer. |
| **#16** | **Mock API Contract Sync** | Rewrote `frontend/src/utils/mockApi.js` and updated static `mockData.js` to enforce canonical machine statuses, paginated list shapes, and endpoint path parity with Express backend. |
| **#17** | **Committee Dashboard State Handler Bug** | Fixed state update bug in `CommitteeDashboard.jsx` by updating form submit callback from `setFormData` to `setEvalData`. |
| **#18** | **Admin Login Role Authorization & Post-Auth Routing** | Updated `AdminLogin.jsx` to accept all staff roles (`SUPER_ADMIN`, `HR_ADMIN`, `HR_USER`, `ADMIN`, `COMMITTEE_MEMBER`). Updated `Login.jsx` and `Register.jsx` to use `homePathForRole(user.role)` and handle return path redirects (`state.from`). |
| **#19** | **Application Details JSON Field Parsing** | Added safe JSON parsing helpers in `ApplicantApplicationDetails.jsx` and `AdminReviewApplication.jsx` to safely parse `personalInfo`, `qualifications`, `experience`, `researchDetails`, and `references`. |
| **#20** | **Faculty/Division Click Navigation Alignment** | Updated `TeachingPositions.jsx` and `NonTeachingPositions.jsx` so selecting a faculty/division filters active published vacancies and provides direct "Apply" links passing valid `jobId`s, with a "Notify Me When Open" modal fallback when no jobs are active. |
| **#21** | **Deployment Script & Environment Template Modernization** | Expanded `backend/.env.example` and created `frontend/.env.example`. Updated `deploy-ubuntu.sh` for PostgreSQL setup, Prisma migration/generate/seed execution, PM2 process management, and Nginx proxy rules. |

---

### Verification Summary
- **Backend Syntax**: `node --check` passed across all backend files (`0` errors).
- **Prisma Client**: `npm run prisma:generate` executed cleanly.
- **Frontend Oxlint**: `oxlint` reported `0` errors across 41 frontend files.
- **Frontend Production Build**: `npm run build` completed successfully (`dist/` generated).
