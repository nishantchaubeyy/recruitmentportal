# DYPIU Recruitment Portal — Logic & Wiring Audit

**Date:** 2026-08-31
**Scope:** Full repository scan — `backend/` (Express + Prisma), `frontend/` (React + Vite), mock API layer, deployment config.

This document lists concrete **logic bugs** and **wiring mismatches** (frontend ↔ backend ↔ mock ↔ database). Each item includes the location, what's wrong, the impact, and a suggested fix. Items are ordered by severity.

---

## 0. The root cause: three different, disagreeing API "contracts"

The single biggest source of bugs is that there are **three implementations that were never reconciled**:

| Contract | Status values | List response | Endpoints | Where used |
|---|---|---|---|---|
| **Real backend** (`backend/src`) | `SUBMITTED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`, `SELECTED`, `REJECTED`, `WITHDRAWN` | `{ data, pagination }` | `/admin/vacancies`, `/applications/my`, `/applications/:id/documents/:docId/download` | Real server |
| **Mock API** (`frontend/src/utils/mockApi.js`) | `Application Submitted`, `Under Review`, `Shortlisted`, `Interview Scheduled`, `Selected`, `Not Selected`, … | plain **array** | `/jobs`, `/applications/track`, `/reports`; **no** `/admin/*`, `/interviews`, `/committee`, `/admin/users`, `/admin/audit-logs` | Vercel/demo |
| **Frontend** (`frontend/src/pages`) | human-readable strings (mostly) | mixed — some pages expect array, some expect `.data` | mixes **both** conventions | Both |

Almost every issue below is a symptom of this split. **Recommendation:** pick ONE contract (statuses, response shape, endpoint names) and make the backend, the mock, and every page conform to it. Until then the app only "works" in mock mode, and only for the pages that happen to use mock-compatible calls.

---

## 1. CRITICAL — Deployed site has no backend, and half the admin pages ignore the mock

- **Deployment:** [`vercel.json`](vercel.json) builds only the frontend (`cd frontend && npm run build`) and rewrites everything to `index.html`. There is **no serverless function** for `backend/`. So in production the only data source that can work is the mock API.
- **But these admin pages bypass the mock entirely** and call the real backend with raw `fetch(${API_BASE_URL}/...)`:
  - [`AdminJobs.jsx`](frontend/src/pages/AdminJobs.jsx:33) → `/admin/vacancies`, `/admin/vacancies/:id/status`, `/admin/vacancies/:id/notify-interested`
  - [`AdminCreateJob.jsx`](frontend/src/pages/AdminCreateJob.jsx:76) → `/admin/schools`, `/admin/schools/:id/departments`, `/admin/departments/:id/positions`, `/admin/vacancies`
  - [`AdminInterestedApplicants.jsx`](frontend/src/pages/AdminInterestedApplicants.jsx:42) → `/admin/vacancy-interests`, `/public/schools`
  - Document downloads in [`AdminJobDetails.jsx`](frontend/src/pages/AdminJobDetails.jsx:33), [`AdminReviewApplication.jsx`](frontend/src/pages/AdminReviewApplication.jsx:92), [`ApplicantApplicationDetails.jsx`](frontend/src/pages/ApplicantApplicationDetails.jsx:260)
- `API_URL` defaults to `http://localhost:5000/api` ([`api.js`](frontend/src/utils/api.js:8)). On a deployed site these fetches hit the user's own localhost and fail.
- **Impact:** In production/demo, create-job, edit-job, job list, interested-applicants, user admin, audit logs, interviews, committee, and all document downloads are broken.
- **Also:** the mock has **no handlers** for `/interviews`, `/committee/*`, `/admin/users`, `/admin/audit-logs`, `/admin/vacancies`, `/admin/schools`. Any page calling those throws `"[Mock API] Unhandled: …"` ([`mockApi.js`](frontend/src/utils/mockApi.js:412)). Affected: `AdminInterviews`, `CommitteeDashboard`, `AdminUsers`, `AdminAuditLogs`.
- **Fix:** Route **every** call through `apiRequest()` (never raw `fetch`), and either (a) deploy the backend as a real API and set `VITE_API_URL`, or (b) extend the mock to cover all endpoints the admin/committee pages use.

## 2. CRITICAL — `VITE_MOCK_API` is never committed, so a default build points at localhost

