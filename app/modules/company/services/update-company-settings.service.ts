import { z } from "zod";
import type { UpdateCompanySettingsInput } from "../schemas/company.schema";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import { getCompanySettings } from "./get-company-settings.service";
import { UPDATE_COMPANY_SETTINGS_MUTATION } from "./company.admin-graphql";

const UpdateCompanySettingsDataSchema = z.object({
  metafieldsSet: z.object({
    metafields: z.array(
      z.object({
        id: z.string(),
        namespace: z.string(),
        key: z.string(),
        value: z.string(),
        type: z.string(),
      }),
    ),
    userErrors: z.array(
      z.object({
        field: z.array(z.union([z.string(), z.number()])).nullable().optional(),
        message: z.string(),
        code: z.string().nullable().optional(),
      }),
    ),
  }),
});

export async function updateCompanySettings(
  context: AdminServiceContext,
  input: UpdateCompanySettingsInput,
) {
  const companyId = toShopifyGid("Company", input.companyId);

  await executeAdminGraphql({
    context,
    document: UPDATE_COMPANY_SETTINGS_MUTATION,
    operationName: "UpdateCompanySettings",
    fallbackMessage: "Could not update company settings in Shopify.",
    dataSchema: UpdateCompanySettingsDataSchema,
    userErrorPath: ["metafieldsSet"],
    variables: {
      metafields: [
        {
          ownerId: companyId,
          namespace: "custom",
          key: "ehf",
          type: "boolean",
          value: String(input.ehf),
        },
        {
          ownerId: companyId,
          namespace: "custom",
          key: "invoice_email",
          type: "single_line_text_field",
          value: input.invoiceEmail,
        },
      ],
    },
  });

  return getCompanySettings(context, { companyId });
}
