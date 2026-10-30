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

---

## Forms, status changes and e-mail (follow-up round)

### Dynamic application form
- `frontend/src/utils/formRules.js` holds the rules: which fields exist for each qualification level and Ph.D. status, what is required, and how rows are cleaned. The form, the "Next" buttons and the final submit all use it, and `backend/test/forms.test.js` tests it against the server rules.
- **Ph.D.** "Not Applicable" (or nothing chosen) hides every Ph.D. field and sends none of them. Awarded / Thesis Submitted / Pursuing each show their own fields: institution, department, city and country, research area, thesis title, supervisor, registration year, and then expected year, submission date, viva date and award year as they apply.
- **Qualifications**: SSC asks for a *board* (no stream); HSC asks for board and *stream*; Diploma, Bachelor's, Master's and Other ask for the degree name, university, specialization and mode of study. Switching a row's level clears the fields that no longer apply. Ph.D. is entered in Step 5 only.
- **Teaching vs non-teaching**: publications and NET / SET / SLET / GATE appear for teaching posts only; the Ph.D. status is mandatory for teaching posts only. Scopus / WoS IDs appear once a count above zero is entered; an exam year appears once an exam is marked cleared.
- No silent defaults: title, gender, marital status, city and state start empty and must be chosen. Age must be at least 18, the mobile number must be a valid Indian number, work experience needs dates (or "I currently work here").
- Every step is validated again on the final submit, and the server now checks the qualification list as well (`backend/src/utils/qualifications.js`).
- The dossier PDF no longer prints "Full-Time" for school levels or research lines for non-teaching posts.

### Status changes and e-mail
- The HR status dropdown only offers moves the server allows, with the reason shown beside the others ("only after the interview is scheduled", "HR admin only"). Scheduling an interview goes through the *Schedule Interview* button, which changes the status and invites the candidate in one step.
- After every change HR sees what the candidate was told: sent, **not sent because no e-mail provider is configured**, or failed with the reason. The application page lists the e-mails sent (table `EmailLog`) and has a **Resend current status e-mail** button.
- Candidates see a progress timeline and a "what happens next" note on their application page. It refreshes every minute and when the tab becomes visible again; the dashboard does the same. HR's remarks and the staff member's identity are not sent to candidates.
- **E-mail provider**: credentials are read from the server environment only (never from the database or the repository). On the production server that is `/opt/dypiu-recruitment/.env`; locally it is `backend/.env`. Set either `ZEPTOMAIL_TOKEN` (+ `ZEPTOMAIL_FROM_EMAIL`) or `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`; see `backend/.env.example`. Without one, the portal still works but tells HR that no e-mail went out. `GET /api/admin/email/status` reports whether a provider is configured.
- Upgrade note: this round adds the `EmailLog` table. Run `npm run db:setup` (or apply `prisma/migrations/20261029000000_email_log`) before deploying.
- `npm test` in `backend/` runs the whole suite.

---

## Document requests, file access and CSV export

- **Request Documents from the application page**: once an application is Shortlisted, Interview Scheduled, Waitlisted or Selected, the review page shows a *Request Documents* button (green, "from Selected Candidate", once selected). The panel opens in place with the candidate's name, e-mail, mobile, application number, post and school filled in, a checklist built from what the candidate actually has (10th/12th, graduation or post-graduation with the degree name, Ph.D. proof, experience and relieving letters, salary slips only for a current job, PAN, Aadhar, photograph, plus bank and address proof once selected), a default deadline and a message written for the stage. Each document can be set to Mandatory or Optional, removed, or added from the standard list or typed in. The Document Verification page uses the same panel with a candidate picker.
- **Result is honest**: the response says whether the e-mail was sent; with no mail provider the request still appears in the candidate's portal and HR is told the e-mail was not sent. Requests are refused for applications that are not yet shortlisted.
- **Viewing uploaded files** no longer fails with "access token required": files are fetched with the login header and opened from the page instead of plain links.
- **Download all as ZIP** works again (the `archiver` v8 upgrade had removed the function the code called). Entries are numbered so documents with similar names cannot overwrite each other, and the download says clearly when nothing has been uploaded.
- **Candidate upload page**: the upload button disappears once a file is uploaded and returns only if HR rejects the file; submitted or verified requests cannot be changed; a rejected mandatory document must be replaced before the candidate can submit (checked on the server too). Optional documents are labelled and do not block submission. Internal storage paths are no longer sent to browsers.
- **Export CSV**: on Applications (every application matching the current filters, across all pages) and on Document Verification (one row per requested document). Cells that start with = + - @ are neutralised for Excel.
- **Filters**: the Applications screen's school, position, candidate name, application ID and search filters were sent under names the API did not read, so they did nothing; the API now accepts them. Admin lists asked for 200 rows but the API capped them at 100; they now page through everything.
- **Invented values removed**: fake city/state/post fallbacks ("Pune", "Maharashtra", "Faculty Position", "Application Submitted", "Visiting Faculty") and the unused hard-coded university structure file.

---

## Application numbers and the application form PDF