- `USE_MOCK` is `true` only when `VITE_MOCK_API === 'true'` ([`api.js`](frontend/src/utils/api.js:6)), and that is documented as living in `frontend/.env.local`, which is git-ignored (`*.local` in [`frontend/.gitignore`](frontend/.gitignore)).
- If the Vercel project doesn't explicitly define `VITE_MOCK_API=true` at build time, the whole app builds in **real-backend mode** and calls `http://localhost:5000` for everything → total failure.
- **Fix:** Make the deployment mode explicit and intentional (commit a `.env.production` with the intended value, or set it in Vercel and document it). Don't rely on an un-tracked file.

## 3. CRITICAL — Status vocabulary mismatch between backend and frontend

- Backend writes machine enums: `submitApplication` sets `status: 'SUBMITTED'` ([`applicationController.js`](backend/src/controllers/applicationController.js:203)); `createInterview` sets `'INTERVIEW_SCHEDULED'` ([`interviewController.js`](backend/src/controllers/interviewController.js:277)). Schema comments list `UNDER_REVIEW`, `SHORTLISTED`, etc.
- Frontend sends/filters/renders **human-readable** strings: the status dropdown in [`AdminReviewApplication.jsx`](frontend/src/pages/AdminReviewApplication.jsx:241) submits `"Application Submitted"`, `"Under Review"`, `"Shortlisted"`, `"Interview Scheduled"`, `"Selected"`, `"Not Selected"`; the status tabs in [`AdminApplications.jsx`](frontend/src/pages/AdminApplications.jsx:117) filter on the same strings.
- **Impact against the real backend:**
  - Status **filter tabs** never match (they send `status=Under Review`, DB has `UNDER_REVIEW`) → empty lists.
  - Interview auto-scheduling in the review page only fires when `newStatus === 'Interview Scheduled'` ([`AdminReviewApplication.jsx`](frontend/src/pages/AdminReviewApplication.jsx:62)); backend/mock and this check disagree.
  - The DB ends up with a **free-text mix** of both vocabularies because `updateApplicationStatus` blindly stores whatever string it's given ([`applicationController.js`](backend/src/controllers/applicationController.js:492)).
- **Fix:** Define one canonical status enum, use it in the DB, and map to display labels only in the UI layer. Validate incoming status against the enum server-side.

## 4. CRITICAL — Recruitment reports always show zeros on the real backend

- [`reportController.js`](backend/src/controllers/reportController.js:783) buckets applications using human-readable statuses (`'Shortlisted'`, `'Interview Scheduled'`, `'Under Review'`, `'Application Submitted'`…), but the DB stores `SHORTLISTED`, `INTERVIEW_SCHEDULED`, etc.
- **Impact:** `shortlisted`, `rejected`, `underReview` counts are always 0 for real data; only `totalApplications` is correct. `AdminReports` shows a broken dashboard.
- **Fix:** Same enum reconciliation as #3.

## 5. CRITICAL — Document download URL is missing the `/download` segment (404 everywhere)

- Backend route is `GET /applications/:id/documents/:docId/**download**` ([`applicationRoutes.js`](backend/src/routes/applicationRoutes.js)). There is **no** `GET /applications/:id/documents/:docId`.
- All three download call sites omit `/download`:
  - [`AdminReviewApplication.jsx`](frontend/src/pages/AdminReviewApplication.jsx:92): `/applications/${app?.id}/documents/${docId}`
  - [`AdminJobDetails.jsx`](frontend/src/pages/AdminJobDetails.jsx:33)
  - [`ApplicantApplicationDetails.jsx`](frontend/src/pages/ApplicantApplicationDetails.jsx:260)
- **Impact:** Every document download returns 404 against the real backend.
- **Fix:** Append `/download` to the URLs (and cover it in the mock).

## 6. CRITICAL — Track Application endpoint doesn't exist on the backend

- Frontend calls `GET /applications/track?applicationNumber=…` ([`TrackApplication.jsx`](frontend/src/pages/TrackApplication.jsx:23)).
- `applicationRoutes.js` has **no `/track` route**. The request falls through to `GET /:id` (`getApplicationById`) with `id="track"` → 404 "Application not found." (The mock *does* implement `/applications/track`, so this only breaks on the real backend.)
- **Fix:** Add `GET /applications/track` in the backend (public lookup by application number), mirroring the mock's `mockTrackApplication`.

