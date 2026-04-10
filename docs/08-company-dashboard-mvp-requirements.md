# Company Dashboard MVP Requirements

## Purpose
Capture the first concrete product requirements for the shared company dashboard experience.

## Core Experience
The dashboard is a shared workspace for users who belong to the same company.

### Customer UX Standard (MVP)
- The dashboard is customer-facing and designed for non-technical users.
- All customer-facing dashboard text must be Norwegian (Bokmal) in production UI.
- Primary flows must be understandable without technical knowledge:
  - view company information
  - view company orders
  - manage shared addresses
  - understand access and activation status
- Error and pending states must provide plain-language guidance on what the user should do next.
- Production customer UI must not display technical diagnostics or internal error metadata.
- UX decisions should prefer clarity and confidence over technical transparency in customer views.

### Error UX Acceptance Signals (MVP)
- Users awaiting administrator approval see a dedicated pending-activation state with next-step guidance.
- Unauthorized/forbidden states explain access outcome without technical jargon.
- Temporary dependency failures provide a clear retry path when appropriate.
- Customer-facing error UI can include `requestId` for support, but never raw technical error payloads.

## MVP Data Domains

### Company Information
- Company name
- Organization number
- Company address
- Company information is app-local for MVP and is not synchronized to Shopify.

### Company Members
- Name
- Email
- Role (`administrator` or `user`)
- Status (`pending_user_acceptance`, `pending_admin_approval`, `active`, or `inactive`)

### Company Orders
- Aggregate list of orders across all members linked to the company
- Shopify remains source of truth for order data
- MVP order list and single-order details are direct lookup from Shopify API (no app-DB order mirror/index table)

### Addresses
Two address types are required:

1. **User Primary Address (Individual)**
   - Owned by the individual user
   - Not synchronized as a shared company address
   - Not fan-out synced to other members

2. **Shared Company Delivery Addresses**
   - Managed in app DB as source of truth
   - Visible in shared company context
   - On create/update/delete, sync changes to all active company members in Shopify

## Address Audit Requirement
- Track who added each shared company address
- Store creator identity (`createdByMemberId` and created timestamp)

## Permissions (Current MVP)
- `administrator` has full access for MVP scope
- `user` has limited access for MVP scope
- Current confirmed `user` capabilities:
  - view dashboard
  - add/remove shared company delivery addresses

## Onboarding and Access
- Customer onboarding is webhook-driven from Shopify `customers/create` events.
- Temporary company payload is read from customer note with expected keys:
  - `company_name`
  - `company_org_number`
  - `company_address_line1`
  - `company_address_line2` (optional)
  - `company_postal_code`
  - `company_city`
- Note payload is single-use onboarding data and should be removed after successful onboarding processing.
- First user in a new company is `administrator` and `active`.
- Users added by an `administrator` from the dashboard are created as `pending_user_acceptance` until the added user accepts membership.
- Users who self-register into an existing company via webhook onboarding are created as `pending_admin_approval` until approved by an administrator.
- Only `administrator` can activate `pending_admin_approval` users.
- User acceptance and administrator activation are distinct gates and must be handled deterministically by entry flow.
- Pending memberships (`pending_user_acceptance`, `pending_admin_approval`) may be removed via hard delete.
- Memberships that have reached approved lifecycle states (`active`, `inactive`) must not be hard-deleted.
- `inactive` means previously active users who were later deactivated.
- Inactive users cannot access dashboard content and should see a reactivation/contact-administrator guidance message.
- Verified members should have Shopify tag `b2b`.
- Unverified members should have Shopify tag `b2b-unverified`.
- Tag lifecycle must mirror membership status in all relevant transitions (create, activate, deactivate) with app DB as source of truth.

## Deferred Decisions
- Additional dashboard modules beyond company/member/orders/addresses
- Advanced role permissions outside current address rules
- Final filtering behavior for order states (draft/cancelled/refunded)