- **Numbering**: new applications are numbered `DYPIU-YYYY-000001`. Numbers already issued as `APP-YYYY-…` are left untouched, and the sequence continues from the highest number of either format, so nothing is repeated. No database change is needed (the column is free text).
- **Application form PDF** (the attachment e-mailed to candidates and panel members) is now a single A4 page: three label/value pairs per row, a combined title bar showing the application number and submission date, and tighter spacing. If an application is unusually long the layout shrinks step by step to stay on one page; only an extreme case (dozens of rows) spills onto a second page. It no longer prints invented values (default nationality, "Full Time", "Faculty Position") and the page number is shown only when there is more than one page.
- Display fallbacks that invented an application number (`APP-2026-000001`, `DYPIU-2026-000001`) were removed from the screens; the mock data uses the new format.
- Tests: `backend/test/pdf.test.js` (one page for typical, heavy and fresher applications) and the numbering assertion in `security.test.js`.

---

## Audit log, candidate deletion and the request-documents button

- **Request button**: an application can have one document request. Once documents have been requested, submitted or verified, the page shows the request's real state ("awaiting candidate", "submitted - awaiting your review", "submitted & verified") instead of an active button, and the server refuses a second request (409). A request now reaches *Verified* when every mandatory document and every optional document the candidate did upload is verified (a skipped optional document no longer blocks it), and its status is kept to the values the screens understand.
- **Audit log** (Admin menu > *Audit Logs*, super admin / HR admin):
  - *Tamper-evident*: every record carries an HMAC over its content and the previous record, so an edited, removed or inserted record is detected. **Verify integrity** re-checks the whole chain. The database also refuses UPDATE / DELETE / TRUNCATE on the table. Set `AUDIT_SECRET` (and never change it); a changed secret is reported as a key mismatch rather than as tampering.
  - *Rich records*: actor (id, e-mail, role), action, category, severity, outcome (success / failed / denied), what was touched, a readable summary, before/after values, IP address, browser, request id, method and path. Passwords, tokens and codes are never stored. The actor is stored as plain values (no foreign key), so deleting an account never changes history.
  - *Coverage*: sign-in, failed and blocked sign-ins, lock-outs, sign-out, e-mail verification codes, password changes and resets, access denied (wrong role or disabled account), application views and status changes, every time staff open a candidate file or application document, document requests / uploads / verify / reject / approve-all / ZIP downloads, interviews, vacancies, user and role management, CSV exports, candidate deletion, and reading or exporting the audit log itself.
  - *Viewer*: search, category / action / severity / outcome / date filters, summary counters, expandable detail with before/after, live mode, CSV export, integrity check.
  - `TRUST_PROXY` (default 1 in production) makes the app use the real client address behind nginx instead of a spoofable header.
- **Delete candidate & all data** (candidate page > *Danger zone*, super administrators only): shows exactly what will be removed, then requires a reason, the candidate's e-mail typed in full and the administrator's own password (wrong-password attempts are throttled). Removes the account, applications, uploaded files, document requests, interviews, notifications, e-mail log entries and interest registrations, and the files on disk. The audit record is written in the same database transaction (no record, no deletion) and keeps only a masked reference. Staff accounts and your own account cannot be deleted this way.
- **Upgrade note**: adds migration `20261030000000_audit_log_hardening` (applied by `prisma migrate deploy` on deploy). Add `AUDIT_SECRET` to the production `.env` before or with the deploy.
- Tested against a real PostgreSQL: all migrations apply, concurrent writers produce one valid chain, the append-only triggers block edits and deletes, and the deletion cascades through every table.

---

## Resume not visible to admins

- **Applications list**: the list endpoint did not return the attached documents, so the *Download Resume* column always read "Not attached". It now returns each application's documents (names and sizes only, never storage paths) and the column picks the file filed as the resume.
- **Submitting**: attached files are now stored *before* the application is finalised, and their database rows are written in the same transaction as the application. If a file cannot be stored (for example a full or read-only upload folder) the candidate gets an error and nothing is submitted, instead of an application that silently has no resume.
- **Review page**: no longer claims "CV / Resume attached in candidate submission" when nothing is on file; it says so and warns when no file is filed as the resume.
- Applications that were already submitted without a stored file cannot be recovered; their candidates need to send the CV again.

---

## Vacancy form: dynamic School / Department / Position

- **Custom vacancies** now use the same lists as Teaching and Non-Teaching instead of three blank text boxes: *School / Faculty / Center* lists every school and division from the database, *Department / Specialization* then lists that school's departments, and *Position / Role Title* lists that department's roles. Each has an **Other** choice to type something that is not on the list yet (a Custom vacancy is still stored as text, so it does not appear under a school's Teaching / Non-Teaching listings).
- **Required fields are enforced**: School / Faculty / Center (Custom) and School / Institute plus Department (Teaching / Non-Teaching) were marked with * but never checked, and a missing school was silently saved as "DYPIU Campus". The form now asks for them and the server refuses a vacancy without one.
- Editing an older Custom vacancy shows how its department was saved ("Currently saved as: …") and keeps it valid without re-entering the school.

