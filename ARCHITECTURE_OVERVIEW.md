# Serenity Spa Booking Backend — Architecture Overview

## 1. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20 (LTS) + TypeScript 5.7 | Type-safe server-side execution |
| **Framework** | Express 4.21 | HTTP routing & middleware pipeline |
| **Database ORM** | Prisma 5.22 + PostgreSQL 16 (Alpine) | Data access, migrations, type-safe queries |
| **Cache / Queue Broker** | Redis 7 (Alpine) + BullMQ 5.12 | Background job queue + rate-limit store |
| **Validation** | Zod 3.24 | Request body parsing & validation |
| **Logging** | Pino 9.5 + pino-pretty | Structured JSON logging |
| **Email** | Nodemailer 6.9 + Mailtrap (dev) / SMTP (prod) | Transactional email delivery |
| **Testing** | Vitest 2.1 + Supertest 7 | Unit & integration testing |
| **Security** | Helmet 8, CORS, express-rate-limit 7, rate-limit-redis | HTTP hardening, cross-origin, rate limiting |
| **Containerization** | Docker + Docker Compose | Service orchestration (postgres, redis, app) |

---

## 2. System Architecture (High-Level)

```mermaid
graph TB
    Client["Client<br/>(Web App / Mobile)"]
    LB["Load Balancer / Proxy"]
    subgraph "API Server (Node.js 20 + Express)"
        MW["Middleware Pipeline"]
        RT["Router: /api/v1/bookings"]
        CTRL["BookingController"]
        SVC["BookingService"]
        REPO["BookingRepository"]
        VAL["Zod Validation"]
    end
    subgraph "Data Layer"
        PG[("PostgreSQL 16<br/>spa_bookings")]
        RD[("Redis 7<br/>Queues + Rate Limit")]
    end
    subgraph "Background Workers"
        WKR["BullMQ Worker<br/>emailWorker.ts"]
        Q["BullMQ Queue<br/>email-queue"]
    end
    subgraph "External"
        SMTP["SMTP Provider<br/>(Mailtrap / SendGrid)"]
    end

    Client --> LB --> MW
    MW --> RT
    RT --> VAL --> CTRL
    CTRL --> SVC
    SVC --> REPO
    REPO --> PG
    SVC --> Q
    Q --> WKR
    WKR --> SMTP
    SMTP -->|Customer Email| Client
    SMTP -->|Admin Notification| Admin["Admin Inbox"]
```

---

## 3. Directory Structure & Module Map

```mermaid
graph TD
    subgraph "src/"
        ENTRY["server.ts<br/>Entry point"]
        APP["app.ts<br/>Express app setup"]
        CFG["config/env.ts<br/>Zod-validated env"]
        DB["database/prisma.ts<br/>PrismaClient singleton"]
        MID["middleware/<br/>errorHandler, rateLimiter,<br/>requestId, requestLogger,<br/>security, validate"]
        SH["shared/<br/>errors.ts, logger.ts, response.ts"]
        UT["utils/<br/>email.ts, sanitize.ts"]
        MOD["modules/"]
        WK["workers/<br/>emailQueue.ts, emailWorker.ts"]
    end
    subgraph "modules/bookings/"
        TYPES["booking.types.ts<br/>Enums & interfaces"]
        SCHEMA["booking.schema.ts<br/>Zod validation + sanitization"]
        CTRL["booking.controller.ts<br/>Request handler"]
        SVC["booking.service.ts<br/>Business logic"]
        REPO["booking.repository.ts<br/>Prisma queries"]
        ROUTES["booking.routes.ts<br/>DI wiring + route def"]
    end
    ENTRY --> APP
    APP --> CFG
    APP --> MID
    APP --> MOD
    ENTRY --> DB
    ENTRY --> WK
    MID --> SH
    MOD --> ROUTES
    ROUTES --> CTRL --> SVC --> REPO
    ROUTES --> SCHEMA
    SVC --> WK
    SVC --> SH
```

---

## 4. Middleware Pipeline (Request Lifecycle)