## 7. CRITICAL (security) — Unauthenticated users are treated as admins on the dossier endpoint

- [`getApplicationById`](backend/src/controllers/applicationController.js:447):
  ```js
  const isAdmin = !req.user || ['SUPER_ADMIN', 'HR_ADMIN', 'HR_USER', 'ADMIN', 'COMMITTEE_MEMBER'].includes(req.user?.role);
  ```
  The route uses `optionalAuthenticate`, so with **no token** `req.user` is undefined → `!req.user` is `true` → `isAdmin = true`.
- **Impact:** Anyone who knows/guesses an application UUID can fetch the **full dossier** (personal info, contact, documents, status history) with no login. `screeningRemarks` is only stripped for role `APPLICANT`, so an anonymous caller even sees HR remarks.
- **Fix:** Default to deny when `req.user` is absent; require real admin auth for non-owners. Consider `authenticate` (not optional) on this route.

## 8. HIGH — Audit logging is a no-op; the Audit Logs screen is always empty

- [`auditService.logAuditAction`](backend/src/services/auditService.js) only `console.log`s and returns an object — it **never writes to `prisma.auditLog`**. Every caller (`login`, `register`, status changes, user management, interviews, evaluations, notifications) records nothing.
- Meanwhile [`auditController.getAuditLogs`](backend/src/controllers/auditController.js) reads from `prisma.auditLog`, which is always empty → `AdminAuditLogs` always shows "no logs."
- **Fix:** Implement `logAuditAction` to `prisma.auditLog.create({...})`, mapping `targetType→entity`, `targetId→entityId`, `details→newValue` (JSON), etc. Note the field-name mismatch: the service uses `targetType/targetId/details`, but the schema uses `entity/entityId/oldValue/newValue`.

## 9. HIGH — Non-`ADMIN` admin users always show name "User" and null profile

- `login` and `getMe` compute the display name as `user.role === 'ADMIN' ? user.admin?.name : user.applicant?.name` ([`authController.js`](backend/src/controllers/authController.js:133) and [:209]).
- But `createUser` creates an `Admin` profile for **all** privileged roles (`SUPER_ADMIN`, `HR_ADMIN`, `HR_USER`, `COMMITTEE_MEMBER`) ([`userController.js`](backend/src/controllers/userController.js:895)).
- **Impact:** A `SUPER_ADMIN`/`HR_ADMIN`/`COMMITTEE_MEMBER` logs in and `name` falls to `user.applicant?.name` (null) → `"User"`; `getMe.profileDetails` returns the applicant (null) instead of their admin profile.
- **Fix:** `const name = user.admin ? user.admin.name : user.applicant?.name;` (or branch on "has admin profile", not on the literal `ADMIN` role).

## 10. HIGH — `updateApplicationDraft` crashes for unauthenticated requests

- Route is `optionalAuthenticate` ([`applicationRoutes.js`](backend/src/routes/applicationRoutes.js)) but the handler does `const applicantId = req.user.applicantId;` on the first line ([`applicationController.js`](backend/src/controllers/applicationController.js:129)).
- **Impact:** A `PUT /applications/:id` with no/expired token throws `TypeError: Cannot read properties of undefined` → 500.
- **Fix:** Guard `req.user`, return 401 when required, or use `authenticate`.

## 11. HIGH — Applicant Ph.D./research data is silently dropped by the backend

- The application form collects `phdDetails` and posts it ([`ApplicationForm.jsx`](frontend/src/pages/ApplicationForm.jsx:323)).
- Backend `createApplicationDraft` and `submitApplication` map only `personalInfo`, `contactDetails`, `qualifications`, `workExperience→experience`, `declaration`. They never persist `phdDetails`/`researchDetails`, `skillsCertificates`, or `references` ([`applicationController.js`](backend/src/controllers/applicationController.js:105) and [:207]).
- The review page then reads `app.researchDetails || app.phdDetails` ([`AdminReviewApplication.jsx`](frontend/src/pages/AdminReviewApplication.jsx:157)) — always empty against the real backend, so the entire "Ph.D. & Research Profile" section is blank for teaching candidates. (Works in the mock, which stores `phdDetails` verbatim.)
- **Fix:** Persist `researchDetails` (from `phdDetails`), `skillsCertificates`, and `references` in create/submit; agree on one field name across form/mock/backend.

