import { AppError } from "../../modules/auth/errors";
import { apiVersion } from "../../shopify.server";

const LIST_ORDERS_QUERY = `#graphql
  query ListCompanyOrders($first: Int!, $after: String) {
    orders(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          currentTotalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          customer {
            id
            displayName
            firstName
            lastName
          }
          customAttributes {
            key
            value
          }
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

const GET_ORDER_BY_ID_QUERY = `#graphql
  query GetCompanyOrderById($id: ID!) {
    order(id: $id) {
      id
      name
      createdAt
      displayFinancialStatus
      displayFulfillmentStatus
      subtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalShippingPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalTaxSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalDiscountsSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      currentTotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      lineItems(first: 100) {
        edges {
          node {
            title
            sku
            quantity
            originalUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            discountedUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            originalTotalSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            discountedTotalSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
      shippingAddress {
        firstName
        lastName
        company
        address1
        address2
        zip
        city
        countryCodeV2
        phone
      }
      billingAddress {
        firstName
        lastName
        company
        address1
        address2
        zip
        city
        countryCodeV2
        phone
      }
      customer {
        id
        displayName
        firstName
        lastName
      }
      customAttributes {
        key
        value
      }
    }
  }
`;

export type ShopifyOrderNode = {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  currentTotalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    } | null;
  } | null;
  subtotalPriceSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    } | null;
  } | null;
  totalShippingPriceSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    } | null;
  } | null;
  totalTaxSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    } | null;
  } | null;
  totalDiscountsSet?: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    } | null;
  } | null;
  lineItems?: {
    edges: Array<{
      node: {
        title: string;
        sku: string | null;
        quantity: number;
        originalUnitPriceSet: {
          shopMoney: {
            amount: string;
            currencyCode: string;
          } | null;
        } | null;
        discountedUnitPriceSet?: {
          shopMoney: {
            amount: string;
            currencyCode: string;
          } | null;
        } | null;
        originalTotalSet: {
          shopMoney: {
            amount: string;
            currencyCode: string;
          } | null;
        } | null;
        discountedTotalSet?: {
          shopMoney: {
            amount: string;
            currencyCode: string;
          } | null;
        } | null;
      };
    }>;
  } | null;
  shippingAddress?: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    address1: string | null;
    address2: string | null;
    zip: string | null;
    city: string | null;
    countryCodeV2: string | null;
    phone: string | null;
  } | null;
  billingAddress?: {
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    address1: string | null;
    address2: string | null;
    zip: string | null;
    city: string | null;
    countryCodeV2: string | null;
    phone: string | null;
  } | null;
  customer: {
    id: string | null;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  customAttributes: Array<{
    key: string;
    value: string | null;
  }>;
};

export type ShopifyOrderEdge = {
  cursor: string;
  node: ShopifyOrderNode;
};

export type CompanyOrdersCursor = {
  v: 1;
  after: string;
};

function parseShopifyCustomerId(globalId: string | null | undefined): string | null {
  if (!globalId) {
    return null;
  }

  const trimmed = globalId.trim();
  if (!trimmed) {
    return null;
  }

  const match = /\/Customer\/(\d+)$/.exec(trimmed);
  return match?.[1] ?? null;
}

function toCanonicalOrderId(orderId: string): string {
  const trimmed = orderId.trim();
  if (!trimmed) {
    throw new AppError("VALIDATION_FAILED", "Order id is required.", 400, false);
  }

  if (trimmed.startsWith("gid://shopify/Order/")) {
    return trimmed;
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new AppError("VALIDATION_FAILED", "Order id format is invalid.", 400, false);
  }

  return `gid://shopify/Order/${trimmed}`;
}

function toShopifyGraphQlUrl(shop: string): string {
  const normalizedShop = shop.trim().toLowerCase();
  if (!normalizedShop) {
    throw new AppError("VALIDATION_FAILED", "Shop is required.", 400, false);
  }

  return `https://${normalizedShop}/admin/api/${apiVersion}/graphql.json`;
}

function normalizeDependencyError(status: number, details?: Record<string, unknown>): AppError {
  if (status === 429) {
    return new AppError(
      "SHOPIFY_RATE_LIMITED",
      "Shopify rate limit reached while reading company orders.",
      429,
      true,
      details,
    );
  }

  if (status >= 500) {
    return new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Shopify temporarily unavailable while reading company orders.",
      503,
      true,
      details,
    );
  }

  return new AppError(
    "SHOPIFY_USER_ERROR",
    "Shopify returned an invalid response while reading company orders.",
    503,
    false,
    details,
  );
}

export function encodeCompanyOrdersCursor(cursor: CompanyOrdersCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeCompanyOrdersCursor(cursor: string): CompanyOrdersCursor {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as Partial<CompanyOrdersCursor>;
    if (parsed.v !== 1 || typeof parsed.after !== "string" || !parsed.after.trim()) {
      throw new Error("Invalid cursor payload");
    }

    return {
      v: 1,
      after: parsed.after,
    };
  } catch {
    throw new AppError(
      "VALIDATION_FAILED",
      "Invalid company orders cursor.",
      400,
      false,
      { field: "cursor" },
    );
  }
}

type ShopifyOrdersConnectionResponse = {
  data?: {
    orders?: {
      edges?: ShopifyOrderEdge[];
      pageInfo?: {
        hasNextPage?: boolean;
      };
    };
  };
  errors?: Array<{ message?: string }>;
};

type ShopifyOrderByIdResponse = {
  data?: {
    order?: ShopifyOrderNode | null;
  };
  errors?: Array<{ message?: string }>;
};

export class CompanyOrdersShopifyGateway {
  async listOrders(input: {
    shop: string;
    accessToken: string;
    first: number;
    after?: string;
  }): Promise<{ edges: ShopifyOrderEdge[]; hasNextPage: boolean }> {
    let response: Response;
    try {
      response = await fetch(toShopifyGraphQlUrl(input.shop), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": input.accessToken,
        },
        body: JSON.stringify({
          query: LIST_ORDERS_QUERY,
          variables: {
            first: input.first,
            after: input.after ?? null,
          },
        }),
      });
    } catch (error) {
      throw new AppError(
        "INFRA_UNAVAILABLE",
        "Could not reach Shopify while reading company orders.",
        503,
        true,
        {
          reason: error instanceof Error ? error.message : "Unknown network error",
        },
      );
    }

    const parsed = (await response.json()) as ShopifyOrdersConnectionResponse;
    if (!response.ok) {
      throw normalizeDependencyError(response.status, {
        errors: parsed.errors,
      });
    }

    if (parsed.errors?.length) {
      throw new AppError(
        "SHOPIFY_USER_ERROR",
        "Shopify returned GraphQL errors while reading company orders.",
        503,
        false,
        { errors: parsed.errors },
      );
    }

    const edges = parsed.data?.orders?.edges ?? [];
    const hasNextPage = Boolean(parsed.data?.orders?.pageInfo?.hasNextPage);
    return {
      edges,
      hasNextPage,
    };
  }

  async getOrderById(input: {
    shop: string;
    accessToken: string;
    orderId: string;
  }): Promise<ShopifyOrderNode | null> {
    let response: Response;
    try {
      response = await fetch(toShopifyGraphQlUrl(input.shop), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": input.accessToken,
        },
        body: JSON.stringify({
          query: GET_ORDER_BY_ID_QUERY,
          variables: {
            id: toCanonicalOrderId(input.orderId),
          },
        }),
      });
    } catch (error) {
      throw new AppError(
        "INFRA_UNAVAILABLE",
        "Could not reach Shopify while reading company order detail.",
        503,
        true,
        {
          reason: error instanceof Error ? error.message : "Unknown network error",
        },
      );
    }

    const parsed = (await response.json()) as ShopifyOrderByIdResponse;
    if (!response.ok) {
      throw normalizeDependencyError(response.status, {
        errors: parsed.errors,
      });
    }

    if (parsed.errors?.length) {
      throw new AppError(
        "SHOPIFY_USER_ERROR",
        "Shopify returned GraphQL errors while reading company order detail.",
        503,
        false,
        { errors: parsed.errors },
      );
    }

    return parsed.data?.order ?? null;
  }

  static extractPlacedByCustomerId(order: ShopifyOrderNode): string | null {
    return parseShopifyCustomerId(order.customer?.id);
  }
}
