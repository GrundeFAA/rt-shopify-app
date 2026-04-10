import test from "node:test";
import assert from "node:assert/strict";
import { AppError } from "../../auth/errors";
import { CompanyOrdersService } from "./company-orders.service";
import {
  decodeCompanyOrdersCursor,
  type ShopifyOrderEdge,
  type ShopifyOrderNode,
} from "../../../infrastructure/shopify-gateways/company-orders.shopify-gateway.server";

function makeOrderEdge(input: {
  cursor: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  companyId?: string;
  companyOrgNumber?: string;
}): ShopifyOrderEdge {
  return {
    cursor: input.cursor,
    node: {
      id: input.orderId,
      name: input.orderNumber,
      createdAt: "2026-04-09T10:00:00.000Z",
      displayFinancialStatus: "PAID",
      displayFulfillmentStatus: "FULFILLED",
      currentTotalPriceSet: {
        shopMoney: {
          amount: "100.00",
          currencyCode: "NOK",
        },
      },
      customer: {
        id: `gid://shopify/Customer/${input.customerId}`,
        displayName: `Customer ${input.customerId}`,
        firstName: "Customer",
        lastName: input.customerId,
      },
      customAttributes: [
        ...(input.companyId ? [{ key: "company_id", value: input.companyId }] : []),
        ...(input.companyOrgNumber
          ? [{ key: "company_org_number", value: input.companyOrgNumber }]
          : []),
      ],
    },
  };
}

function createServiceHarness(input: {
  membershipsByCustomerId: Record<string, "active" | "inactive" | "pending_user_acceptance" | "pending_admin_approval" | "unknown">;
  listPages?: Record<string, { edges: ShopifyOrderEdge[]; hasNextPage: boolean }>;
  orderById?: ShopifyOrderNode | null;
}) {
  const service = new CompanyOrdersService(
    {
      async findByCompanyId() {
        return {
          companyId: "cmp-1",
          companyName: "Example",
          orgNumber: "999888777",
          companyAddress: {
            line1: "Street 1",
            postalCode: "0001",
            city: "Oslo",
            country: "NO",
          },
        };
      },
    },
    {
      async findByCompanyAndCustomerIds(_companyId, customerIds) {
        const mapped = new Map<
          string,
          {
            customerId: string;
            companyId: string;
            status:
              | "active"
              | "inactive"
              | "pending_user_acceptance"
              | "pending_admin_approval"
              | "unknown";
          }
        >();
        for (const customerId of customerIds) {
          const status = input.membershipsByCustomerId[customerId];
          if (status) {
            mapped.set(customerId, { customerId, companyId: "cmp-1", status });
          }
        }
        return mapped;
      },
    },
    {
      async getOfflineSessionByShop() {
        return {
          shop: "demo.myshopify.com",
          accessToken: "test-token",
        };
      },
    },
    {
      async listOrders({ after }) {
        const key = after ?? "__start__";
        const page = input.listPages?.[key];
        return page ?? { edges: [], hasNextPage: false };
      },
      async getOrderById() {
        return input.orderById ?? null;
      },
    },
  );

  return service;
}

function makeDetailedOrderNode(input: {
  orderId: string;
  orderNumber: string;
  customerId: string;
  companyId: string;
  companyOrgNumber: string;
}): ShopifyOrderNode {
  const base = makeOrderEdge({
    cursor: "detail-cursor",
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    customerId: input.customerId,
    companyId: input.companyId,
    companyOrgNumber: input.companyOrgNumber,
  }).node;

  return {
    ...base,
    subtotalPriceSet: {
      shopMoney: {
        amount: "80.00",
        currencyCode: "NOK",
      },
    },
    totalShippingPriceSet: {
      shopMoney: {
        amount: "10.00",
        currencyCode: "NOK",
      },
    },
    totalTaxSet: {
      shopMoney: {
        amount: "20.00",
        currencyCode: "NOK",
      },
    },
    totalDiscountsSet: {
      shopMoney: {
        amount: "5.00",
        currencyCode: "NOK",
      },
    },
    lineItems: {
      edges: [
        {
          node: {
            title: "Work jacket",
            sku: "JACKET-1",
            quantity: 2,
            originalUnitPriceSet: {
              shopMoney: {
                amount: "50.00",
                currencyCode: "NOK",
              },
            },
            discountedUnitPriceSet: {
              shopMoney: {
                amount: "45.00",
                currencyCode: "NOK",
              },
            },
            originalTotalSet: {
              shopMoney: {
                amount: "100.00",
                currencyCode: "NOK",
              },
            },
            discountedTotalSet: {
              shopMoney: {
                amount: "90.00",
                currencyCode: "NOK",
              },
            },
          },
        },
      ],
    },
    shippingAddress: {
      firstName: "Ada",
      lastName: "Lovelace",
      company: "Example AS",
      address1: "Street 1",
      address2: null,
      zip: "0150",
      city: "Oslo",
      countryCodeV2: "NO",
      phone: "+4712345678",
    },
    billingAddress: {
      firstName: "Ada",
      lastName: "Lovelace",
      company: "Example AS",
      address1: "Invoice Road 5",
      address2: "2nd floor",
      zip: "0151",
      city: "Oslo",
      countryCodeV2: "NO",
      phone: "+4712345678",
    },
  };
}