```mermaid
sequenceDiagram
    participant C as Client
    participant RID as requestId
    participant SEC as security (helmet+cors)
    participant JSN as express.json
    participant LOG as requestLogger
    participant RL as rateLimiter (global)
    participant BRL as bookingLimiter
    participant VAL as validate (Zod)
    participant CTRL as BookingController
    participant SVC as BookingService
    participant REPO as BookingRepository
    participant PG as PostgreSQL
    participant Q as BullMQ Queue
    participant WK as Email Worker

    C->>RID: POST /api/v1/bookings
    RID->>SEC: Add x-request-id
    SEC->>JSN: Helmet headers + CORS check
    JSN->>LOG: Parse JSON body (1mb limit)
    LOG->>RL: Log request start
    RL->>BRL: Check global rate limit
    BRL->>VAL: Check booking rate limit (5/15min)
    VAL->>CTRL: Parse + sanitize body via Zod
    CTRL->>SVC: createBooking(validatedBody)
    SVC->>REPO: checkDuplicate(email, date, time, experience)
    REPO->>PG: SELECT … WHERE NOT CANCELLED
    PG-->>REPO: result
    alt Duplicate exists
        REPO-->>SVC: true
        SVC-->>CTRL: throw AppError 409
        CTRL-->>C: 409 DUPLICATE_BOOKING
    else No duplicate
        REPO-->>SVC: false
        SVC->>REPO: create({...input, referenceId})
        REPO->>PG: INSERT INTO bookings
        PG-->>REPO: new Booking
        SVC->>Q: emailQueue.add(send-booking-confirmation)
        Q-->>WK: Process job
        WK->>WK: sendEmail(customer confirmation)
        WK->>WK: sendEmail(admin notification)
        SVC-->>CTRL: { success, message, bookingReference }
        CTRL-->>C: 201 { success, bookingReference }
    end
```

---

## 5. Database Schema

```mermaid
erDiagram
    Booking {
        int id PK
        string referenceId UK "SPA-YYYYY-XXXXXX"
        string firstName "VarChar(50)"
        string lastName "VarChar(50)"
        string email "VarChar(255)"
        string phone "VarChar(50)"
        string experience "VarChar(100)"
        date bookingDate
        string bookingTime "VarChar(10) HH:mm"
        string location "VarChar(255)"
        string therapistPreference "VarChar(50)"
        string notes "Text, nullable"
        enum status "PENDING | CONFIRMED | CANCELLED | COMPLETED"
        datetime createdAt
        datetime updatedAt
    }
```

**Status Lifecycle:**

```mermaid
stateDiagram-v2
    [*] --> PENDING : Booking created
    PENDING --> CONFIRMED : Concierge confirms
    PENDING --> CANCELLED : Customer cancels
    CONFIRMED --> COMPLETED : Service rendered
    CONFIRMED --> CANCELLED : Cancellation before service
    COMPLETED --> [*]
    CANCELLED --> [*]
```

---

## 6. Critical Business Logic

### 6.1 Booking Creation (`booking.service.ts:8-33`)

1. **Duplicate detection** — Looks for an existing non-cancelled booking with the same email, date, time, and experience. Returns `409 DUPLICATE_BOOKING` if found.
2. **Reference ID generation** — Uses `nanoid` with a custom alphabet (A-Z, 0-9, 6 chars) prefixed by `SPA-{year}-`. Example: `SPA-2026-X7K9M2`.
3. **DB insert** — Persists the booking with `PENDING` status in PostgreSQL via Prisma.
4. **Async email dispatch** — Enqueues a BullMQ job to `email-queue`. The worker sends:
   - Customer confirmation email with booking details
   - Admin notification email to `EMAIL_ADMIN`
5. **Idempotent response** — Returns `{ success: true, message, bookingReference }`.

### 6.2 Validation Pipeline (`booking.schema.ts`)

- **XSS prevention** — `sanitizeInput` strips HTML tags and `javascript:` URIs from `firstName`, `lastName`, `location`, and `notes`.
- **Date constraint** — Booking date must be **tomorrow or later** (same-day booking not allowed).
- **Time format** — Strict `HH:mm` regex matching 24-hour format.
- **Experience whitelist** — Enum of 11 predefined spa experiences.
- **Therapist preference** — Enum of 5 options including free-text fallback.

### 6.3 Rate Limiting (`middleware/rateLimiter.ts`)

| Limiter | Window | Max Requests | Redis Prefix |
|---------|--------|-------------|--------------|
| `apiLimiter` | `RATE_LIMIT_WINDOW_MS` (default 15 min) | `RATE_LIMIT_MAX_REQUESTS` (default 100) | `rl:api:` |
| `bookingLimiter` | 15 min | 5 | `rl:booking:` |

Falls back to in-memory store if Redis is unavailable.

### 6.4 Error Handling (`middleware/errorHandler.ts`)

- **AppError** — Custom error class with `code`, `message`, and `statusCode`. Supports optional `fieldErrors` for validation details.
- **Async handler** — Wraps async route handlers to forward rejected promises to Express `next()`.
- **Format** — All errors return `{ success: false, error: { code, message } }` with optional `fields` map for validation errors.

### 6.5 Email Worker (`workers/emailWorker.ts`)

