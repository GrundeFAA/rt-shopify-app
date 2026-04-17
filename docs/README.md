# Documentation Index

This directory documents the current Shopify-native app baseline.

## Current architecture

- customer account UI extensions for customer-facing company UX
- Shopify B2B entities and metafields as the source of truth for company data
- Shopify Admin API and webhooks for server-side integrations
- app proxy support only where a storefront/cart-context bridge is still needed
- Prisma only for app runtime/session persistence

## What to trust

- live code in `app/`
- live code in `extensions/account-company-dashboard/`
- `docs/guides/engineering-guidelines.md`
- `docs/guides/development-environment-setup.md`
- `docs/runbooks/parallel-agent-delivery-model.md`

## Writing rules

- Keep docs aligned with the current implementation, not planned legacy rebuilds.
- Prefer purpose-based docs under `docs/guides/`, `docs/specs/`, and `docs/runbooks/`.
- Reference Shopify-native flows directly instead of describing removed internal abstractions.

