import {
  type CompanyOrder,
  type CompanyOrderAddress,
  type CompanyOrderLineItem,
  type CompanyOrderTotals,
  CompanyOrderFulfillmentStatusSchema,
  CompanyOrderPaymentStatusSchema,
} from "../../../contracts/company-orders.schema";
import { type CompanyProfileRepository } from "../repositories/company-profile.repository.server";
import {
  type CompanyMemberStatus,
  type CompanyOrdersMembershipRepository,
} from "../repositories/company-orders-membership.repository.server";
import { type ShopifyOfflineSessionRepository } from "../../sync/repositories/shopify-offline-session.repository.server";
import {
  CompanyOrdersShopifyGateway,
  decodeCompanyOrdersCursor,
  encodeCompanyOrdersCursor,
  type ShopifyOrderEdge,
  type ShopifyOrderNode,
} from "../../../infrastructure/shopify-gateways/company-orders.shopify-gateway.server";
import { AppError } from "../../auth/errors";
import {
  GetCompanyOrderByIdInputSchema,
  GetCompanyOrderByIdServiceOutputSchema,
  ListCompanyOrdersInputSchema,
  type GetCompanyOrderByIdInput,
  type GetCompanyOrderByIdServiceOutput,
  type ListCompanyOrdersInput,
  type ListCompanyOrdersServiceOutput,
} from "../schemas";

type CompanyProfileLookup = Pick<CompanyProfileRepository, "findByCompanyId">;
type MembershipLookup = Pick<CompanyOrdersMembershipRepository, "findByCompanyAndCustomerIds">;
type OfflineSessionLookup = Pick<ShopifyOfflineSessionRepository, "getOfflineSessionByShop">;
type OrdersGateway = Pick<CompanyOrdersShopifyGateway, "listOrders" | "getOrderById">;