test("includes active and inactive members in order list", async () => {
  const service = createServiceHarness({
    membershipsByCustomerId: {
      "101": "active",
      "102": "inactive",
    },
    listPages: {
      __start__: {
        edges: [
          makeOrderEdge({
            cursor: "cursor-1",
            orderId: "gid://shopify/Order/5001",
            orderNumber: "#5001",
            customerId: "101",
            companyId: "cmp-1",
            companyOrgNumber: "999888777",
          }),
          makeOrderEdge({
            cursor: "cursor-2",
            orderId: "gid://shopify/Order/5002",
            orderNumber: "#5002",
            customerId: "102",
            companyId: "cmp-1",
            companyOrgNumber: "999888777",
          }),
        ],
        hasNextPage: false,
      },
    },
  });

  const result = await service.listCompanyOrders({
    companyId: "cmp-1",
    shop: "demo.myshopify.com",
    limit: 10,
  });

  assert.equal(result.orders.length, 2);
  assert.deepEqual(
    result.orders.map((order) => order.orderNumber),
    ["#5001", "#5002"],
  );
});

test("excludes pending memberships from order list", async () => {
  const service = createServiceHarness({
    membershipsByCustomerId: {
      "201": "pending_user_acceptance",
      "202": "pending_admin_approval",
      "203": "active",
    },
    listPages: {
      __start__: {
        edges: [
          makeOrderEdge({
            cursor: "cursor-1",
            orderId: "gid://shopify/Order/6001",
            orderNumber: "#6001",
            customerId: "201",
            companyId: "cmp-1",
            companyOrgNumber: "999888777",
          }),
          makeOrderEdge({
            cursor: "cursor-2",
            orderId: "gid://shopify/Order/6002",
            orderNumber: "#6002",
            customerId: "202",
            companyId: "cmp-1",
            companyOrgNumber: "999888777",
          }),
          makeOrderEdge({
            cursor: "cursor-3",
            orderId: "gid://shopify/Order/6003",
            orderNumber: "#6003",
            customerId: "203",
            companyId: "cmp-1",
            companyOrgNumber: "999888777",
          }),
        ],
        hasNextPage: false,
      },
    },
  });

  const result = await service.listCompanyOrders({
    companyId: "cmp-1",
    shop: "demo.myshopify.com",
    limit: 10,
  });

  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0]?.orderNumber, "#6003");
});

test("excludes ambiguous ownership rows from order list", async () => {
  const service = createServiceHarness({
    membershipsByCustomerId: {
      "301": "active",
      "302": "active",
    },
    listPages: {
      __start__: {
        edges: [
          makeOrderEdge({
            cursor: "cursor-1",
            orderId: "gid://shopify/Order/7001",
            orderNumber: "#7001",
            customerId: "301",
          }),
          makeOrderEdge({
            cursor: "cursor-2",
            orderId: "gid://shopify/Order/7002",
            orderNumber: "#7002",
            customerId: "302",
            companyId: "cmp-1",
            companyOrgNumber: "999888777",
          }),
        ],
        hasNextPage: false,
      },
    },
  });

  const result = await service.listCompanyOrders({
    companyId: "cmp-1",
    shop: "demo.myshopify.com",
    limit: 10,
  });

  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0]?.orderNumber, "#7002");
});

test("fails closed for single-order lookup when membership is pending", async () => {
  const service = createServiceHarness({
    membershipsByCustomerId: {
      "401": "pending_admin_approval",
    },
    orderById: makeOrderEdge({
      cursor: "cursor-1",
      orderId: "gid://shopify/Order/8001",
      orderNumber: "#8001",
      customerId: "401",
      companyId: "cmp-1",
      companyOrgNumber: "999888777",
    }).node,
  });

  await assert.rejects(
    () =>
      service.getCompanyOrderById({
        companyId: "cmp-1",
        shop: "demo.myshopify.com",
        orderId: "gid://shopify/Order/8001",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "RESOURCE_NOT_FOUND");
      return true;
    },
  );
});

