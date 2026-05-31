# B2B Frozen Goods Order Monitoring System

## Overview

An enterprise-grade web application for managing B2B frozen food distribution operations. The system provides end-to-end order lifecycle management — from customer and article catalogue maintenance through order placement, fulfilment tracking, and physical label printing — with a role-based access model and real-time analytics dashboard.

---

## Features

- **Customer Management** — Create and maintain B2B customer profiles, contact details, and delivery addresses
- **Article Management** — Manage frozen-goods catalogue with SKUs, storage temperatures, and stock status
- **Order Management** — Full order lifecycle: Pending, Confirmed, Preparing, Ready for Pickup, Picked Up, Cancelled
- **Label Printing** — Generate A6 PDF labels and 4×6 thermal labels with embedded QR codes for every order
- **Dashboard Analytics** — Real-time KPIs, order-volume trends, top customers, and most-ordered articles charts
- **Role-Based Authentication** — JWT-secured endpoints with Administrator and Staff permission levels
- **Audit Trail** — Timestamped change history on orders, customers, and articles
- **CSV Import / Export** — Bulk-import articles and customers via CSV; export any list
- **Search & Filter** — Full-text search and multi-faceted filtering across all major entities

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Table, Recharts, React Router v6 |
| **Backend** | Node.js 20, Express, TypeScript, Prisma ORM, Zod, jsonwebtoken, bcryptjs |
| **Database** | [Supabase](https://supabase.com) (hosted PostgreSQL) |
| **Label Generation** | PDFKit, qrcode |
| **Infrastructure** | Docker, Docker Compose, nginx (reverse proxy + static serving) |

---

## Prerequisites

- **Node.js 18+**
- **A free [Supabase](https://supabase.com) account and project**
- **Docker & Docker Compose** — only needed for containerised deployment

---

## Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Once the project is ready, open **Project Settings → Database → Connection string**.
3. Copy the **Connection pooling** string (port `6543`) — this is your `DATABASE_URL`.
4. Copy the **Direct connection** string (port `5432`) — this is your `DIRECT_URL`.

Both strings have the format:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:[port]/postgres
```

Add `?pgbouncer=true` to the end of `DATABASE_URL` (port 6543 only).

---

## Quick Start with Docker

```bash
# Navigate to the project root
cd b2b

# Copy environment files
cp backend/.env.example backend/.env

# Fill in your real Supabase credentials in backend/.env
# DATABASE_URL = pooled connection (port 6543, ?pgbouncer=true)
# DIRECT_URL   = direct connection (port 5432)

# Build images and start all services
docker-compose up -d
```

The application will be available at **http://localhost:3000**

To seed the database with sample data:
```bash
docker exec -it b2b_backend npx ts-node prisma/seed.ts
```

---

## Development Setup (Without Docker)

### 1. Configure the backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL and DIRECT_URL to your Supabase connection strings
```

### 2. Run Prisma migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Seed sample data

```bash
npx ts-node prisma/seed.ts
```

### 4. Start the API server

```bash
npm run dev    # → http://localhost:3001
```

### 5. Start the frontend (separate terminal)

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:3001/api (default — no change needed for local dev)
npm run dev    # → http://localhost:5173
```

---

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Administrator |
| `staff` | `staff123` | Staff |

> Change these immediately in any environment exposed to a network.

---

## Project Structure

```
b2b/
├── backend/                  # Node.js + Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (Prisma)
│   │   └── seed.ts           # Sample data seed script
│   ├── src/
│   │   ├── controllers/      # Route handler logic
│   │   ├── services/         # Business logic layer
│   │   ├── routes/           # Express router definitions
│   │   ├── middleware/       # Auth, validation, error handling
│   │   └── utils/            # JWT, CSV, PDF, audit log helpers
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   └── .env.example
├── frontend/                 # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page-level route components
│   │   ├── store/            # Zustand state slices
│   │   ├── lib/              # Axios API client, utilities
│   │   └── types/            # Shared TypeScript types
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .env.example
├── docker-compose.yml        # Production compose (backend + frontend)
├── docker-compose.dev.yml    # Dev compose (containerised backend only)
├── .gitignore
└── README.md
```

---

## API Documentation

All endpoints are prefixed with `/api`. Authentication is required (Bearer JWT) unless noted.

| Module | Method | Path | Description |
|--------|--------|------|-------------|
| Auth | POST | `/api/auth/login` | Obtain JWT (public) |
| Auth | POST | `/api/auth/logout` | Invalidate session |
| Auth | GET | `/api/auth/me` | Current user profile |
| Auth | POST | `/api/auth/change-password` | Change own password |
| Customers | GET | `/api/customers` | List / search customers |
| Customers | POST | `/api/customers` | Create customer |
| Customers | GET | `/api/customers/:id` | Get customer detail |
| Customers | PUT | `/api/customers/:id` | Update customer |
| Customers | DELETE | `/api/customers/:id` | Soft-delete customer |
| Customers | GET | `/api/customers/export` | Export customers as CSV |
| Articles | GET | `/api/articles` | List / search articles |
| Articles | POST | `/api/articles` | Create article |
| Articles | PUT | `/api/articles/:id` | Update article |
| Articles | DELETE | `/api/articles/:id` | Soft-delete article |
| Articles | POST | `/api/articles/import` | Bulk import via CSV |
| Articles | GET | `/api/articles/export` | Export articles as CSV |
| Orders | GET | `/api/orders` | List orders with filters |
| Orders | POST | `/api/orders` | Create order |
| Orders | GET | `/api/orders/:id` | Get order with items |
| Orders | PUT | `/api/orders/:id` | Update order |
| Orders | DELETE | `/api/orders/:id` | Soft-delete order |
| Orders | POST | `/api/orders/:id/duplicate` | Duplicate order |
| Orders | GET | `/api/orders/:id/timeline` | Audit timeline |
| Orders | PATCH | `/api/orders/:id/status` | Update status only |
| Labels | POST | `/api/labels/generate` | Generate PDF (A6 / Thermal) |
| Labels | GET | `/api/labels/order/:orderId` | List labels for order |
| Dashboard | GET | `/api/dashboard/stats` | Summary KPIs |
| Dashboard | GET | `/api/dashboard/charts` | Chart data |
| Health | GET | `/health` | Liveness probe (public) |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase pooled connection string (port `6543`, append `?pgbouncer=true`). Used by the app at runtime. |
| `DIRECT_URL` | Supabase direct connection string (port `5432`). Used by Prisma for migrations. |
| `JWT_SECRET` | Secret key used to sign JWTs. **Must be changed in production.** |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `24h`, `7d`. |
| `PORT` | HTTP port the Express server listens on (default `3001`). |
| `NODE_ENV` | `development` or `production`. |
| `FRONTEND_URL` | Allowed CORS origin (e.g. `http://localhost:5173` in dev, your domain in prod). |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL for all API requests. Use `http://localhost:3001/api` for local dev. Set to `/api` in Docker (nginx proxies). |

---

## Database Schema

The schema is defined in `backend/prisma/schema.prisma` and managed via Prisma Migrate against Supabase.

| Table | Description |
|-------|-------------|
| `User` | Application accounts with hashed passwords and roles (ADMIN / STAFF) |
| `Customer` | B2B customer organisations with contact and address details |
| `Article` | Frozen-goods product catalogue with storage temperatures and carton info |
| `Order` | Order header: customer, pickup date/time, status, notes |
| `OrderItem` | Line items per order: article, quantity, carton calculation |
| `Label` | Label generation records (size, PDF path) |
| `AuditLog` | Append-only log of every create / update / delete action |

---

## Label Printing

The label printing subsystem generates PDF documents using **PDFKit** with **qrcode** for QR code embedding.

- **A6 (105 × 148 mm)** — Standard shipping label for desktop printers. Contains customer number, org name, contact, pickup date/time, order number, all items, and a QR code.
- **Thermal 4×6 (101.6 × 152.4 mm)** — Optimised for direct thermal label printers (Zebra, Dymo). Same content, narrower layout.

Labels are generated on-demand via `POST /api/labels/generate` and streamed back as `application/pdf`. Multiple orders can be batched into a single PDF.

---

## Docker Commands

```bash
# Start all services in the background
docker-compose up -d

# View live logs
docker-compose logs -f

# View logs for backend only
docker-compose logs -f backend

# Stop all services
docker-compose down

# Rebuild backend image after code changes
docker-compose build backend && docker-compose up -d backend

# Open a shell in the backend container
docker exec -it b2b_backend sh

# Run Prisma Studio (DB browser)
docker exec -it b2b_backend npx prisma studio
```

---

## Backup

Supabase provides automatic daily backups on paid plans. For manual backups use the Supabase dashboard (**Project Settings → Database → Backups**) or the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Export a SQL dump (requires Supabase CLI login)
supabase db dump -p [db-password] --db-url "[DIRECT_URL]" > backup.sql
```

---

## License

MIT
