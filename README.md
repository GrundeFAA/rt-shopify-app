# RT Shopify B2B App

Proof-of-concept full-stack app for extending Shopify customer accounts with B2B company membership models.

## Current scope

- PostgreSQL + Prisma data model for companies and company memberships
- tRPC API with service/repository layering
- Shopify Admin API integration using custom app access token
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
3. Set Shopify config:
   - `SHOPIFY_STORE_DOMAIN`
   - `SHOPIFY_ADMIN_ACCESS_TOKEN`
   - `SHOPIFY_WEBHOOK_BASE_URL` (your public tunnel URL, no trailing slash)
   - `SHOPIFY_WEBHOOK_SECRET` (optional while testing with local payloads)
4. Run migrations
5. Start app

```bash
npm run db:push
npm run dev
```

## Register webhooks for local development

When your tunnel URL changes, run:

```bash
npm run webhook:register
```

Or pass base URL directly:

```bash
npm run webhook:register -- "https://your-new-url.trycloudflare.com"
```

## One-command local workflow

To automate tunnel + webhook registration + Next.js dev:

```bash
npm run dev:full
```

This command:

- starts a Cloudflare tunnel to `http://localhost:3000`
- detects the generated `trycloudflare.com` URL
- writes `SHOPIFY_WEBHOOK_BASE_URL` into `.env`
- runs `npm run webhook:register`
- starts `npm run dev`

Prerequisite: `cloudflared` CLI must be installed and available on PATH.
Windows install example: `winget install Cloudflare.cloudflared`.

