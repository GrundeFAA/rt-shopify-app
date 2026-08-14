import { z } from "zod";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import {
  CUSTOMER_TAGS_QUERY,
  CUSTOMER_TAGS_UPDATE_MUTATION,
} from "./company-contact-customer-tags.admin-graphql";

export const B2B_CUSTOMER_TAG = "b2b";
const B2B_TAG_PREFIX = "b2b";

const CustomerTagsSchema = z.object({
  customer: z
    .object({
      id: z.string(),
      tags: z.array(z.string()),
    })
    .nullable(),
});

const CustomerTagsUpdateSchema = z.object({
  customerUpdate: z.object({
    customer: z
      .object({
        id: z.string(),
        tags: z.array(z.string()),
      })
      .nullable(),
    userErrors: z.array(
      z.object({
        field: z.array(z.union([z.string(), z.number()])).nullable().optional(),
        message: z.string(),
      }),
    ),
  }),
});

export function isB2bTag(tag: string): boolean {
  return tag.trim().toLowerCase().startsWith(B2B_TAG_PREFIX);
}

export function getCompanyContactIdFromPayload(payload: Record<string, unknown>): string | null {
  const rawId = payload.admin_graphql_api_id;
  if (typeof rawId !== "string" || rawId.trim().length === 0) {
    return null;
  }

  return toShopifyGid("CompanyContact", rawId.trim());
}

export function getCustomerIdFromPayload(payload: Record<string, unknown>): string | null {
  const graphqlId = payload.customer_admin_graphql_api_id;
  if (typeof graphqlId === "string" && graphqlId.trim().length > 0) {
    return toShopifyGid("Customer", graphqlId.trim());
  }

  const numericId = payload.customer_id;
  if (typeof numericId === "number" || typeof numericId === "string") {
    const normalizedId = String(numericId).trim();
    if (normalizedId.length > 0) {
      return toShopifyGid("Customer", normalizedId);
    }
  }

  return null;
}

async function loadCustomerTags(context: AdminServiceContext, customerId: string) {
  const data = await executeAdminGraphql({
    context,
    document: CUSTOMER_TAGS_QUERY,
    operationName: "CustomerTags",
    fallbackMessage: "Could not load customer tags from Shopify.",
    dataSchema: CustomerTagsSchema,
    variables: { customerId },
  });

  if (!data.customer) {
    throw new AppError("RESOURCE_NOT_FOUND", "Customer was not found.", 404, false, {
      customerId,
      shop: context.shop,
    });
  }

  return data.customer;
}

async function saveCustomerTags(
  context: AdminServiceContext,
  customerId: string,
  tags: string[],
) {
  await executeAdminGraphql({
    context,
    document: CUSTOMER_TAGS_UPDATE_MUTATION,
    operationName: "UpdateCustomerTags",
    fallbackMessage: "Could not update customer tags in Shopify.",
    dataSchema: CustomerTagsUpdateSchema,
    userErrorPath: ["customerUpdate"],
    variables: {
      input: {
        id: customerId,
        tags: tags.join(", "),
      },
    },
  });
}

export async function addB2bCustomerTag(
  context: AdminServiceContext,
  customerId: string,
): Promise<{ customerId: string; tagsAdded: string[] }> {
  const customer = await loadCustomerTags(context, customerId);
  const nextTags = new Set(customer.tags);

  if (nextTags.has(B2B_CUSTOMER_TAG)) {
    return { customerId: customer.id, tagsAdded: [] };
  }

  nextTags.add(B2B_CUSTOMER_TAG);
  await saveCustomerTags(context, customer.id, [...nextTags]);
  return { customerId: customer.id, tagsAdded: [B2B_CUSTOMER_TAG] };
}

export async function removeB2bCustomerTags(
  context: AdminServiceContext,
  customerId: string,
): Promise<{ customerId: string; tagsRemoved: string[] }> {
  const customer = await loadCustomerTags(context, customerId);
  const tagsRemoved = customer.tags.filter((tag) => isB2bTag(tag));

  if (tagsRemoved.length === 0) {
    return { customerId: customer.id, tagsRemoved };
  }

  const nextTags = customer.tags.filter((tag) => !isB2bTag(tag));
  await saveCustomerTags(context, customer.id, nextTags);
  return { customerId: customer.id, tagsRemoved };
}
