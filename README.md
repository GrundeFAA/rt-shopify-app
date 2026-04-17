# RT Shopify App

This repo is being rebuilt around Shopify-native B2B functionality.

## Current direction

- customer account UI extensions for the B2B account experience
- Shopify-native B2B entities, roles, and metafields
- webhook-based onboarding
- app proxy cart context where still needed

## Local development

```sh
npm install
npm run dev
```

## Important paths

- `extensions/account-company-dashboard/` - customer account UI extension
- `app/routes/webhooks.customers.create.tsx` - onboarding webhook entrypoint
- `app/routes/api.b2b-proxy.cart-context.tsx` - storefront app proxy cart context
- `app/modules/auth/` - membership and proxy validation
- `app/modules/webhooks/` - onboarding webhook logic

## Notes

- The old embedded dashboard and its custom API layer have been removed.
- Historical docs from the previous architecture have been pruned and should not be treated as the current implementation model.
