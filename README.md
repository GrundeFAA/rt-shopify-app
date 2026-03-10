# RT Shopify B2B App

Proof-of-concept full-stack app for extending Shopify customer accounts with B2B company membership models.

## Current scope

- PostgreSQL + Prisma data model for companies and company memberships
- tRPC API with service/repository layering
- Shopify customer webhook endpoints (`customers/create`, `customers/update`)
- Basic customer-facing `/b2b-dashboard` route for approved/pending membership state

## Architecture notes

- Shopify remains source of truth for auth and commerce data
- App database is source of truth for company and membership state
- Backend flow follows `router -> service -> repository -> database`

See `B2B_ARCHITECTURE.md` for functional and domain details.

## Local setup

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL`
3. Run migrations
4. Start app

```bash
npm run db:push
npm run dev
```