## 12. HIGH — List-response shape mismatch breaks the Applicant Dashboard

- `getAllApplications` returns `{ data, pagination }` ([`applicationController.js`](backend/src/controllers/applicationController.js:397)); the mock returns a plain array.
- [`ApplicantDashboard.jsx`](frontend/src/pages/ApplicantDashboard.jsx:16) does `setApplications(appsData)` and later `.map`s it → against the real backend `appsData` is an object, so the dashboard renders nothing / errors.
- `AdminApplications`, `AdminInterviews`, and `AdminDashboard` were hardened (`res?.data || res`), but `ApplicantDashboard` was not.
- **Fix:** Standardize the list shape and normalize in one place (`apiRequest`) or fix each consumer.

## 13. HIGH — Guest applications create real accounts with a shared password and merge on email

- `createApplicationDraft` for anonymous submitters auto-creates a `User` with `bcrypt.hash('Guest@12345')` ([`applicationController.js`](backend/src/controllers/applicationController.js:76)) and, if the email already exists, **reuses that user** ([:74, :88]).
- **Impact:** (a) Every guest gets a real login with the same publicly-known password; (b) two different guests who type the same email (or the email of an existing registered user) get their applications attached to the **same** account — data leakage/mix-up.
- **Fix:** Require login to apply, or store guest applications without minting a shared-credential account; never merge onto an existing account by email without verification.

## 14. HIGH — `updateJob` mass-assigns the raw request body to Prisma

- [`jobController.updateJob`](backend/src/controllers/jobController.js:353) passes `data = req.body` straight into `prisma.job.update`.
- **Impact:** (a) If the client echoes back read-only/derived fields it received from `getJobById` (`_count`, `school`, `applicationsCount`, `interestCount`, `isApplicationOpen`, relation objects), Prisma throws "Unknown arg" → 500. (b) A caller can overwrite `vacancyNumber`, `status`, `createdBy`, timestamps. Same pattern in [`updateInterview`](backend/src/controllers/interviewController.js:401) and [`updateEvaluation`](backend/src/controllers/evaluationController.js:580).
- **Fix:** Whitelist updatable fields explicitly.

## 15. HIGH — Database provider mismatch (SQLite schema vs Postgres env vs serverless)

- [`prisma/schema.prisma`](prisma/schema.prisma:2) declares `provider = "sqlite"`, but [`backend/.env.example`](backend/.env.example) sets `DATABASE_URL="postgresql://…"`. A Postgres URL against a SQLite datasource fails at connect/generate time.
- SQLite also won't work on Vercel's ephemeral serverless filesystem even if the backend were deployed.
- `userController.getAllUsers` uses `{ contains: search, mode: 'insensitive' }` ([`userController.js`](backend/src/controllers/userController.js:835)); `mode: 'insensitive'` is **not supported by the SQLite connector** and throws. (Other queries use `contains` without `mode`, which is fine.)
- **Fix:** Decide on one DB. For Postgres, set `provider = "postgresql"`. For SQLite, remove `mode: 'insensitive'`.

## 16. MEDIUM — File uploads are lost on serverless / not truly persisted

- Uploads use local disk under `UPLOAD_DIR`/`/tmp/uploads` ([`index.js`](backend/src/index.js:59), [`storageService.js`](backend/src/services/storageService.js)). On Vercel `/tmp` is ephemeral and per-invocation; downloads will 404 after the function recycles.
- **Fix:** Use object storage (S3/GCS) behind `storageService` (the abstraction is already there).

## 17. MEDIUM — Double-mounted routers and greedy catch-alls

- [`index.js`](backend/src/index.js:83) mounts `jobRoutes` at **both** `/api/jobs` and `/api`. Because `jobRoutes` defines `GET '/'` and `GET '/:id'` ([`jobRoutes.js`](backend/src/routes/jobRoutes.js)), mounting at `/api` makes `GET /api` return vacancies and `GET /api/<anything-unmatched>` resolve to `getPublicVacancyById`. It works today only because more specific routers are mounted earlier, but it's fragile and confusing.
- **Fix:** Mount `jobRoutes` once. Keep public paths explicit (`/api/public/...`, `/api/jobs`).

## 18. MEDIUM — `submitApplication` skips the validations its own comment promises

