# Company Dashboard MVP Requirements

## Purpose
Capture the first concrete product requirements for the shared company dashboard experience.

## Core Experience
The dashboard is a shared workspace for users who belong to the same company.

## MVP Data Domains

### Company Information
- Company name
- Organization number
- Company address

### Company Members
- Name
- Email
- Role (`administrator` or `user`)
- Status (`active` or `inactive`)

### Company Orders
- Aggregate list of orders across all members linked to the company
- Shopify remains source of truth for order data
- App DB stores indexed/mirrored order summaries for dashboard queries

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
   - For MVP company profile mirror fields, update must be all-or-nothing: if Shopify mirror write fails, app DB mutation for that operation is rolled back

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
- Users linked to existing companies are `user` and `inactive` until approved by an administrator.
- Only `administrator` can activate inactive users.
- Inactive users cannot access dashboard content and should see an activation guidance message.
- Verified members should have Shopify tag `b2b`.
- Unverified members should have Shopify tag `b2b-unverified`.

## Deferred Decisions
- Additional dashboard modules beyond company/member/orders/addresses
- Advanced role permissions outside current address rules
- Final filtering behavior for order states (draft/cancelled/refunded)
