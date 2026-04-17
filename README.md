# RT Shopify App

This repo is being rebuilt around Shopify-native B2B functionality.

## Current direction

- customer account UI extensions for the B2B account experience
- Shopify-native B2B entities, roles, and metafields
- app-backed onboarding routes for storefront registration
- Shopify Admin API and webhooks for server-side orchestration

## Local development

```sh
npm install
npm run dev
```

## Important paths

- `extensions/account-company-dashboard/` - customer account UI extension
- `app/routes/api.b2b-proxy.register-company.tsx` - storefront registration app proxy
- `app/modules/auth/` - API error and proxy validation helpers
- `app/modules/onboarding/` - storefront onboarding payloads and orchestration
- `app/modules/webhooks/` - webhook handlers

## Notes

- The old embedded dashboard and its custom API layer have been removed.
- Historical docs from the previous architecture have been pruned and should not be treated as the current implementation model.
