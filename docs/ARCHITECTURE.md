# ELMS — Architecture & User Flows

This document walks through how the Employee Leave Management System is put together and how each kind of user moves through it. Every diagram is Mermaid, so it renders on GitHub, in VS Code (with a Mermaid extension) or at [mermaid.live](https://mermaid.live).

1. [System architecture](#1-system-architecture)
2. [Backend request pipeline](#2-backend-request-pipeline)
3. [Authentication & session refresh](#3-authentication--session-refresh)
4. [Data model](#4-data-model)
5. [Leave lifecycle](#5-leave-lifecycle)
6. [Applying for leave](#6-applying-for-leave)
7. [Two-level approval](#7-two-level-approval)
8. [User flows by role](#8-user-flows-by-role)
9. [Frontend structure](#9-frontend-structure)

---

## 1. System architecture

The repo is a **Turborepo** with three workspaces:

- **`apps/frontend`**: React 19 + Vite + Redux Toolkit + Tailwind. Runs in the browser.
- **`apps/backend`**: Express 5 + Prisma 7. A REST API under `/api/v1`.
- **`packages/shared`**: enums, leave policy, zod schemas, date helpers and API types. **Both apps import it**, so the browser and the server validate with exactly the same rules and messages.

The browser never talks to Express directly. In development the **Vite dev server** proxies `/api` to port 5000; in Docker **nginx** does the same. Because of that, the frontend and the API share one origin, and the HTTP-only auth cookies stay first-party.

```mermaid
flowchart LR
    subgraph Browser
        UI["React SPA<br/>pages, components"]
        Store["Redux store<br/>auth + leave slices"]
        Axios["axios client<br/>refresh interceptor"]
        UI --> Store
        UI --> Axios
    end

    subgraph Edge["Same-origin proxy"]
        Vite["Vite dev server :5173<br/>(development)"]
        Nginx["nginx :8080<br/>(Docker)"]
    end

    subgraph API["Express API :5000"]
        MW["Middlewares<br/>helmet, cors, cookies,<br/>auth, roles, upload"]
        Ctrl["Controllers<br/>auth, leave, approval, audit"]
        Utils["Utils<br/>leave rules, tokens,<br/>audit, files"]
        MW --> Ctrl --> Utils
    end

    Shared[["@elms/shared<br/>zod schemas, enums,<br/>leave policy, types"]]
    DB[("PostgreSQL<br/>Neon or Docker")]
    Disk[("uploads/<br/>documents")]

    Axios -- "/api/v1 + cookies" --> Vite
    Axios -- "/api/v1 + cookies" --> Nginx
    Vite --> MW
    Nginx --> MW
    Utils -- Prisma + pg adapter --> DB
    Utils --> Disk
    Shared -. imported by .-> UI
    Shared -. imported by .-> Ctrl
```

### Deployment options

| Mode | Command | What runs |
| --- | --- | --- |
| Development | `pnpm dev` | Vite on 5173 (proxies `/api`), Express via nodemon + tsx on 5000 |
| Production-style | `pnpm build && pnpm start` | `vite preview` on 5173, `node dist/index.js` on 5000 |
| Docker | `docker compose up --build -d` | `db` (Postgres 17), `backend` (runs migrations, then starts), `frontend` (nginx on 8080) |

```mermaid
flowchart LR
    User((User)) -->|http://localhost:8080| FE
    subgraph Compose["docker compose"]
        FE["frontend<br/>nginx: static build<br/>+ /api proxy"]
        BE["backend<br/>prisma migrate deploy<br/>then node dist/index.js"]
        PG[("db<br/>postgres:17")]
        FE -->|/api| BE
        BE --> PG
    end
    BE --- V1[("uploads volume")]
    PG --- V2[("pgdata volume")]
```

---

## 2. Backend request pipeline

Every request passes through the same chain. Controllers stay thin: they parse input with a shared zod schema and call helpers in `utils/leave.util.ts`, which holds the business rules (scoping, permissions, balance and overlap checks). **Anything thrown anywhere ends up in one error handler**, which turns it into a friendly JSON message. That includes zod, multer and Prisma errors. The same handler deletes any files multer already saved when a request fails.

```mermaid
flowchart TD
    Req([Incoming request]) --> G["Global middlewares<br/>trust proxy, cors, helmet,<br/>json 16kb, urlencoded, static, cookieParser"]
    G --> R{Route}
    R -->|/auth/login, /auth/register| RL[authRateLimiter] --> AC[auth.controller]
    R -->|/auth/refresh, /logout, /departments| AC
    R -->|/leaves/*| J1[verifyJWT]
    J1 -->|POST or PATCH with files| UP[uploadDocuments<br/>multer, 5 files x 5 MB] --> LC[leave.controller]
    J1 --> LC
    R -->|/approvals/*| J2[verifyJWT] --> RB["authorizeRoles<br/>MANAGER, HOD"] --> APC[approval.controller]
    R -->|/audit| J3[verifyJWT] --> AUC[audit.controller]
    R -->|anything else| NF[notFoundHandler]

    LC & APC & AUC & AC --> Z["zod schema.parse<br/>from @elms/shared"]
    Z --> U["utils: leave rules,<br/>tokens, audit, pagination"]
    U --> P[(Prisma to PostgreSQL)]
    U --> OK(["{ success: true, message, data }"])

    Z -. ZodError .-> EH
    U -. ApiError .-> EH
    UP -. MulterError .-> EH
    P -. Prisma error .-> EH
    NF --> EH
    EH["errorHandler<br/>delete uploaded files,<br/>map error to friendly message"] --> ERR(["{ success: false, message, errors[] }"])
```

---

## 3. Authentication & session refresh

- Login issues a **15-minute access token** and a **7-day refresh token**, both stored in **HTTP-only cookies**. JavaScript can't read them, which protects against XSS.
- The refresh token is stored in the database **hashed** (SHA-256) and is **rotated** on every refresh. Logging out clears it, so a stolen old refresh token stops working.
- When the access token expires, the axios interceptor calls `/auth/refresh` once, even if several requests failed at the same moment, and then retries the original request. The user never sees it happen.
- If the refresh also fails, Redux marks the session as expired and the route guards send the user to `/auth/login`.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as React app
    participant AX as axios interceptor
    participant API as Express
    participant DB as PostgreSQL

    U->>FE: Enter email + password
    FE->>FE: Validate with shared loginSchema
    FE->>API: POST /auth/login
    API->>DB: Find user, bcrypt.compare
    API->>DB: Save sha256(refresh token)
    API-->>FE: Set-Cookie accessToken (15m), refreshToken (7d)
    FE->>FE: Redux auth = authenticated, go to /dashboard

    Note over FE,API: 15 minutes later
    FE->>API: GET /leaves (expired access cookie)
    API-->>AX: 401
    AX->>API: POST /auth/refresh (refresh cookie)
    API->>DB: Compare hash, rotate token
    API-->>AX: New cookies
    AX->>API: Retry GET /leaves
    API-->>FE: 200 data

    Note over FE,API: Refresh token expired or revoked
    AX->>API: POST /auth/refresh
    API-->>AX: 401 and clear cookies
    AX->>FE: sessionExpired()
    FE->>U: Redirect to /auth/login
```

On page load, `main.tsx` dispatches `fetchMe()` (`GET /auth/me`). Until it answers, the guards show a loader instead of flashing the login page.

---

## 4. Data model

```mermaid
erDiagram
    Department ||--o{ User : has
    User ||--o{ User : "manages (managerId)"
    User ||--o{ LeaveRequest : applies
    User |o--o{ LeaveRequest : "reviews as manager"
    User |o--o{ LeaveRequest : "reviews as HOD"
    LeaveRequest ||--o{ LeaveDocument : attaches
    LeaveRequest ||--o{ LeaveComment : "timeline"
    User ||--o{ LeaveComment : writes
    User |o--o{ AuditLog : "actor"
    User |o--o{ AuditLog : "subject"

    Department {
        string id PK
        string name UK
    }
    User {
        string id PK
        string name
        string email UK
        string password "bcrypt hash"
        Role role "EMPLOYEE, MANAGER, HOD"
        string departmentId FK
        string managerId FK "stage-1 approver"
        string refreshToken "sha256 hash"
    }
    LeaveRequest {
        string id PK
        string employeeId FK
        LeaveType type "SICK, CASUAL, EARNED, UNPAID"
        date fromDate
        date toDate
        int days
        string reason
        LeaveStatus status
        boolean requiresHodApproval "days > 3"
        string managerId FK
        string managerComment
        datetime managerActionAt
        string hodId FK
        string hodComment
        datetime hodActionAt
    }
    LeaveDocument {
        string id PK
        string leaveId FK
        string originalName
        string storedName "uuid on disk"
        string mimeType
        int size
    }
    LeaveComment {
        string id PK
        string leaveId FK
        string authorId FK
        CommentKind kind
        string message
    }
    AuditLog {
        string id PK
        string action
        string entity
        string entityId
        json details
        string ipAddress
        string actorId FK
        string subjectId FK
    }
```

Notes:

- **The reporting line is `User.managerId`.** An employee points to their manager, a manager points to the HOD, and an HOD has none.
- **The HOD of a department** is whichever user has `role = HOD` and the same `departmentId`.
- **`LeaveComment` is the timeline**: system notes, approvals, rejections, info requests and replies. Both the employee and the reviewers see it.
- **`AuditLog.subjectId`** is the employee a log entry is about. It's used to scope who can see which logs.
- **Leave balances aren't stored.** They're calculated live from requests in `ACTIVE_STATUSES` against `LEAVE_POLICY`.

---

## 5. Leave lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING: Employee applies

    PENDING --> APPROVED: Manager approves (3 days or less)
    PENDING --> PENDING_HOD: Manager approves (more than 3 days)
    PENDING --> REJECTED: Manager rejects (comment required)
    PENDING --> INFO_REQUESTED: Manager asks for info
    PENDING --> CANCELLED: Employee cancels

    PENDING_HOD --> APPROVED: HOD approves
    PENDING_HOD --> REJECTED: HOD rejects (comment required)
    PENDING_HOD --> INFO_REQUESTED: HOD asks for info
    PENDING_HOD --> CANCELLED: Employee cancels

    INFO_REQUESTED --> PENDING: Employee replies (manager asked)
    INFO_REQUESTED --> PENDING_HOD: Employee replies (HOD asked)
    INFO_REQUESTED --> CANCELLED: Employee cancels

    APPROVED --> CANCELLED: Employee cancels before start date

    APPROVED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
```

| Status | Meaning | Counts against balance? | Colour |
| --- | --- | --- | --- |
| `PENDING` | Waiting for the manager | Yes (held) | Amber |
| `PENDING_HOD` | Manager approved, waiting for the HOD | Yes (held) | Violet |
| `INFO_REQUESTED` | A reviewer asked the employee for more information | Yes (held) | Sky |
| `APPROVED` | Final | Yes (taken) | Emerald |
| `REJECTED` | Final, with a reason | No | Rose |
| `CANCELLED` | Withdrawn by the employee | No | Slate |

When the employee replies to an info request, the request goes back to **whichever stage asked**. If `managerActionAt` is set, the manager has already approved, so the question came from the HOD and the request returns to `PENDING_HOD`.

Editing is only allowed while the request is `PENDING` and the manager hasn't acted on it yet.

---

## 6. Applying for leave

The same checks run twice: first in the browser for instant feedback (shared zod schema plus the document rule), then on the server, which is the source of truth.

```mermaid
flowchart TD
    A([Employee opens Apply Leave]) --> B["Fill type, from, to, reason<br/>attach documents (optional)"]
    B --> C{"Client check<br/>leaveRequestSchema"}
    C -- invalid --> B1["Inline field errors + warning toast"] --> B
    C -- "more than 3 days and no document" --> B2["Document required error"] --> B
    C -- ok --> D["POST /leaves<br/>multipart form + documents[]"]

    D --> E["multer: type PDF, PNG, JPG, WEBP<br/>max 5 MB each, max 5 files"]
    E -- bad file --> X
    E --> F{"Server zod check<br/>no past dates, to >= from,<br/>30 days max, reason 5-500"}
    F -- fail --> X
    F --> G{"Approver assigned?<br/>ensureApprover"}
    G -- "HOD, or department has no manager/HOD" --> X
    G --> H{"More than 3 days<br/>without a document?"}
    H -- yes --> X
    H -- no --> I{"Overlaps an active request?"}
    I -- yes --> X
    I -- no --> J{"Within yearly and<br/>monthly quota?"}
    J -- no --> X
    J -- yes --> K["Create LeaveRequest<br/>status PENDING<br/>requiresHodApproval = days > 3<br/>+ documents + system comment"]
    K --> L["Audit log LEAVE_CREATED"]
    L --> M(["201: toast, redirect to request page"])

    X["errorHandler: delete uploaded files,<br/>friendly message + field errors"] --> N(["Toast + inline errors on the form"])
```

**Leave policy** (`LEAVE_POLICY` in `packages/shared/src/constants.ts`):

| Type | Yearly | Monthly |
| --- | --- | --- |
| Sick | 12 | 3 |
| Casual | 12 | 2 |
| Earned | 18 | none |
| Unpaid | unlimited (tracked) | none |

Pending requests count as used, so an employee can't submit several pending requests that together exceed the quota. A request that spans two months or years is split per month and checked against each limit.

---

## 7. Two-level approval

Leaves of **more than 3 consecutive days** need a document plus approval from **both** the employee's manager and their department's HOD.

```mermaid
sequenceDiagram
    autonumber
    actor E as Employee
    actor M as Manager
    actor H as HOD
    participant API as Express API
    participant DB as PostgreSQL

    E->>API: POST /leaves (5 days + medical.pdf)
    API->>DB: LeaveRequest PENDING, requiresHodApproval = true
    API->>DB: AuditLog LEAVE_CREATED

    M->>API: GET /approvals/pending
    API-->>M: Requests from direct reports in PENDING
    M->>API: GET /leaves/:id/documents/:docId
    API->>DB: AuditLog DOCUMENT_VIEWED
    API-->>M: File stream (preview in modal)

    alt Manager needs more information
        M->>API: POST /approvals/:id/review REQUEST_INFO + comment
        API->>DB: status INFO_REQUESTED, comment INFO_REQUEST
        E->>API: POST /leaves/:id/respond message + new files
        API->>DB: status back to PENDING, comment INFO_RESPONSE
    end

    M->>API: POST /approvals/:id/review APPROVE
    API->>DB: managerId, managerActionAt, status PENDING_HOD
    API->>DB: AuditLog LEAVE_MANAGER_APPROVED

    H->>API: GET /approvals/pending
    API-->>H: Department requests in PENDING_HOD
    alt HOD approves
        H->>API: POST /approvals/:id/review APPROVE
        API->>DB: hodId, hodActionAt, status APPROVED
        API->>DB: AuditLog LEAVE_APPROVED
    else HOD rejects
        H->>API: POST /approvals/:id/review REJECT + reason
        API->>DB: status REJECTED
        API->>DB: AuditLog LEAVE_REJECTED
    end

    E->>API: GET /leaves/:id
    API-->>E: Status, approval stepper, timeline, comments
```

**Who can review what** (`canReviewLeave` in `utils/leave.util.ts`):

| Stage | Allowed reviewer |
| --- | --- |
| `PENDING` | Only the employee's own manager (`employee.managerId === reviewer.id`) |
| `PENDING_HOD` | Only an HOD in the employee's department |
| Any | Nobody can review their own leave |

If an HOD is someone's *direct* manager (for example, a manager's own leave), their single approval covers both stages.

The server works out the **permissions** (`canReview`, `canEdit`, `canCancel`, `canRespond`) and returns them with every leave. The frontend only shows the buttons the API would actually allow.

---

## 8. User flows by role

Every signed-in user is also an employee: managers and HODs can apply for leave too. Managers and HODs get extra **Team** pages, guarded on the frontend (`ProtectedRoute roles={REVIEWER_ROLES}`) **and** on the backend (`authorizeRoles`).

### 8.1 Site map and route guards

```mermaid
flowchart TD
    Start([Open the site]) --> Me{"GET /auth/me<br/>signed in?"}
    Me -- checking --> Loader[Full-page loader]
    Me -- no --> Login["/auth/login"]
    Me -- yes --> Dash["/dashboard"]

    Login <--> Signup["/auth/signup"]
    Login -- "success" --> Dash
    Signup -- "account created (EMPLOYEE)" --> Dash

    subgraph Everyone["All signed-in users"]
        Dash
        Apply["/leaves/apply"]
        History["/leaves"]
        Detail["/leaves/:id"]
        Edit["/leaves/:id/edit"]
        Audit["/audit"]
    end

    subgraph Reviewers["MANAGER and HOD only"]
        Approvals["/approvals"]
        Team["/approvals/history"]
    end

    Dash --> Apply & History & Audit
    Dash -- "reviewer strip" --> Approvals
    Apply -- submit --> Detail
    History -- row --> Detail
    Detail -- "canEdit" --> Edit --> Detail
    Approvals -- row --> Detail
    Team -- row --> Detail
    Audit -- "open request" --> Detail

    Employee([EMPLOYEE opens /approvals]) -. "ProtectedRoute redirect" .-> Dash
    Unknown([Unknown URL]) --> NotFound["404 ErrPage"]
```

### 8.2 Employee journey

```mermaid
flowchart LR
    S([Sign in or sign up]) --> D["Dashboard<br/>allowance, taken, pending,<br/>remaining, this month<br/>per-type cards, year filter"]
    D --> A["Apply Leave<br/>live day count,<br/>remaining balance hint,<br/>3+ day warning"]
    A --> R["Request page<br/>approval stepper,<br/>documents, timeline"]
    R --> W{Status}
    W -- PENDING --> E1["Edit or cancel"]
    W -- INFO_REQUESTED --> E2["Reply + attach files<br/>back to reviewer"]
    W -- PENDING_HOD --> E3["Wait or cancel"]
    W -- APPROVED --> E4["Balance updated<br/>cancel if not started"]
    W -- REJECTED --> E5["Read reason in timeline"]
    D --> H["Leave History<br/>filter by status, type,<br/>year, date range"]
    H --> R
    D --> L["Audit Logs<br/>own activity"]
```

### 8.3 Manager / HOD journey

```mermaid
flowchart LR
    S([Sign in]) --> D["Dashboard<br/>personal balance +<br/>team overview: awaiting me,<br/>waiting on employee,<br/>on leave today, team size"]
    D --> Q["Approvals queue<br/>sidebar badge with count<br/>search + filters"]
    Q --> R["Request page<br/>reason, documents preview,<br/>employee balance,<br/>timeline"]
    R --> P["Review panel<br/>comment box"]
    P -- Approve --> O1{"More than 3 days<br/>and reviewer is manager?"}
    O1 -- yes --> O2["PENDING_HOD<br/>goes to HOD queue"]
    O1 -- no --> O3["APPROVED"]
    P -- "Reject (comment required)" --> O4["REJECTED"]
    P -- "Ask info (comment required)" --> O5["INFO_REQUESTED<br/>waits on employee"]
    D --> T["Team History<br/>all statuses, search by employee"]
    T --> R
    D --> L["Audit Logs<br/>manager: own + reports<br/>HOD: whole department"]
```

**What each role sees:**

| Screen | Employee | Manager | HOD |
| --- | --- | --- | --- |
| Dashboard balances, apply, history | ✅ | ✅ | ✅ (HODs can't submit: no approver above them) |
| Approvals queue | — | Direct reports in `PENDING` | Direct reports in `PENDING` + department in `PENDING_HOD` |
| Team history | — | Direct reports | Whole department |
| Audit logs | Own records | Own + direct reports | Whole department |
| View documents | Own requests | Reports' requests | Department requests |

---

## 9. Frontend structure

```mermaid
flowchart TD
    Main["main.tsx<br/>Redux Provider, AppToaster,<br/>dispatch fetchMe"] --> App["App.tsx<br/>react-router routes"]
    App --> Guards["RouteGuards<br/>ProtectedRoute, GuestRoute"]
    Guards --> AuthLayout["AuthLayout<br/>Login, Signup"]
    Guards --> AppLayout["AppLayout<br/>sidebar, breadcrumbs,<br/>mobile drawer"]
    AppLayout --> Pages["pages/<br/>Dashboard, ApplyLeave, MyLeaves,<br/>LeaveDetail, Approvals,<br/>TeamHistory, AuditLogs"]

    Pages --> LeaveComp["components/leave<br/>LeaveForm, LeaveTable, LeaveFilters,<br/>BalanceCards, ApprovalProgress,<br/>ReviewPanel, InfoResponseForm,<br/>DocumentList, LeaveTimeline"]
    LeaveComp --> UIComp["components/ui<br/>Button, Field, PasswordInput, Card,<br/>Badge, Modal, Pagination,<br/>FileDropzone, SegmentedTabs, CountUp"]

    Pages --> Hook["hooks/useLeaveList<br/>filters + pagination + loading"]
    Hook --> Services
    Pages --> StoreN["store/<br/>auth.slice: user, status<br/>leave.slice: balance, reviewerStats"]
    StoreN --> Services["services/<br/>api.service: axios + refresh<br/>auth.service, leave.service"]
    Pages --> Toast["UI/Toast.tsx<br/>notify.success / error / apiError"]
    Services --> Shared[["@elms/shared"]]
    LeaveComp --> Shared
```

What lives where:

- **Redux** holds only data that several screens share: the signed-in user, the leave balance (dashboard, apply form), and the reviewer counters (sidebar badge, dashboard). Page-specific data, such as a leave's detail or a list page, stays in local state or in `useLeaveList`.
- **`useLeaveList`** is one hook behind every filterable list (My history, Approvals, Team history). Changing a filter resets the page to 1.
- **`constants/ui.constants.ts`** holds the colour maps for each status and leave type, plus the navigation config, so colour coding is consistent everywhere.
- **`utils/format.util.ts`** has `validateWith()` (runs a shared zod schema and returns field errors) and `getErrorMessage()`/`getFieldErrors()` (read the API's friendly error format).
