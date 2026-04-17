# Documentation Status

The old embedded-dashboard documentation set is being retired.

This project has shifted to a Shopify-native B2B approach centered on:

- customer account UI extensions
- Shopify B2B entities and metafields
- onboarding webhooks
- app proxy cart context where still needed

Many historical docs described the previous custom dashboard and API architecture and should no longer be treated as current.

## What to trust right now

- live code in `app/`
- live code in `extensions/account-company-dashboard/`
- `docs/09-customer-onboarding-webhook-flow.md` for onboarding webhook behavior
- focused new docs/specs added after the Shopify-native pivot

## Guidance for new docs

- Prefer purpose-based docs under `docs/guides/`, `docs/specs/`, `docs/runbooks/`, and `docs/adrs/`.
- Do not recreate the old numbered dashboard baseline.
- When documenting behavior, describe the Shopify-native approach directly instead of the removed iframe dashboard/API model.

