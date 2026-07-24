# CavaroHub API

Express + Prisma backend for CavaroHub, an event management platform: hosts create and promote events, attendees browse, register, and pay for tickets.

Pairs with [`cavarohub-web`](../cavarohub-web) for the frontend — the two are separate repos/deployments that only talk over the REST API below.

## Stack

- **Node.js** + TypeScript
- **Express 5**
- **Prisma 7** with the **`@prisma/adapter-pg`** driver adapter — queries run straight over `pg`, no Rust query-engine binary at runtime
- **PostgreSQL**
- Auth: JWT (`jsonwebtoken`) + password hashing (`bcryptjs`)
- Validation: **Zod 4**
- Email: `nodemailer`, with a console-logging dev transport by default (no real mail server required)
- Background jobs: `node-cron` (auto-expire/auto-cancel transactions)

## Project layout

```
cavarohub-api/
├── prisma/
│   ├── schema.prisma   # single source of truth for the data model
│   ├── seed.ts         # demo accounts + categories
│   └── ERD.md          # entity relationship diagram
├── config/             # env loading
├── controllers/        # request handlers
├── routes/             # route definitions per resource
├── services/           # business logic + Prisma queries
├── validators/         # zod request-body schemas
├── middlewares/         # auth (JWT) + centralized error handler
├── utils/               # pure helper functions (pricing, referral math, slugify, etc.)
├── lib/                 # thin wrappers around Prisma/JWT/nodemailer
├── jobs/                # node-cron background jobs
├── app.ts / index.ts    # Express app + server bootstrap
└── prisma.config.ts     # Prisma CLI config
```

## Local setup

```bash
cp .env.example .env   # edit DATABASE_URL to point at your local or cloud Postgres
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

Server listens on `http://localhost:4000` by default. See the root-level `RUN_AND_DEPLOY_GUIDE.md` (one directory up, alongside this repo) for the complete walkthrough, including Postgres install and deploying to Railway.

## Demo accounts

Seeded by `npm run seed` (all share the same password):

| Email | Password | Role |
|---|---|---|
| admin@mail.com | password123 | Host |
| joko@mail.com | password123 | Attendee (referral code `JOKOREF1`) |
| siti@mail.com | password123 | Attendee (registered using `JOKOREF1`) |

## Feature overview

**Event discovery & creation**: category/location filters, debounced search, host event creation with optional multiple ticket types, free or paid, host-issued vouchers (percentage or fixed, date-windowed, usage-capped), host-side event deletion (blocked once an event has any transactions).

**Transactions**: seat/ticket-type reservation, voucher + coupon + points discount stacking (order: voucher → coupon → points), 2-hour payment-proof countdown, host accept/reject, 3-day auto-cancel and 2-hour auto-expire via a cron job (`jobs/transactionJobs.ts`), automatic seat/points/voucher rollback, and an email notification on accept/reject. All multi-step modifications run inside `prisma.$transaction(...)`.

**Reviews**: gated on a `DONE` transaction for an event that has already ended.

**Auth & authorization**: register/login with JWT, role-based route protection (`requireAuth`/`requireRole` in `middlewares/auth.ts`), change password, forgot/reset password (token-based, emailed via the dev mailer by default).

**Referral, profile & prizes**: referral code generated per user; registering with a code gives the new user a discount coupon and the referrer 10,000 points, both expiring 3 months out.

**Dashboard**: event/transaction/revenue/attendee totals plus a day/month/year breakdown, backing the frontend's host dashboard.

## Project structure notes

Auth logic lives in `services/auth.service.ts` + `controllers/auth.controller.ts` — everything else just calls `requireAuth`/`requireRole` and reads `req.user`, so the auth/referral/dashboard code and the events/transactions/reviews code don't touch each other beyond that one contract. `prisma/schema.prisma` is the single source of truth for the data model; see `prisma/ERD.md` for the full diagram.

No automated test suite is included, matching the reference projects this structure follows.
