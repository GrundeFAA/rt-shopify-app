import { z } from "zod";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import type {
  SetCompanyMainLocationInput,
  SetCompanyMainLocationResponse,
} from "../schemas/company.schema";
import { SetCompanyMainLocationResponseSchema } from "../schemas/company.schema";
import { COMPANY_MAIN_LOCATION_QUERY, UPDATE_COMPANY_SETTINGS_MUTATION } from "./company.admin-graphql";

const CompanyMainLocationDataSchema = z.object({
  company: z
    .object({
      id: z.string(),
      administrators: z
        .object({
          jsonValue: z.array(z.string()).nullable().optional(),
          references: z.object({
            nodes: z.array(
              z.object({
                __typename: z.literal("Customer"),
                id: z.string(),
              }),
            ),
          }),
        })
        .nullable()
        .optional(),
      locations: z.object({
        nodes: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
          }),
        ),
      }),
    })
    .nullable(),
});

const MetafieldsSetDataSchema = z.object({
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
      }),
    ),
  }),
});

type ManagedCompany = NonNullable<z.infer<typeof CompanyMainLocationDataSchema>["company"]>;

function idsMatch(leftId: string | null | undefined, rightId: string | null | undefined) {
  if (!leftId || !rightId) {
    return false;
  }

  return leftId === rightId || leftId.endsWith(`/${rightId}`) || rightId.endsWith(`/${leftId}`);
}

function getAdministratorIds(company: ManagedCompany) {
  const fromReferences =
    company.administrators?.references?.nodes.map((node) => node.id).filter(Boolean) ?? [];
  const fromJson = Array.isArray(company.administrators?.jsonValue)
    ? company.administrators.jsonValue.filter(Boolean)
    : [];

  return [...new Set([...fromReferences, ...fromJson])];
}

export async function setCompanyMainLocation(
  context: AdminServiceContext,
  currentCustomerId: string,
  input: SetCompanyMainLocationInput,
): Promise<SetCompanyMainLocationResponse> {
  const companyId = toShopifyGid("Company", input.companyId);
  const companyData = await executeAdminGraphql({
    context,
    document: COMPANY_MAIN_LOCATION_QUERY,
    operationName: "CompanyLocationManagement",
    fallbackMessage: "Could not load company locations from Shopify.",
    dataSchema: CompanyMainLocationDataSchema,
    variables: { companyId },
  });

  if (!companyData.company) {
    throw new AppError("RESOURCE_NOT_FOUND", "Company was not found.", 404, false, {
      companyId,
      shop: context.shop,
    });
  }

  const company = companyData.company;
  const administratorIds = getAdministratorIds(company);
  if (!administratorIds.some((administratorId) => idsMatch(administratorId, currentCustomerId))) {
    throw new AppError(
      "AUTH_FORBIDDEN",
      "Only company administrators can set the default location.",
      403,
      false,
      { companyId: company.id, customerId: currentCustomerId },
    );
  }

  const nextMainLocation = company.locations.nodes.find((location) =>
    idsMatch(location.id, input.companyLocationId),
  );
  if (!nextMainLocation) {
    throw new AppError(
      "RESOURCE_NOT_FOUND",
      "Location was not found in this company.",
      404,
      false,
      { companyId: company.id, companyLocationId: input.companyLocationId },
    );
  }

  await executeAdminGraphql({
    context,
    document: UPDATE_COMPANY_SETTINGS_MUTATION,
    operationName: "SetMainLocationId",
    fallbackMessage: "Could not update company default location.",
    dataSchema: MetafieldsSetDataSchema,
    userErrorPath: ["metafieldsSet"],
    variables: {
      metafields: [
        {
          ownerId: company.id,
          namespace: "custom",
          key: "main_location_id",
          type: "single_line_text_field",
          value: nextMainLocation.id,
        },
      ],
    },
  });

  return SetCompanyMainLocationResponseSchema.parse({
    companyId: company.id,
    mainLocationId: nextMainLocation.id,
  });
}
