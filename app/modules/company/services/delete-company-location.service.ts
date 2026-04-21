import { z } from "zod";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import type {
  DeleteCompanyLocationInput,
  DeleteCompanyLocationResponse,
} from "../schemas/company.schema";
import { DeleteCompanyLocationResponseSchema } from "../schemas/company.schema";
import {
  COMPANY_LOCATION_DELETE_MUTATION,
  COMPANY_MAIN_LOCATION_QUERY,
} from "./company.admin-graphql";

const CompanyManagementDataSchema = z.object({
  company: z
    .object({
      id: z.string(),
      mainLocationId: z
        .object({
          value: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
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
            ordersCount: z
              .object({
                count: z.number().int().nonnegative(),
              })
              .nullable()
              .optional(),
          }),
        ),
      }),
    })
    .nullable(),
});

const CompanyLocationDeleteDataSchema = z.object({
  companyLocationDelete: z.object({
    deletedCompanyLocationId: z.string().nullable().optional(),
    userErrors: z.array(
      z.object({
        field: z.array(z.union([z.string(), z.number()])).nullable().optional(),
        message: z.string(),
      }),
    ),
  }),
});

type CompanyData = z.infer<typeof CompanyManagementDataSchema>;
type ManagedCompany = NonNullable<CompanyData["company"]>;

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

export async function deleteCompanyLocation(
  context: AdminServiceContext,
  currentCustomerId: string,
  input: DeleteCompanyLocationInput,
): Promise<DeleteCompanyLocationResponse> {
  const companyId = toShopifyGid("Company", input.companyId);
  const companyData = await executeAdminGraphql({
    context,
    document: COMPANY_MAIN_LOCATION_QUERY,
    operationName: "CompanyLocationManagement",
    fallbackMessage: "Could not load company location management data from Shopify.",
    dataSchema: CompanyManagementDataSchema,
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
      "Only company administrators can delete locations.",
      403,
      false,
      { companyId: company.id, customerId: currentCustomerId },
    );
  }

  const targetLocation = company.locations.nodes.find((location) =>
    idsMatch(location.id, input.companyLocationId),
  );
  if (!targetLocation) {
    throw new AppError(
      "RESOURCE_NOT_FOUND",
      "Location was not found in this company.",
      404,
      false,
      { companyId: company.id, companyLocationId: input.companyLocationId },
    );
  }

  if (idsMatch(company.mainLocationId?.value ?? "", targetLocation.id)) {
    throw new AppError(
      "VALIDATION_FAILED",
      "The main location cannot be deleted.",
      400,
      false,
      { companyId: company.id, companyLocationId: targetLocation.id },
    );
  }

  if (company.locations.nodes.length <= 1) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Cannot delete the only company location.",
      400,
      false,
      { companyId: company.id, companyLocationId: targetLocation.id },
    );
  }

  if ((targetLocation.ordersCount?.count ?? 0) > 0) {
    throw new AppError(
      "VALIDATION_FAILED",
      "This location has orders and cannot be deleted.",
      400,
      false,
      { companyId: company.id, companyLocationId: targetLocation.id },
    );
  }

  await executeAdminGraphql({
    context,
    document: COMPANY_LOCATION_DELETE_MUTATION,
    operationName: "CompanyLocationDelete",
    fallbackMessage: "Could not delete company location in Shopify.",
    dataSchema: CompanyLocationDeleteDataSchema,
    userErrorPath: ["companyLocationDelete"],
    variables: {
      companyLocationId: targetLocation.id,
    },
  });

  return DeleteCompanyLocationResponseSchema.parse({
    companyId: company.id,
    companyLocationId: targetLocation.id,
    deleted: true,
  });
}
