# Leavely — Employee Leave Management System (ELMS)

A full-stack portal where employees apply for leave and managers / heads of department approve, reject or ask for more information. Built as a **Turborepo** monorepo with **Express + Prisma + PostgreSQL** on the backend and **React + Vite + Redux Toolkit + Tailwind CSS** on the frontend, all in TypeScript.

---

## 1. Install & run

### Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | **20.19+** (tested on 24) |
| pnpm | **10+** (tested on 11) — `npm i -g pnpm` |
| PostgreSQL | Any Postgres 14+ — a free [Neon](https://neon.tech) database works |

### Step 1 — Install dependencies (from the repo root)

```bash
pnpm install
```

This installs every workspace and runs `prisma generate` automatically.

### Step 2 — Configure the backend environment

```bash
cp apps/backend/.env.example apps/backend/.env
```

Open `apps/backend/.env` and set `DATABASE_URL` to your Neon / Postgres connection string. Also change the two JWT secrets to long random strings.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB_NAME?sslmode=require"
ACCESS_TOKEN_SECRET=<random string>
REFRESH_TOKEN_SECRET=<random string>
```

The frontend `.env` (`apps/frontend/.env`) only holds `VITE_BACKEND_URL=http://localhost:5000` and works as-is.

### Step 3 — Create the database tables and seed demo data

```bash
pnpm db:setup
```

`pnpm db:setup` builds the shared package, generates the Prisma client, applies the migrations (`prisma migrate deploy`) and seeds demo users and leaves. You can also run the steps one at a time:

```bash
cd apps/backend
pnpm db:generate     # prisma generate
pnpm db:deploy       # prisma migrate deploy  (apply existing migrations)
pnpm db:seed         # demo departments, users and leave requests
# while developing schema changes:
pnpm db:migrate      # prisma migrate dev
pnpm db:studio       # browse the data in Prisma Studio
```

### Step 4 — Start the app

```bash
pnpm dev
```

| Service | URL |
| --- | --- |
| Frontend (Vite) | http://localhost:5173 |
| Backend API (Express) | http://localhost:5000/api/v1 (health: `/api/v1/health`) |

### Production-style run

```bash
pnpm build
pnpm start
```

`pnpm start` runs the compiled API (`node dist/index.js`) and serves the built frontend with `vite preview` on port 5173. The `/api` proxy works the same way.

### Run with Docker (no Node or Postgres needed)

Needs Docker Desktop (or Docker Engine with Compose v2). From the repo root:

```bash
docker compose up --build -d
```

```bash
docker compose exec backend pnpm db:seed
```

Open **http://localhost:8080**. The backend applies migrations on every start; the seed only needs to run once (re-running it resets the demo data).

| Container | What it runs | Port |
| --- | --- | --- |
| `db` | PostgreSQL 17 (data in the `pgdata` volume) | 5432 |
| `backend` | Express API — runs `prisma migrate deploy`, then `node dist/index.js` | 5000 |
| `frontend` | nginx serving the React build and proxying `/api` to the backend | 8080 |

Uploaded documents persist in the `uploads` volume. Useful commands:

```bash
docker compose logs -f backend
```

```bash
docker compose down
```

```bash
docker compose down -v
```

`down -v` also deletes the database and uploads volumes.

**Using Neon instead of the bundled Postgres:** create a `.env` file in the repo root (next to `docker-compose.yml`) with your connection string and real secrets, then run `docker compose up --build -d` again:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB_NAME?sslmode=require
ACCESS_TOKEN_SECRET=<random string>
REFRESH_TOKEN_SECRET=<random string>
```

The compose file ships with placeholder JWT secrets for local use only. Behind HTTPS, also set `COOKIE_SECURE=true`.

### Demo accounts (password: `Password@123`)

| Role | Email | Notes |
| --- | --- | --- |
| Employee | `john@elms.dev` | Reports to Rahul (manager) |
| Employee | `emma@elms.dev` | Has a 5-day sick leave waiting for the manager |
| Manager | `manager@elms.dev` | Engineering manager, reports to the HOD |
| HOD | `hod@elms.dev` | Engineering head, gives the final approval for long leaves |
| Manager / HOD / Employee | `design.manager@elms.dev`, `design.hod@elms.dev`, `sara@elms.dev` | Design department |
| Manager / HOD | `hr.manager@elms.dev`, `hr.hod@elms.dev` | Human Resources (new HR sign-ups report to Arjun) |

The login screen has one-click buttons that fill in the Employee, Manager and HOD accounts.

### Suggested walkthrough

1. Sign in as **john** and apply for a 5-day leave. The form says it needs a document, and the API rejects the request without one.
2. Sign in as **manager**. Under **Approvals**, open the request, view the document, then **Approve & forward to HOD**, or **Ask info**.
3. Sign in as **hod**. The request shows as *Pending HOD*. Give the final approval or reject it with a comment.
4. Back as **john**, the dashboard balances, the approval stepper, the timeline and the **Audit logs** all reflect the decision.

---

## 2. Features

### Employee
- Apply for leave with type, dates and reason; `employeeName` comes from the profile.
- Attach up to 5 documents (PDF/PNG/JPG/WEBP, 5 MB each), with drag & drop.
- Edit a request while it is still pending and unreviewed. Cancel any open request, or an approved one that hasn't started yet.
- Reply to an **"ask for more information"** request, optionally with new documents.
- **Dashboard**: yearly allowance, days taken, days pending, days remaining and days taken this month, both overall and per leave type. Includes a year selector.
- **Leave history**: filter by status, type, year and date range, with pagination.

### Manager / HOD (RBAC)
- **Pending approvals** queue, scoped to their own reports (HODs also see long leaves that managers in their department have approved).
- Approve, reject or ask for info. A comment is **required** to reject or to ask for info.
- View documents inline (PDF/image preview) and the employee's leave balance before deciding.
- **Team history** with search (employee / reason) and all the filters.
- Team overview: awaiting review, waiting on employee, on leave today, team size.

### Business rules
| Rule | Where |
| --- | --- |
| More than **3 consecutive days** → document required + **Manager → HOD** approval | `packages/shared/src/constants.ts`, `leave.controller.ts`, `approval.controller.ts` |
| From date can't be in the past; to date ≥ from date; max 30 days per request | `leaveRequestSchema` (shared zod) |
| No overlapping requests (pending or approved) | `assertNoOverlap` |
| Yearly + monthly quotas per type (pending requests count as used) | `LEAVE_POLICY`, `assertBalanceAvailable` |
| Only the employee's manager can act on stage 1; only the department HOD can act on stage 2; nobody can review their own leave | `canReviewLeave` |

**Leave policy** (edit `LEAVE_POLICY` to change it):

| Type | Yearly | Monthly |
| --- | --- | --- |
| Sick | 12 | 3 |
| Casual | 12 | 2 |
| Earned (paid vacation) | 18 | — |
| Unpaid | unlimited (tracked) | — |

Days are counted as inclusive calendar days.

**Status flow**

```
PENDING ──(manager approves, ≤3 days)──────────────▶ APPROVED
   │ └──(manager approves, >3 days)──▶ PENDING_HOD ──(HOD approves)──▶ APPROVED
   │                                        │
   ├──(ask info)──▶ INFO_REQUESTED ──(employee replies)──▶ back to the stage that asked
   ├──(reject, any stage) ────────────────────────────▶ REJECTED
   └──(employee cancels) ─────────────────────────────▶ CANCELLED
```

### Plus points
- **Audit logs**: registration, login and logout, apply, edit, cancel, every review decision, info requests and replies, and document views. Each entry records the actor, the employee it concerns, the IP and the details. Visibility is scoped: employees see their own entries, managers see their reports', and HODs see their department's.
- **Friendly errors**: a central error handler turns zod, multer and Prisma errors into readable messages with per-field errors. The frontend shows them inline and as toasts.
- **Colour coding**: each status (amber / violet / sky / emerald / rose / slate) and each leave type has a consistent palette.
- **Responsive**: the sidebar becomes a drawer on mobile and tables become cards.

---

## 3. Architecture

> Full walkthrough with Mermaid diagrams (system, request pipeline, auth, data model, leave lifecycle, approval flow, user flows): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

```
ELMS/
├── apps/
│   ├── backend/                 # Express 5 + Prisma 7 API  (type: module)
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Department, User, LeaveRequest, LeaveDocument, LeaveComment, AuditLog
│   │   │   ├── migrations/      # SQL migrations (prisma migrate deploy)
│   │   │   └── seed.ts          # demo data
│   │   ├── prisma.config.ts
│   │   ├── uploads/             # stored documents (git-ignored)
│   │   └── src/
│   │       ├── app.ts           # express app, middlewares, routes
│   │       ├── index.ts         # server start + graceful shutdown
│   │       ├── constants.ts     # cookie options, prisma selects, paths
│   │       ├── controllers/     # auth / leave / approval / audit .controller.ts
│   │       ├── routes/          # auth / leave / approval / audit .route.ts
│   │       ├── db/              # prisma.db.ts (PrismaClient + pg adapter)
│   │       ├── middlewares/     # auth / role / upload / error / rateLimit .middleware.ts
│   │       └── utils/           # ApiError, ApiResponse, token, audit, leave, file, pagination .util.ts
│   └── frontend/                # React 19 + Vite + Tailwind v4
│       └── src/
│           ├── App.tsx          # react-router routes (+ RBAC guards)
│           ├── ErrPage.tsx      # 404 for unknown routes
│           ├── UI/Toast.tsx     # react-toastify template (notify.success/error/...)
│           ├── layouts/         # AppLayout (sidebar), AuthLayout
│           ├── pages/           # auth/, employee/, manager/, LeaveDetail, AuditLogs
│           ├── components/      # ui/ (Button, Field, Card, Modal...), auth/ (guards), leave/ (forms, tables...)
│           ├── store/           # Redux Toolkit: auth.slice, leave.slice
│           ├── services/        # axios instance with silent token refresh + API wrappers
│           ├── hooks/           # useLeaveList (shared filter + pagination logic)
│           ├── constants/       # colour maps, navigation
│           └── utils/           # formatting, error helpers, zod form validation
└── packages/
    └── shared/                  # @elms/shared — enums, leave policy, zod schemas, date helpers, API types
```

**The shared package is the single source of truth.** The same zod schemas validate forms in the browser and requests on the server, so the error messages match. Enums, the leave policy and the API types are shared too.

### Auth & security
- JWT **access token (15 min)** and **refresh token (7 days)**, both in **HTTP-only, SameSite cookies**, so JavaScript can't read them (XSS-safe).
- Refresh tokens are **rotated** on every refresh and stored **hashed** (SHA-256) in the database. Logging out revokes them.
- The axios interceptor refreshes the session silently on a `401` and retries the original request. Parallel requests share a single refresh call.
- `bcrypt` password hashing, `helmet` security headers, rate limiting on login and register, and a 16 kb JSON body limit.
- Documents are served only through an authenticated endpoint that checks the caller may see that leave. Every view is audited.
- Vite proxies `/api` to Express, so cookies stay first-party in development.

### API overview (`/api/v1`)

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| GET | `/auth/departments` | public | Departments for sign-up |
| POST | `/auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` | public | Session lifecycle |
| GET | `/auth/me` | any | Current profile |
| GET / POST | `/leaves` | any | My leaves (filters) / apply (multipart `documents[]`) |
| GET | `/leaves/balance?year=&userId=` | any / reviewer | Leave balance |
| GET / PATCH | `/leaves/:id` | owner, reviewer | Detail + permissions / edit |
| POST | `/leaves/:id/cancel` · `/leaves/:id/respond` | owner | Cancel / reply to info request |
| GET | `/leaves/:id/documents/:documentId` | owner, reviewer | Stream a document |
| GET | `/approvals/pending` · `/approvals/history` · `/approvals/stats` | manager, HOD | Review queue, team history, counters |
| POST | `/approvals/:id/review` | manager, HOD | `{ action: APPROVE \| REJECT \| REQUEST_INFO, comment }` |
| GET | `/audit` | any (scoped) | Audit trail |

Success responses are `{ success: true, message, data }`; error responses are `{ success: false, message, errors?: [{ field, message }] }`.

---

## 4. Packages used

**Monorepo**: `turbo`, `pnpm` workspaces, `typescript`

**Backend**
| Package | Why |
| --- | --- |
| `express` (v5) | HTTP server; async errors reach the error handler without wrappers |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg` | ORM, migrations, PostgreSQL driver adapter |
| `jsonwebtoken` | Access and refresh tokens |
| `bcrypt` | Password hashing |
| `cookie-parser`, `cors` | HTTP-only cookie auth across origins |
| `zod` | Request validation (via `@elms/shared`) |
| `multer` | Document uploads |
| `helmet`, `express-rate-limit` | Security headers, brute-force protection |
| `dotenv` | Environment config |
| `nodemon`, `tsx` | Dev server with TypeScript hot reload |

**Frontend**
| Package | Why |
| --- | --- |
| `react`, `react-dom`, `react-router-dom` | UI and routing |
| `@reduxjs/toolkit`, `react-redux` | Auth session, balances, reviewer counters |
| `axios` | API client with refresh interceptor |
| `tailwindcss`, `@tailwindcss/vite` | Styling (Tailwind v4) |
| `react-toastify` | Toast notifications (custom template in `src/UI/Toast.tsx`) |
| `lucide-react` | Icons |
| `zod` | Shared form validation |

Fonts: **Inter Tight** (UI text, tight `-0.03em` tracking on headings) and **Poppins** (numbers and brand), loaded from Google Fonts.

---

## 5. Notes & assumptions
- New sign-ups are always **employees**. They are assigned to their department's manager, or to its HOD if there is no manager. Manager and HOD accounts come from the seed; change roles with `pnpm db:studio`.
- Managers and HODs can apply for leave too. A manager's leave goes to the HOD. An HOD has no approver in the seed, so the API blocks HODs from applying, with a clear message.
- When an HOD is also someone's direct manager, one HOD approval covers both stages.
- Uploaded files are stored on local disk in `apps/backend/uploads`. For a cloud deployment, swap `upload.middleware.ts` for S3 or similar storage.
