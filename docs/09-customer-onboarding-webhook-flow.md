# Customer Onboarding via Webhooks (Temporary Note Parsing)

## Purpose
Define the onboarding flow for company users created through Shopify customer forms, using customer notes as a temporary metadata carrier.

## Temporary Input Contract
Because the storefront form cannot write structured metadata directly, the customer note is used temporarily.

Expected note format:

`company_name: <Company Name>`
`company_org_number: <Organization Number>`
`company_address_line1: <Address line 1>`
`company_address_line2: <Address line 2>` (optional)
`company_postal_code: <Postal code>`
`company_city: <City>`

Example:

`company_name: Reolteknikk AS`
`company_org_number: 123456789`
`company_address_line1: Storgata 2`
`company_address_line2: Suite 2`
`company_postal_code: 0155`
`company_city: Oslo`

## Important Constraint
- Theme form validation enforces note formatting on the client.
- Backend webhook processing must still validate and parse note content server-side before use.

## Trigger Events
- `customers/create` (onboarding trigger)
- `customers/update` is not used for onboarding note parsing in MVP

## Processing Flow (`customers/create`)
1. Receive and verify webhook signature
2. Parse and validate customer note structure
3. If note does not contain company payload, skip company onboarding logic
4. Resolve company by normalized organization number
5. Enforce one-company-per-user rule
6. Create/link membership in app DB using idempotent logic
7. Clear the temporary customer note after successful onboarding processing

Branching:
- **New company**
  - Create company record
  - Create first member as `administrator`
  - Set member status to `active`
  - Ensure Shopify customer tag is `b2b`

- **Existing company**
  - If customer is not linked yet: link customer as `user` with `inactive` status
  - If customer is already linked: do not downgrade role/status
  - Ensure Shopify customer tag converges to expected verification tag

## Member Activation Rules
- Inactive members cannot access company dashboard data.
- Inactive members see a message to contact a company administrator for activation.
- Administrator action changes member status:
  - `inactive -> active`: Shopify tag `b2b-unverified -> b2b`
  - `active -> inactive`: Shopify tag `b2b -> b2b-unverified`

## Tag Strategy (MVP)
- Verified company member: `b2b`
- Unverified company member: `b2b-unverified`

Tag updates must be idempotent and converge to the expected final state.
App DB membership status is source of truth; Shopify tags mirror that state for storefront conditional rendering.

## Data Records Required
- `Company`
- `CompanyMember` (includes `role` and `status`)
- `OnboardingEventLog` (webhook source, parse result, action, timestamps)

## Failure Handling
- Invalid note format: log validation failure, do not create/link company membership, keep note unchanged
- Missing required fields in note: same as invalid format and keep note unchanged
- Note cleanup failure after successful onboarding: enqueue retry task for note cleanup
- Tag update failure: keep membership status as source of truth and enqueue retry
- Duplicate webhooks: dedupe via webhook/event idempotency handling
- Existing linked customer with conflicting company payload (`company_org_number` mismatch): reject onboarding mutation and log conflict event

## `customers/update` Scope (MVP)
- Reserved for later synchronization concerns (for example profile or address-related reactions)
- Must not re-run onboarding note parsing or mutate membership role/status from note content

## Migration Plan (Future)
Replace note parsing with structured metadata when storefront capture path supports direct metadata writes.
