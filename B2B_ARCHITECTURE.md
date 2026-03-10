# B2B Architecture (Advanced Plan, No Plus)

## Goal

Build B2B company accounts with shared company visibility while keeping Shopify native auth.

## What Shopify Handles (Native)

- Customer registration (`create_customer` form)
- Customer login/logout/password reset
- Customer session/auth cookies
- Orders, checkout, payments

## What App Handles (Custom)

- Company entity (`Company A`, `Company B`, etc.)
- Memberships (which customer belongs to which company)
- Simple roles (`admin`, `user`)
- Approval flow (pending -> approved)
- Shared company dashboard data

## Source of Truth

- **Shopify**: customer auth + commerce data (customers/orders)
- **App DB**: company model + memberships + role + approval state

## Registration Flow

1. User submits current B2B register form in theme.
2. Shopify creates customer account.
3. Webhook (`customers/create`) triggers app backend.
4. App reads customer notes (company, VAT, phone, etc.) and normalizes data.
5. App creates/links:
   - company record (if needed)
   - membership record for this customer
6. Membership starts as `pending` unless auto-approval rule matches.

## Linking Multiple Employees to Same Company

- Do **not** auto-link by company name alone.
- Safe default:
  - second user -> `pending` membership request
  - approved by company admin and/or internal staff
- Optional auto-approval only with strong checks (domain + VAT match).
- First approved member of a company becomes `admin` by default.

## B2B Access in Storefront

- Keep existing tag-based gating (`b2bcta`) for now.
- On approval, app sets customer tag (and optional metafield).
- Theme shows/hides B2B content based on that flag.

## Next.js Dashboard (Customer-Facing)

- Route example: `/b2b-dashboard`
- Reads logged-in customer identity (Shopify customer context)
- Calls app API to fetch:
  - company profile
  - members + roles (`admin`/`user`)
  - shared order list
  - invoices/documents metadata
- If customer has no approved membership -> show pending/denied state.

## Minimum DB Tables

- `companies`
  - `id`, `name`, `org_number`, `status`, `created_at`
- `company_members`
  - `id`, `company_id`, `shopify_customer_id`, `role`, `status`, `created_at`
- `membership_requests` (optional if separate from members)
  - `id`, `company_id`, `shopify_customer_id`, `status`, `reason`, `created_at`

## Webhooks to Implement First

- `customers/create` -> create pending membership
- `customers/update` -> resync profile/tags if needed

## Phase 1 Scope (Simple)

1. Keep current Shopify login/register forms.
2. Add webhook service + app DB.
3. Normalize customer note fields into structured DB rows.
4. Add approval action (internal admin).
5. Set `b2b` tag when approved.
6. Add basic Next.js dashboard page for shared orders.
7. Keep role model to only `admin` and `user`.

## Non-Goals (For Later)

- Full self-serve invite system
- Complex role permissions matrix
- Replacing Shopify auth