- Uses BullMQ with exponential backoff (3 attempts, 2s initial delay).
- Sends two emails per job: customer confirmation + admin notification.
- Silently skips sending in test environment or when no SMTP transport is configured.

---

## 7. Configuration & Environment

All environment variables are validated at startup via Zod schema in `src/config/env.ts:7-30`. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | HTTP server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_URL` | — | Redis connection string |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed origins |
| `RATE_LIMIT_WINDOW_MS` | 900000 | Rate limit window in ms |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | — | Email transport credentials |
| `EMAIL_FROM` / `EMAIL_ADMIN` | — | Sender and admin recipient addresses |
| `LOG_LEVEL` | `info` | Pino log level |

---

## 8. Deployment Architecture

```mermaid
graph LR
    subgraph "Docker Compose (single host or VPS)"
        PG[("PostgreSQL 16<br/>:5432")]
        RD[("Redis 7<br/>:6379")]
        APP["App Container<br/>:4000"]
    end
    subgraph "Build Process"
        B1["npm ci"]
        B2["npx prisma generate"]
        B3["tsc build"]
        B4["Multi-stage Docker build<br/>→ slim production image"]
    end
    APP --> PG
    APP --> RD
    B1 --> B2 --> B3 --> B4
```

**Startup sequence** (`entrypoint.sh`):
1. Check file structure and env vars
2. Run `prisma migrate deploy` (or `prisma db push` if no migrations exist)
3. Start `node dist/server.js`

---

## 9. Known Constraints & Considerations

| Constraint | Impact | Mitigation |
|-----------|--------|------------|
| **No auth/authz** | Public booking endpoint — anyone can create bookings without authentication | Rate limiting, duplicate detection, CORS whitelist |
| **No user accounts** | No customer login, profile, or booking history retrieval | Booking reference ID is the only identifier returned |
| **Single module** | Only `bookings` module exists; no service catalog, staff management, or payment processing | Future modules can follow the same controller-service-repository pattern |
| **No migration files in repo** | `prisma/migrations/` directory absent; `entrypoint.sh` falls back to `prisma db push` | Would lose schema history; should generate initial migration with `prisma migrate dev` |
| **No TLS termination** | Docker Compose exposes app directly on :4000 without HTTPS | Should add reverse proxy (nginx/Caddy/Traefik) for production TLS |
| **Same-day bookings disabled** | `date >= tomorrow` validation constraint | Business rule — could be made configurable |
| **Redis as single point of failure** | Rate limits and email queue both depend on Redis | In-memory fallback for rate limiting; BullMQ retries handle brief outages |
| **Email is best-effort only** | No retry queue dead-letter handling, no webhook confirmation | BullMQ attempts 3 retries with exponential backoff |
| **No API versioning prefix** | Routes use `/api/v1/bookings` hardcoded | Version segment is present but no version negotiation/header support |
| **No request body size limit** | `express.json({ limit: '1mb' })` limits JSON body to 1MB | Adequate for current use case |
| **Database enum vs Prisma enum** | `BookingStatus` is a Prisma enum mapped to PostgreSQL enum | Adding new statuses requires migration |

---

## 10. Testing Strategy

```mermaid
graph TD
    subgraph "Integration Tests (Vitest + Supertest)"
        T1["POST /api/v1/bookings<br/>→ 201 + reference"]
        T2["Duplicate payload<br/>→ 409"]
        T3["Past date<br/>→ 400 VALIDATION_ERROR"]
        T4["Invalid experience<br/>→ 400 VALIDATION_ERROR"]
        T5["HTML injection in name<br/>→ 201 (sanitized)"]
    end
    T1 -->|Setup| S["tests/setup.ts<br/>TRUNCATE bookings<br/>beforeAll"]
    T1 -->|Teardown| D["afterAll<br/>prisma.$disconnect"]
```

Tests truncate the bookings table before each run and currently cover: happy-path creation, duplicate detection, date validation, enum validation, and XSS sanitization.

---

## 11. Key Metrics & Performance

- **Database** — Single table `bookings`; no indexes beyond the auto-generated PK on `id` and unique on `reference_id`. The `checkDuplicate` query scans for `email + booking_date + booking_time + experience + NOT CANCELLED` — a composite index on these columns would improve performance at scale.
- **Queue** — BullMQ with Redis provides at-least-once delivery; each booking creates exactly one queue job.
- **Memory** — PrismaClient is a singleton; Pino logging is async; middleware is synchronous.
- **Concurrency** — Node.js event loop handles all requests; rate limiting prevents abuse; database connection pool managed by Prisma.

---

*Generated from codebase analysis — Sun May 31 2026*
