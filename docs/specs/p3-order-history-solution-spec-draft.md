# Phase 3 Draft - Company Order History Solution Spec

## Purpose
Define a deterministic company order history model for the dashboard that reflects real business history while preventing pending users from affecting company-visible order data.

## Scope
In scope:
- company order list inclusion/exclusion rules
- member-status-based visibility rules
- order ownership linkage to company context
- API contract baseline for company orders list

Out of scope:
- advanced order analytics
- custom invoice/accounting projections
- cross-company order transfer

## Core Decision (Locked)
Company order history includes orders from members with status:
- `active`
- `inactive`

Company order history excludes orders from members with status:
- `pending_user_acceptance`
- `pending_admin_approval`

## Business Rationale
- Former employees who were valid members should remain part of company history.
- Pending users are not fully approved members and must not contribute to company-visible history.
- `inactive` represents previously approved members who were later deactivated; their historical orders remain relevant to company operations.

## Company Order Ownership Rule
An order is considered company-owned when company context is attached at order creation (via cart/order attributes pipeline).

Expected context keys (baseline):
- company identifier (for example org number or canonical company id)
- placed-by customer identifier

The company order list must only show orders where:
1. order company identifier matches the viewer's company
2. placed-by member currently belongs to the company
3. placed-by member status is in `{active, inactive}`

## Status Behavior Matrix
- `active` -> include
- `inactive` -> include
- `pending_user_acceptance` -> exclude
- `pending_admin_approval` -> exclude

## API Surface (Draft)
- `GET /api/company/orders`
  - returns company-owned orders for authenticated company member context
  - default sort: newest first
  - pagination required
- `GET /api/company/orders/:orderId`
  - returns single company-owned order detail for authenticated company member context
  - same membership inclusion/exclusion and company ownership rules apply

MVP data access strategy:
- Orders are fetched directly from Shopify API at read time.
- No app-DB order mirror/index table is required for MVP.

Potential later:
- status filters (payment/fulfillment/lifecycle)
- date range filters
- search by order number/reference

## Minimal Response Fields (MVP)
- `orderId`
- `orderNumber`
- `placedAt`
- `placedByCustomerId`
- `placedByDisplayName` (if available)
- `paymentStatus`
- `fulfillmentStatus`
- `totalAmount`
- `currencyCode`

## Deterministic Scenarios
1. Active member places order:
   - order appears in company list
2. Member later deactivated (`active -> inactive`):
   - historical order remains visible
3. Pending user attempts order path:
   - company context injection should not occur
   - order must not appear in company history
4. Pending user later becomes active:
   - only orders placed after valid company context attachment are included

## Reliability and Data Integrity Rules
- App DB remains source of truth for membership status.
- Company linkage on order must be treated as snapshot-at-order-time context.
- List queries must be deterministic and idempotent for same inputs.
- If status lookup or linkage data is missing/invalid, fail safe (exclude ambiguous rows) and log for reconciliation.
- Single-order lookup must fail closed (`404`/forbidden outcome) when company ownership or membership policy cannot be verified.

## Security Rules
- All reads are company-scoped and authorization-checked server-side.
- UI filtering is not a security boundary.
- Pending users must not get company order visibility through any frontend shortcut.

## Dependencies Before Backend Implementation
1. Finalized onboarding status model in docs/contracts:
   - `pending_user_acceptance`
   - `pending_admin_approval`
   - `active`
   - `inactive`
2. Confirmed cart/order context key contract used for company ownership matching.
3. Error mapping alignment for unauthorized/pending access states in order APIs.

## Open Decisions
1. Exact canonical order company key:
   - org number vs internal company id vs both
2. Fallback behavior for legacy orders lacking company context
3. Whether to include cancelled/refunded orders in default list or behind filters

## Recommended Implementation Order
1. Lock order ownership key contract.
2. Implement `GET /api/company/orders` with status inclusion rules.
3. Add tests for active/inactive include and pending exclude.
4. Add reconciliation logging for ambiguous/invalid linkage rows.
5. Add optional filters after baseline list behavior is accepted.

