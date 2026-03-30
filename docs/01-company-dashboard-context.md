# Company Dashboard Context (Non-Plus)

## Objective
Build a customer-facing dashboard for logged-in users that behaves like a company portal, without relying on Shopify Plus B2B company objects.

## Key Constraint
- The store is not on Shopify Plus.
- Native Shopify B2B entities (`Company`, `CompanyContact`, `CompanyLocation`) are not the foundation for this project.

## Product Direction
- The dashboard is for customers, not Shopify Admin staff.
- We will implement a "company-like" model in our app database.
- Shopify customer login remains the identity source.
- Primary dashboard delivery is through Shopify App Proxy (`/apps/...`).

## High-Level Architecture Decision
We use Shopify customer authentication and map each authenticated customer to an internal company membership model:

- `Shopify Customer` -> `App User` -> `Company Membership` -> `Role`

This lets us support:
- Multiple customers under one company
- Role-based access (`administrator`, `user`)
- Company-scoped dashboard data and actions

## Core Principles
- Authentication is Shopify-managed.
- Authorization is app-managed.
- All sensitive access checks happen server-side.
- Client-provided IDs are never trusted alone for authorization.
- App proxy signatures must be verified before trusting customer context.

## Out of Scope (MVP)
- Native Shopify Plus B2B workflows
- Cross-shop account federation
- External SSO providers

## Open Questions
- What is the first set of company metrics in the dashboard?

## Decided for MVP
- Delivery mode: Shopify App Proxy dashboard entry route (`/apps/dashboard`)
- Frontend isolation mode: iframe-hosted app UI (separate app page rendered inside proxy response)
- Identity source: Shopify-signed app proxy request context
- Access model: internal company membership and role checks in app DB
- Backend layering: application services orchestrate repositories (app DB) and Shopify gateways (API)
- Reliability model: typed errors, bounded retries, dead-letter handling, and reconciliation-based drift repair
- Domain scope: company info, members, aggregated company orders, and shared company addresses
- Membership model: one customer belongs to exactly one company in MVP
- Role model: `administrator` (full MVP access) and `user` (limited MVP access)
