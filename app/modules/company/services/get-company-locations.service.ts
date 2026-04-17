import { z } from "zod";
import type {
  CompanyIdInput,
  CompanyLocationsResponse,
} from "../schemas/company.schema";
import { CompanyLocationsResponseSchema } from "../schemas/company.schema";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import { COMPANY_LOCATIONS_QUERY } from "./company.admin-graphql";

const CompanyLocationsDataSchema = z.object({
  company: z
    .object({
      id: z.string(),
      name: z.string(),
      locations: z.object({
        nodes: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            shippingAddress: z
              .object({
                address1: z.string().nullable().optional(),
                address2: z.string().nullable().optional(),
                city: z.string().nullable().optional(),
                province: z.string().nullable().optional(),
                zip: z.string().nullable().optional(),
                country: z.string().nullable().optional(),
              })
              .nullable()
              .optional(),
          }),
        ),
      }),
    })
    .nullable(),
});

export async function getCompanyLocations(
  context: AdminServiceContext,
  input: CompanyIdInput,
): Promise<CompanyLocationsResponse> {
  const companyId = toShopifyGid("Company", input.companyId);
  const data = await executeAdminGraphql({
    context,
    document: COMPANY_LOCATIONS_QUERY,
    operationName: "CompanyLocations",
    fallbackMessage: "Could not load company locations from Shopify.",
    dataSchema: CompanyLocationsDataSchema,
    variables: { companyId },
  });

  if (!data.company) {
    throw new AppError("RESOURCE_NOT_FOUND", "Company was not found.", 404, false, {
      companyId,
      shop: context.shop,
    });
  }

  return CompanyLocationsResponseSchema.parse({
    companyId: data.company.id,
    companyName: data.company.name,
    locations: data.company.locations.nodes.map((location) => ({
      id: location.id,
      name: location.name,
      shippingAddress: {
        address1: location.shippingAddress?.address1 ?? null,
        address2: location.shippingAddress?.address2 ?? null,
        city: location.shippingAddress?.city ?? null,
        province: location.shippingAddress?.province ?? null,
        zip: location.shippingAddress?.zip ?? null,
        country: location.shippingAddress?.country ?? null,
      },
    })),
  });
}
