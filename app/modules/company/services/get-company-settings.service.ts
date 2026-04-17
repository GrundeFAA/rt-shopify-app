import { z } from "zod";
import type {
  CompanyIdInput,
  CompanySettingsResponse,
} from "../schemas/company.schema";
import { CompanySettingsResponseSchema } from "../schemas/company.schema";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import { COMPANY_SETTINGS_QUERY } from "./company.admin-graphql";

const CompanySettingsDataSchema = z.object({
  company: z
    .object({
      id: z.string(),
      name: z.string(),
      ehf: z
        .object({
          value: z.string().nullable().optional(),
          type: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
      invoiceEmail: z
        .object({
          value: z.string().nullable().optional(),
          type: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
    })
    .nullable(),
});

export async function getCompanySettings(
  context: AdminServiceContext,
  input: CompanyIdInput,
): Promise<CompanySettingsResponse> {
  const companyId = toShopifyGid("Company", input.companyId);
  const data = await executeAdminGraphql({
    context,
    document: COMPANY_SETTINGS_QUERY,
    operationName: "CompanySettings",
    fallbackMessage: "Could not load company settings from Shopify.",
    dataSchema: CompanySettingsDataSchema,
    variables: { companyId },
  });

  if (!data.company) {
    throw new AppError("RESOURCE_NOT_FOUND", "Company was not found.", 404, false, {
      companyId,
      shop: context.shop,
    });
  }

  return CompanySettingsResponseSchema.parse({
    companyId: data.company.id,
    companyName: data.company.name,
    ehf: data.company.ehf?.value === "true",
    invoiceEmail: data.company.invoiceEmail?.value ?? "",
  });
}