const INCLUDED_MEMBER_STATUSES = new Set<CompanyMemberStatus>(["active", "inactive"]);
const EXCLUDED_MEMBER_STATUSES = new Set<CompanyMemberStatus>([
  "pending_admin_approval",
  "pending_user_acceptance",
]);
const ORDER_COMPANY_ID_KEYS = new Set(["company_id", "companyid"]);
const ORDER_COMPANY_ORG_NUMBER_KEYS = new Set([
  "company_org_number",
  "company_orgnumber",
  "company_orgnr",
  "company_org_no",
]);

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeString(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function collectOrderCompanyIdentifiers(order: ShopifyOrderNode): {
  companyIds: Set<string>;
  orgNumbers: Set<string>;
  hasAmbiguousAttributes: boolean;
} {
  const companyIds = new Set<string>();
  const orgNumbers = new Set<string>();
  let hasAmbiguousAttributes = false;

  for (const attribute of order.customAttributes) {
    const key = normalizeKey(attribute.key);
    const value = normalizeString(attribute.value);
    if (!value) {
      continue;
    }

    if (ORDER_COMPANY_ID_KEYS.has(key)) {
      companyIds.add(value);
      continue;
    }

    if (ORDER_COMPANY_ORG_NUMBER_KEYS.has(key)) {
      orgNumbers.add(value);
      continue;
    }

    if (key === "company" || key === "company_identifier") {
      // Unknown/legacy mixed keys are treated as ambiguous to avoid accidental over-inclusion.
      hasAmbiguousAttributes = true;
    }
  }

  return { companyIds, orgNumbers, hasAmbiguousAttributes };
}

function normalizePaymentStatus(status: string | null): CompanyOrder["paymentStatus"] {
  const normalized = status?.trim().toUpperCase().replace(/\s+/g, "_") ?? "UNKNOWN";
  const mapped =
    normalized === "PARTIALLY_REFUNDED" ||
    normalized === "PARTIALLY_PAID" ||
    normalized === "PAID" ||
    normalized === "PENDING" ||
    normalized === "REFUNDED" ||
    normalized === "VOIDED"
      ? normalized
      : "UNKNOWN";
  return CompanyOrderPaymentStatusSchema.parse(mapped);
}

function normalizeFulfillmentStatus(status: string | null): CompanyOrder["fulfillmentStatus"] {
  const normalized = status?.trim().toUpperCase().replace(/\s+/g, "_") ?? "UNKNOWN";
  const mapped =
    normalized === "FULFILLED" ||
    normalized === "PARTIALLY_FULFILLED" ||
    normalized === "UNFULFILLED" ||
    normalized === "SCHEDULED" ||
    normalized === "ON_HOLD" ||
    normalized === "REQUEST_DECLINED" ||
    normalized === "OPEN" ||
    normalized === "IN_PROGRESS"
      ? normalized
      : "UNKNOWN";
  return CompanyOrderFulfillmentStatusSchema.parse(mapped);
}

function resolveDisplayName(order: ShopifyOrderNode): string | null {
  const displayName = normalizeString(order.customer?.displayName);
  if (displayName) {
    return displayName;
  }

  const firstName = normalizeString(order.customer?.firstName);
  const lastName = normalizeString(order.customer?.lastName);
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  return firstName ?? lastName ?? null;
}

function toCompanyOrder(order: ShopifyOrderNode, placedByCustomerId: string): CompanyOrder | null {
  const amount = normalizeString(order.currentTotalPriceSet?.shopMoney?.amount);
  const currencyCode = normalizeString(order.currentTotalPriceSet?.shopMoney?.currencyCode);
  const placedAt = normalizeString(order.createdAt);
  const orderId = normalizeString(order.id);
  const orderNumber = normalizeString(order.name);
  if (!amount || !currencyCode || !placedAt || !orderId || !orderNumber) {
    return null;
  }

  return {
    orderId,
    orderNumber,
    placedAt,
    placedByCustomerId,
    placedByDisplayName: resolveDisplayName(order),
    paymentStatus: normalizePaymentStatus(order.displayFinancialStatus),
    fulfillmentStatus: normalizeFulfillmentStatus(order.displayFulfillmentStatus),
    totalAmount: amount,
    currencyCode,
  };
}

function mapAddress(
  address:
    | {
        firstName: string | null;
        lastName: string | null;
        company: string | null;
        address1: string | null;
        address2: string | null;
        zip: string | null;
        city: string | null;
        countryCodeV2: string | null;
        phone: string | null;
      }
    | null
    | undefined,
): CompanyOrderAddress | null {
  if (!address) {
    return null;
  }

  const firstName = normalizeString(address.firstName);
  const lastName = normalizeString(address.lastName);
  const fullName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName ?? lastName ?? null;

  const countryCodeRaw = normalizeString(address.countryCodeV2);
  const countryCode = countryCodeRaw ? countryCodeRaw.toUpperCase() : null;

  return {
    name: fullName,
    company: normalizeString(address.company),
    line1: normalizeString(address.address1),
    line2: normalizeString(address.address2),
    postalCode: normalizeString(address.zip),
    city: normalizeString(address.city),
    countryCode,
    phone: normalizeString(address.phone),
  };
}

function resolveMoneyAmount(
  primary:
    | {
        shopMoney: {
          amount: string;
          currencyCode: string;
        } | null;
      }
    | null
    | undefined,
  fallback?:
    | {
        shopMoney: {
          amount: string;
          currencyCode: string;
        } | null;
      }
    | null,
): string | null {
  const primaryAmount = normalizeString(primary?.shopMoney?.amount);
  if (primaryAmount) {
    return primaryAmount;
  }

  return normalizeString(fallback?.shopMoney?.amount);
}

function toCompanyOrderLineItems(order: ShopifyOrderNode): CompanyOrderLineItem[] {
  const edges = order.lineItems?.edges ?? [];
  const mapped: CompanyOrderLineItem[] = [];

  for (const edge of edges) {
    const title = normalizeString(edge.node.title);
    const quantity = edge.node.quantity;
    const unitPrice = resolveMoneyAmount(
      edge.node.discountedUnitPriceSet,
      edge.node.originalUnitPriceSet,
    );
    const lineTotal = resolveMoneyAmount(edge.node.discountedTotalSet, edge.node.originalTotalSet);

    if (!title || !Number.isInteger(quantity) || quantity < 0 || !unitPrice || !lineTotal) {
      continue;
    }

    mapped.push({
      title,
      sku: normalizeString(edge.node.sku),
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  return mapped;
}

function toCompanyOrderTotals(order: ShopifyOrderNode): CompanyOrderTotals | null {
  const total = normalizeString(order.currentTotalPriceSet?.shopMoney?.amount);
  const currencyCode = normalizeString(order.currentTotalPriceSet?.shopMoney?.currencyCode);
  const subtotal = normalizeString(order.subtotalPriceSet?.shopMoney?.amount) ?? "0.00";
  const shipping = normalizeString(order.totalShippingPriceSet?.shopMoney?.amount) ?? "0.00";
  const tax = normalizeString(order.totalTaxSet?.shopMoney?.amount) ?? "0.00";
  const discounts = normalizeString(order.totalDiscountsSet?.shopMoney?.amount) ?? "0.00";

  if (!total || !currencyCode) {
    return null;
  }

  return {
    subtotal,
    shipping,
    tax,
    discounts,
    total,
    currencyCode,
  };
}

function classifyOrderMembershipStatus(status: CompanyMemberStatus): "include" | "exclude" | "ambiguous" {
  if (INCLUDED_MEMBER_STATUSES.has(status)) {
    return "include";
  }

  if (EXCLUDED_MEMBER_STATUSES.has(status)) {
    return "exclude";
  }

  return "ambiguous";
}

export class CompanyOrdersService {
  constructor(
    private readonly companyProfileRepository: CompanyProfileLookup,
    private readonly membershipRepository: MembershipLookup,
    private readonly offlineSessionRepository: OfflineSessionLookup,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  private async getCompanyOrderAccessContext(input: { companyId: string; shop: string }) {
    const companyProfile = await this.companyProfileRepository.findByCompanyId(input.companyId);
    if (!companyProfile) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false);
    }

    const offlineSession = await this.offlineSessionRepository.getOfflineSessionByShop(input.shop);
    if (!offlineSession) {
      throw new AppError("INFRA_UNAVAILABLE", "Shopify offline session is unavailable.", 503, true);
    }

    return {
      companyId: input.companyId,
      companyOrgNumber: companyProfile.orgNumber,
      shop: offlineSession.shop,
      accessToken: offlineSession.accessToken,
    };
  }

  private canOrderBelongToCompany(
    order: ShopifyOrderNode,
    companyId: string,
    companyOrgNumber: string,
  ): { allowed: boolean; ambiguous: boolean } {
    const identifiers = collectOrderCompanyIdentifiers(order);
    const hasCompanyIdMatch = identifiers.companyIds.has(companyId);
    const hasOrgMatch = identifiers.orgNumbers.has(companyOrgNumber);
    const hasAnyKnownIdentifier = identifiers.companyIds.size > 0 || identifiers.orgNumbers.size > 0;

    // Fail-safe exclusion for missing ownership context.
    if (!hasAnyKnownIdentifier) {
      return { allowed: false, ambiguous: true };
    }

    // Fail-safe exclusion when we see contradictory ownership markers.
    if (
      (identifiers.companyIds.size > 0 && !hasCompanyIdMatch) ||
      (identifiers.orgNumbers.size > 0 && !hasOrgMatch)
    ) {
      return { allowed: false, ambiguous: true };
    }

    if (identifiers.hasAmbiguousAttributes) {
      return { allowed: false, ambiguous: true };
    }

    return { allowed: true, ambiguous: false };
  }

  async listCompanyOrders(input: ListCompanyOrdersInput): Promise<ListCompanyOrdersServiceOutput> {
    const parsedInput = ListCompanyOrdersInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid company orders list request.", 400, false);
    }

    const access = await this.getCompanyOrderAccessContext(parsedInput.data);
    const requestedLimit = parsedInput.data.limit;
    let after = parsedInput.data.cursor
      ? decodeCompanyOrdersCursor(parsedInput.data.cursor).after
      : undefined;

    const pageOrders: CompanyOrder[] = [];
    let hasNextPage = false;
    let lastScannedCursor: string | null = null;

    while (pageOrders.length < requestedLimit) {
      const batchSize = Math.min(Math.max(requestedLimit * 2, 20), 100);
      const page = await this.ordersGateway.listOrders({
        shop: access.shop,
        accessToken: access.accessToken,
        first: batchSize,
        after,
      });

      if (page.edges.length === 0) {
        hasNextPage = false;
        break;
      }

      const customerIds = page.edges
        .map((edge) => CompanyOrdersShopifyGateway.extractPlacedByCustomerId(edge.node))
        .filter((id): id is string => Boolean(id));
      const memberships = await this.membershipRepository.findByCompanyAndCustomerIds(
        access.companyId,
        customerIds,
      );

      for (const edge of page.edges) {
        lastScannedCursor = edge.cursor;
        after = edge.cursor;
        const includeOrder = this.toIncludedOrder(edge, access.companyId, access.companyOrgNumber, memberships);
        if (includeOrder) {
          pageOrders.push(includeOrder);
          if (pageOrders.length === requestedLimit) {
            break;
          }
        }
      }

      if (!page.hasNextPage) {
        hasNextPage = false;
        break;
      }

      if (pageOrders.length >= requestedLimit) {
        hasNextPage = true;
        break;
      }
    }

    const nextCursor =
      hasNextPage && lastScannedCursor
        ? encodeCompanyOrdersCursor({
            v: 1,
            after: lastScannedCursor,
          })
        : null;

    return {
      orders: pageOrders,
      pageInfo: {
        hasNextPage: Boolean(nextCursor),
        nextCursor,
      },
    };
  }

  private toIncludedOrder(
    edge: ShopifyOrderEdge,
    companyId: string,
    companyOrgNumber: string,
    memberships: Map<string, { status: CompanyMemberStatus }>,
  ): CompanyOrder | null {
    const ownership = this.canOrderBelongToCompany(edge.node, companyId, companyOrgNumber);
    if (!ownership.allowed) {
      if (ownership.ambiguous) {
        console.warn("Excluded ambiguous company order row", { orderId: edge.node.id });
      }
      return null;
    }

    const placedByCustomerId = CompanyOrdersShopifyGateway.extractPlacedByCustomerId(edge.node);
    if (!placedByCustomerId) {
      console.warn("Excluded order without placed-by customer id", { orderId: edge.node.id });
      return null;
    }

    const membership = memberships.get(placedByCustomerId);
    if (!membership) {
      console.warn("Excluded order without company membership", {
        orderId: edge.node.id,
        placedByCustomerId,
      });
      return null;
    }

    const membershipDecision = classifyOrderMembershipStatus(membership.status);
    if (membershipDecision !== "include") {
      if (membershipDecision === "ambiguous") {
        console.warn("Excluded order due to ambiguous membership status", {
          orderId: edge.node.id,
          placedByCustomerId,
          status: membership.status,
        });
      }
      return null;
    }

    return toCompanyOrder(edge.node, placedByCustomerId);
  }

  async getCompanyOrderById(input: GetCompanyOrderByIdInput): Promise<GetCompanyOrderByIdServiceOutput> {
    const parsedInput = GetCompanyOrderByIdInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid company order detail request.", 400, false);
    }

    const access = await this.getCompanyOrderAccessContext(parsedInput.data);
    const order = await this.ordersGateway.getOrderById({
      shop: access.shop,
      accessToken: access.accessToken,
      orderId: parsedInput.data.orderId,
    });

    if (!order) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company order was not found.", 404, false);
    }

    const ownership = this.canOrderBelongToCompany(order, access.companyId, access.companyOrgNumber);
    if (!ownership.allowed) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company order was not found.", 404, false);
    }

    const placedByCustomerId = CompanyOrdersShopifyGateway.extractPlacedByCustomerId(order);
    if (!placedByCustomerId) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company order was not found.", 404, false);
    }

    const memberships = await this.membershipRepository.findByCompanyAndCustomerIds(access.companyId, [
      placedByCustomerId,
    ]);
    const membership = memberships.get(placedByCustomerId);
    if (!membership) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company order was not found.", 404, false);
    }

    const membershipDecision = classifyOrderMembershipStatus(membership.status);
    if (membershipDecision !== "include") {
      throw new AppError("RESOURCE_NOT_FOUND", "Company order was not found.", 404, false);
    }

    const mappedOrder = toCompanyOrder(order, placedByCustomerId);
    const mappedTotals = toCompanyOrderTotals(order);
    if (!mappedOrder || !mappedTotals) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company order was not found.", 404, false);
    }

    return GetCompanyOrderByIdServiceOutputSchema.parse({
      order: {
        ...mappedOrder,
        lineItems: toCompanyOrderLineItems(order),
        totals: mappedTotals,
        shippingAddress: mapAddress(order.shippingAddress),
        billingAddress: mapAddress(order.billingAddress),
      },
    });
  }
}
