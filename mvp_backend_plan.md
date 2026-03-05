# Phase 1 - MVP (Revenue Engine)

This document outlines the architecture and implementation plan for the Snooker SaaS Backend MVP, focusing on core revenue tracking, table management, and basic RBAC.

## Setup and Infrastructure
- Use **Supabase** (PostgreSQL + Auth + Storage + Realtime).
- Use **Node.js with Express / Hono / Fastify** or equivalent for custom business logic, or rely heavily on Supabase Edge Functions / Postgres RLS where appropriate. Given the requirements (custom endpoints, strict backend calculation rules), a dedicated backend or Edge Functions are recommended.
- Database ORM/Query Builder: Prisma or Drizzle (or Supabase JS Client for direct DB interaction).

## Database Schema (PostgreSQL)

### 1. auth.users (Supabase handled) & public.profiles
- Supabase manages authentication. We'll extend it with a `profiles` or `users` table linked via foreign key.
- `id` (uuid, primary key, references auth.users)
- `email` (string)
- `phone` (string)
- `full_name` (string)
- `role` (enum: ADMIN, STORE_OWNER, STAFF, PLAYER)

### 2. stores & branches
- **stores**
  - `id` (uuid, primary key)
  - `owner_id` (uuid, references profiles.id)
  - `name` (string)
  - `created_at` (timestamp)
- **branches**
  - `id` (uuid, primary key)
  - `store_id` (uuid, references stores)
  - `name` (string)
  - `address` (text)

### 3. tables
- `id` (uuid, primary key)
- `branch_id` (uuid, references branches)
- `name_or_number` (string)
- `status` (enum: AVAILABLE, OCCUPIED, MAINTENANCE)

### 4. pricing_rules
- `id` (uuid, primary key)
- `branch_id` (uuid, references branches)
- `day_of_week` (int 0-6 or array of ints)
- `start_time` (time)
- `end_time` (time)
- `hourly_rate` (numeric)

### 5. sessions (Core Engine)
- `id` (uuid, primary key)
- `table_id` (uuid, references tables)
- `started_at` (timestamp)
- `ended_at` (timestamp, null initially)
- `status` (enum: ACTIVE, PAUSED, COMPLETED, CANCELLED)
- `hourly_rate_applied` (numeric - locked in at start)
- `paused_duration_seconds` (integer, default 0)
- `duration_minutes` (integer, calculated at end)
- `total_amount` (numeric, calculated at end)

### 6. session_pauses (Sub-tracking)
- `id` (uuid, primary key)
- `session_id` (uuid, references sessions)
- `paused_at` (timestamp)
- `resumed_at` (timestamp, null until resumed)

### 7. session_players
- `session_id` (uuid, references sessions, composite PK)
- `player_id` (uuid, references profiles, composite PK)
- `split_percentage` (numeric, default 100 or divided equally)

### 8. payments
- `id` (uuid, primary key)
- `session_id` (uuid, references sessions)
- `payer_id` (uuid, references profiles)
- `amount` (numeric)
- `method` (enum: CASH, UPI, CARD, WALLET)
- `status` (enum: SUCCESS, FAILED, PENDING)
- `created_at` (timestamp)

### 9. dues
- `id` (uuid, primary key)
- `session_id` (uuid, references sessions)
- `player_id` (uuid, references profiles)
- `amount` (numeric)
- `status` (enum: PENDING, SETTLED)
- `created_at` (timestamp)

### 10. wallet_transactions
- `id` (uuid, primary key)
- `player_id` (uuid, references profiles)
- `amount` (numeric) // Positive for CREDIT, Negative for DEBIT
- `type` (enum: DEPOSIT, WITHDRAWAL, SESSION_PAYMENT, REFUND)
- `reference_id` (uuid, nullable - links to payment_id or session_id)
- `created_at` (timestamp)

## API Structure (REST)

### Auth & User Management
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`

### Tables
- `POST /tables` (Admin/Owner)
- `GET /tables` (By Branch)

### Sessions
- `POST /sessions/start` 
  - Body: `{ table_id, player_ids[] }`
  - Logic: Fetch `pricing_rules`, lock hourly_rate, update table status, create session.
- `POST /sessions/:id/pause`
  - Logic: Record `session_pauses.paused_at`, update session status.
- `POST /sessions/:id/resume`
  - Logic: Update `session_pauses.resumed_at`, accumulate to `paused_duration_seconds`, set status ACTIVE.
- `POST /sessions/:id/end`
  - Logic: Calculate actual duration (now - started_at - paused_duration), calculate cost, set status COMPLETED, update table to AVAILABLE.
- `GET /sessions/active`

### Payments & Dues
- `POST /payments`
  - Body: `{ session_id, payments: [{ payer_id, amount, method }] }`
  - Logic (DB Transaction): If method == WALLET, verify balance via SUM(wallet_transactions) and insert DEBIT. Insert payment records. If total payments < session cost, insert remainder into `dues`. Ensure session status is COMPLETED.
- `POST /wallet/add` (CREDIT)
- `POST /dues/add` (Manual Dues creation)
- `POST /dues/settle` 

### Dashboards
- `GET /dashboard/summary` (Today earning, weekly, monthly, active sessions count, unpaid dues sum)
- `GET /dashboard/revenue` (Grouped by table_id)
- `GET /player/history` (Filtered by player_id, joined with sessions, payments)
