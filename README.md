# 🍽️ DineSpot — Multi-Restaurant Discovery & Booking Platform

> A production-ready monorepo for **DineSpot** — an app where users discover nearby restaurants, check real-time seat availability, book buffets, and reserve event halls.

---

## 🗺️ Monorepo Structure

```
dinespot/
├── apps/
│   ├── api/          @dinespot/api     Fastify 4 + Prisma 5 + PostgreSQL/PostGIS
│   ├── web/          @dinespot/web     Next.js 14 (App Router)
│   └── mobile/       @dinespot/mobile  Expo 51 / React Native
├── packages/
│   ├── types/        @dinespot/types   Shared TypeScript types (12 domain files)
│   ├── ui/           @dinespot/ui      Shared React components
│   ├── utils/        @dinespot/utils   Typed API client + helpers
│   └── tsconfig/     @dinespot/tsconfig  Shared TS configs
├── infra/
│   ├── docker/       docker-compose + PostGIS init scripts
│   └── github/       CI/CD workflows
├── .env.example
├── pnpm-workspace.yaml
└── turbo.json
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm@9`)
- Docker Desktop

### 2. Install dependencies
```bash
pnpm install
```

### 3. Set up environment
```bash
cp .env.example .env
# Edit .env with your secrets
```

### 4. Start local infrastructure
```bash
pnpm docker:up
# PostgreSQL+PostGIS on :5432, Redis on :6379
```

### 5. Run database migrations + seed
```bash
pnpm --filter=@dinespot/api db:migrate
# Enter migration name: init_dinespot_schema

pnpm --filter=@dinespot/api db:seed
# Seeds 3 restaurants, 26 tables, 5 buffet sessions, 3 event halls
```

### 6. Start all apps
```bash
pnpm dev
# API   → http://localhost:4000
# Docs  → http://localhost:4000/docs
# Web   → http://localhost:3000
```

---

## 🐳 Docker Services

| Service | URL | Credentials |
|---|---|---|
| PostgreSQL + PostGIS | `localhost:5432` | `dinespot` / `dinespot_secret` |
| Redis | `localhost:6379` | none |
| pgAdmin 4 | http://localhost:5050 | `admin@dinespot.local` / `admin` |
| RedisInsight | http://localhost:8001 | — |

Start with GUI tools:
```bash
docker compose -f infra/docker/docker-compose.yml --profile tools up -d
```

---

## 🗄️ Database Schema (Prisma)

| Model | Table | Purpose |
|---|---|---|
| `User` | `users` | Customers, owners, admins |
| `Restaurant` | `restaurants` | Core venue data + geo coords |
| `OperatingHours` | `operating_hours` | Per-day open/close times |
| `Table` | `tables` | Bookable tables by section/capacity |
| `BuffetSession` | `buffet_sessions` | Breakfast/Lunch/Dinner sessions |
| `EventHall` | `event_halls` | Rentable halls with amenities |
| `Booking` | `bookings` | Unified booking (table/buffet/hall) |
| `Review` | `reviews` | Verified post-booking reviews |
| `Notification` | `notifications` | In-app notification feed |

---

## 🔌 API Endpoints

### Auth — `/api/v1/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Create account |
| POST | `/login` | — | Email + password login |
| POST | `/refresh` | — | Refresh access token |
| GET | `/me` | ✅ | Get current user |
| POST | `/logout` | ✅ | Invalidate session |
| POST | `/forgot-password` | — | Send reset email |
| POST | `/reset-password` | — | Apply new password |

### Restaurants — `/api/v1/restaurants`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Search + filter restaurants |
| GET | `/nearby?lat=&lng=` | — | PostGIS radius search |
| GET | `/slug/:slug` | — | Full detail by slug |
| GET | `/:id` | — | Full detail by ID |
| GET | `/:id/reviews` | — | Paginated reviews |
| GET | `/:id/availability` | — | Table/buffet slot availability |

### Bookings — `/api/v1/bookings`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ | Create booking (table/buffet/hall) |
| GET | `/me` | ✅ | My bookings (paginated) |
| GET | `/:id` | ✅ | Booking detail |
| PATCH | `/:id/cancel` | ✅ | Cancel booking |

### Reviews — `/api/v1/reviews`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ | Create review |
| POST | `/:id/helpful` | ✅ | Mark helpful |
| POST | `/:id/reply` | ✅ Owner | Owner reply |
| DELETE | `/:id` | ✅ | Delete own review |

---

## 📦 Shared Packages

### `@dinespot/types`
12 domain type files covering every entity, DTO, and API wrapper.
```ts
import type { Restaurant, Booking, CreateBookingDto } from "@dinespot/types";
```

### `@dinespot/utils`
Typed API client with JWT auto-refresh + helpers.
```ts
import { restaurantApi, bookingApi, formatINR, haversineKm } from "@dinespot/utils";

const restaurants = await restaurantApi.search({ city: "Mumbai", hasBuffet: true });
const booking = await bookingApi.create({ ... });
```

---

## 🛠️ All Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in parallel |
| `pnpm build` | Build all workspaces |
| `pnpm lint` | ESLint all workspaces |
| `pnpm typecheck` | TypeScript check all workspaces |
| `pnpm docker:up` | Start Postgres + Redis |
| `pnpm docker:reset` | Wipe volumes and restart |
| `pnpm --filter=@dinespot/api db:migrate` | Create + apply DB migration |
| `pnpm --filter=@dinespot/api db:seed` | Seed sample data |
| `pnpm --filter=@dinespot/api db:studio` | Open Prisma Studio |
| `pnpm --filter=@dinespot/api db:reset` | Drop, remigrate, reseed |

---

## 🌱 Seed Data

| Restaurant | City | Cuisine | Tables | Buffets | Hall |
|---|---|---|---|---|---|
| Spice Garden | Mumbai | North Indian | 9 | Lunch + Dinner | Grand Pavilion (300 pax, ₹1.5L/day) |
| The Sushi Loft | Bangalore | Japanese | 8 | Lunch | Sakura Lounge (40 pax, ₹80K/day) |
| Terra Verde | Delhi | Continental Veg | 9 | Brunch + Dinner | Greenhouse Terrace (120 pax, ₹95K/day) |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| API | Fastify 4 + Prisma 5 + Zod |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Cache / Queue | Redis 7 + BullMQ |
| Web | Next.js 14 App Router + Tailwind CSS |
| Mobile | Expo 51 + React Native |
| Auth | JWT (access + refresh) |
| Payments | Stripe |
| Storage | AWS S3 / Cloudinary |
| CI/CD | GitHub Actions |

---

## 📋 Environment Variables

Copy `.env.example` → `.env` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Min 32 chars |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars |
| `COOKIE_SECRET` | ✅ | Min 32 chars |
| `STRIPE_SECRET_KEY` | Payments | `sk_test_...` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Map UI | Mapbox access token |
| `RESEND_API_KEY` | Email | Transactional email |

Full list with descriptions: [`.env.example`](./.env.example)

---

## 🚀 What to Build Next

- [ ] Drizzle-style Prisma middleware for soft-delete
- [ ] Stripe payment intent creation on booking
- [ ] BullMQ jobs: booking reminders, review prompts
- [ ] Next.js pages: home, search, restaurant detail, booking flow
- [ ] Expo screens: HomeScreen, MapScreen, BookingScreen
- [ ] `@dinespot/ui` component library: Button, Card, StarRating, DatePicker
- [ ] WebSocket / SSE for real-time seat availability updates

---

*Built with ❤️ using pnpm workspaces + Turborepo*