- The function is titled "Submit Application with Deadline and Field Validations" ([`applicationController.js`](backend/src/controllers/applicationController.js:174)) but performs **no** deadline check, no required-field check, no `declaration === true` check, no "already submitted" guard, and no duplicate-application guard.
- **Impact:** Candidates can submit after the deadline, submit empty/incomplete applications, re-submit (regenerating the application number and rewriting history), and apply to the same job many times.
- **Fix:** Validate job is `PUBLISHED` and within `openingDate`/`deadline`; require declaration and mandatory sections; block re-submission of a non-DRAFT app; enforce one active application per (applicant, job).

## 19. MEDIUM — `AdminApplications` "Reset / Clear" only clears mock localStorage

- [`AdminApplications.jsx`](frontend/src/pages/AdminApplications.jsx:60) removes `MOCK_APPLICATIONS_PERSIST` from localStorage. Against a real backend this does nothing to server data but *appears* to "clear applications," which is misleading (and a destructive-looking control that silently no-ops).
- **Fix:** Remove this control in real-backend mode, or wire it to a proper admin action.

## 20. LOW — Interview auto-scheduling passes a possibly-null candidate id / mock gap

- In the review page, scheduling posts `candidateId: app?.applicantId` ([`AdminReviewApplication.jsx`](frontend/src/pages/AdminReviewApplication.jsx:67)). For guest-created applications where the applicant relation isn't loaded, this can be undefined → backend 400. The call is wrapped in `.catch(() => {})`, so the failure is **silently swallowed** and the HR user thinks the interview was scheduled.
- The mock has no `/interviews` handler at all, so in mock mode this always throws (and is swallowed).
- **Fix:** Validate `candidateId` before posting; surface scheduling errors instead of swallowing them.

## 21. LOW — Misc.

- **Hardcoded secrets fallback:** `JWT_SECRET`/`REFRESH_SECRET` default to literals in code ([`authMiddleware.js`](backend/src/middleware/authMiddleware.js), [`authController.js`](backend/src/controllers/authController.js:7)). Fail closed if the env var is missing in production instead of using a known default.
- **CORS `origin: '*'`** with `Authorization` ([`index.js`](backend/src/index.js:29)) — fine for a token-in-header design, but lock it to known origins for production.
- **Unauthenticated status endpoints:** `GET /applications/:id/status` and `/status-history` have no auth ([`applicationRoutes.js`](backend/src/routes/applicationRoutes.js)); anyone with a UUID sees status history.
- **Committee select oddity:** `candidate: { select: { id, name, mobile: false } }` ([`committeeController.js`](backend/src/controllers/committeeController.js:617)) mixes `true`/`false` selects; simpler to just omit `mobile`.
- **Mock data inconsistency:** `MOCK_JOBS['job-002']` is "Associate Professor - Mechanical Engineering / School of Engineering," but `MOCK_APPLICATIONS['app-003']` embeds `job-002` as "Associate Professor - Management / School of Management" ([`mockData.js`](frontend/src/utils/mockData.js:211)).
- **Seed vs upsert:** the vacancy-interest seed keys on `{ email, interestedPosition }` ([`seed.js`](backend/src/seed.js:340)), which is not a unique constraint — will error if used with `upsert`. Verify the seed idempotency logic.
- **Unused endpoint:** backend `GET /applications/my` exists but the applicant UI uses `GET /applications` instead; dead surface area that can drift.

---

## Suggested remediation order

1. **Decide the deployment model** (mock-only demo vs. real backend) and make `VITE_MOCK_API` explicit (#1, #2).
2. **Unify the API contract** — one status enum, one list shape, one set of endpoint paths — then make backend + mock + all pages conform (#3, #4, #12, and the download/track URL fixes #5, #6).
3. **Close the security holes** (#7 anonymous dossier access, #10 crash, #13 guest accounts).
4. **Make audit logging real** (#8) and fix admin identity (#9).
5. **Persist all form sections** (#11) and add submit validations (#18).
6. **Harden Prisma writes** (#14) and **fix the DB provider** (#15/#16).
7. Clean up routing and the misleading admin controls (#17, #19, #20, #21).

> Note: today the app is only coherent in **mock mode for the subset of pages that use `apiRequest` with mock-covered endpoints**. Before it can run against the real Express/Prisma backend, items #3–#15 need to be addressed.