test("maps full company order detail payload", async () => {
  const service = createServiceHarness({
    membershipsByCustomerId: {
      "701": "active",
    },
    orderById: makeDetailedOrderNode({
      orderId: "gid://shopify/Order/9101",
      orderNumber: "#9101",
      customerId: "701",
      companyId: "cmp-1",
      companyOrgNumber: "999888777",
    }),
  });

  const result = await service.getCompanyOrderById({
    companyId: "cmp-1",
    shop: "demo.myshopify.com",
    orderId: "gid://shopify/Order/9101",
  });

  assert.equal(result.order.orderNumber, "#9101");
  assert.equal(result.order.lineItems.length, 1);
  assert.equal(result.order.lineItems[0]?.title, "Work jacket");
  assert.equal(result.order.lineItems[0]?.sku, "JACKET-1");
  assert.equal(result.order.lineItems[0]?.quantity, 2);
  assert.equal(result.order.lineItems[0]?.unitPrice, "45.00");
  assert.equal(result.order.lineItems[0]?.lineTotal, "90.00");

  assert.equal(result.order.totals.subtotal, "80.00");
  assert.equal(result.order.totals.shipping, "10.00");
  assert.equal(result.order.totals.tax, "20.00");
  assert.equal(result.order.totals.discounts, "5.00");
  assert.equal(result.order.totals.total, "100.00");
  assert.equal(result.order.totals.currencyCode, "NOK");

  assert.equal(result.order.shippingAddress?.name, "Ada Lovelace");
  assert.equal(result.order.shippingAddress?.line1, "Street 1");
  assert.equal(result.order.billingAddress?.line1, "Invoice Road 5");
  assert.equal(result.order.billingAddress?.line2, "2nd floor");
});

test("fails closed for single-order lookup when ownership is invalid", async () => {
  const service = createServiceHarness({
    membershipsByCustomerId: {
      "801": "active",
    },
    orderById: makeDetailedOrderNode({
      orderId: "gid://shopify/Order/9201",
      orderNumber: "#9201",
      customerId: "801",
      companyId: "cmp-other",
      companyOrgNumber: "999888777",
    }),
  });

  await assert.rejects(
    () =>
      service.getCompanyOrderById({
        companyId: "cmp-1",
        shop: "demo.myshopify.com",
        orderId: "gid://shopify/Order/9201",
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, "RESOURCE_NOT_FOUND");
      return true;
    },
  );
});

test("keeps pagination cursor stable across excluded rows", async () => {
  const firstEdge = makeOrderEdge({
    cursor: "cursor-1",
    orderId: "gid://shopify/Order/9001",
    orderNumber: "#9001",
    customerId: "501",
    companyId: "cmp-1",
    companyOrgNumber: "999888777",
  });
  const secondEdge = makeOrderEdge({
    cursor: "cursor-2",
    orderId: "gid://shopify/Order/9002",
    orderNumber: "#9002",
    customerId: "502",
    companyId: "cmp-1",
    companyOrgNumber: "999888777",
  });

  const service = createServiceHarness({
    membershipsByCustomerId: {
      "501": "pending_user_acceptance",
      "502": "active",
      "503": "active",
    },
    listPages: {
      __start__: {
        edges: [firstEdge, secondEdge],
        hasNextPage: true,
      },
      "cursor-2": {
        edges: [
          makeOrderEdge({
            cursor: "cursor-3",
            orderId: "gid://shopify/Order/9003",
            orderNumber: "#9003",
            customerId: "503",
            companyId: "cmp-1",
            companyOrgNumber: "999888777",
          }),
        ],
        hasNextPage: false,
      },
    },
  });

  const firstPage = await service.listCompanyOrders({
    companyId: "cmp-1",
    shop: "demo.myshopify.com",
    limit: 1,
  });

  assert.equal(firstPage.orders.length, 1);
  assert.equal(firstPage.orders[0]?.orderNumber, "#9002");
  assert.equal(firstPage.pageInfo.hasNextPage, true);
  assert.ok(firstPage.pageInfo.nextCursor);

  const decodedCursor = decodeCompanyOrdersCursor(firstPage.pageInfo.nextCursor!);
  assert.equal(decodedCursor.after, "cursor-2");

  const secondPage = await service.listCompanyOrders({
    companyId: "cmp-1",
    shop: "demo.myshopify.com",
    limit: 1,
    cursor: firstPage.pageInfo.nextCursor!,
  });

  assert.equal(secondPage.orders.length, 1);
  assert.equal(secondPage.orders[0]?.orderNumber, "#9003");
  assert.equal(secondPage.pageInfo.hasNextPage, false);
  assert.equal(secondPage.pageInfo.nextCursor, null);
});
