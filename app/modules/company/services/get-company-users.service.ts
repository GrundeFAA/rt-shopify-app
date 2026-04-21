import { z } from "zod";
import type { CompanyIdInput, CompanyUsersResponse } from "../schemas/company.schema";
import {
  CompanyUsersResponseSchema,
  SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP,
} from "../schemas/company.schema";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import { COMPANY_USERS_QUERY } from "./company.admin-graphql";

const CompanyUsersDataSchema = z.object({
  company: z
    .object({
      id: z.string(),
      name: z.string(),
      contacts: z.object({
        nodes: z.array(
          z.object({
            id: z.string(),
            isMainContact: z.boolean(),
            title: z.string().nullable().optional(),
            customer: z
              .object({
                id: z.string(),
                firstName: z.string().nullable().optional(),
                lastName: z.string().nullable().optional(),
                email: z.string().nullable().optional(),
              })
              .nullable()
              .optional(),
            roleAssignments: z.object({
              nodes: z.array(
                z.object({
                  id: z.string(),
                  companyLocation: z
                    .object({
                      id: z.string(),
                      name: z.string(),
                    })
                    .nullable()
                    .optional(),
                  role: z
                    .object({
                      id: z.string(),
                      name: z.string(),
                    })
                    .nullable()
                    .optional(),
                }),
              ),
            }),
          }),
        ),
      }),
    })
    .nullable(),
});

export async function getCompanyUsers(
  context: AdminServiceContext,
  input: CompanyIdInput,
): Promise<CompanyUsersResponse> {
  const companyId = toShopifyGid("Company", input.companyId);
  const data = await executeAdminGraphql({
    context,
    document: COMPANY_USERS_QUERY,
    operationName: "CompanyUsers",
    fallbackMessage: "Could not load company users from Shopify.",
    dataSchema: CompanyUsersDataSchema,
    variables: { companyId },
  });

  if (!data.company) {
    throw new AppError("RESOURCE_NOT_FOUND", "Company was not found.", 404, false, {
      companyId,
      shop: context.shop,
    });
  }

  const roleKeyByName = new Map<string, "admin" | "buyer">(
    Object.entries(SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP).map(([roleKey, roleName]) => [
      roleName,
      roleKey as "admin" | "buyer",
    ]),
  );

  const users = data.company.contacts.nodes.map((contact) => {
    const fullName = [contact.customer?.firstName, contact.customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const assignments = contact.roleAssignments.nodes
      .filter(
        (entry): entry is typeof entry & {
          id: string;
          companyLocation: { id: string; name: string };
          role: { id: string; name: string };
        } => Boolean(entry.id && entry.companyLocation?.id && entry.role?.name),
      )
      .map((entry) => ({
        companyLocationId: entry.companyLocation.id,
        companyLocationName: entry.companyLocation.name,
        companyContactRoleAssignmentId: entry.id,
        role: roleKeyByName.get(entry.role.name) ?? "buyer",
        roleName: entry.role.name,
      }));

    return {
      id: contact.customer?.id ?? contact.id,
      companyContactId: contact.id,
      name: fullName || contact.customer?.email || "Unknown user",
      email: contact.customer?.email ?? "",
      isMainContact: contact.isMainContact,
      title: contact.title ?? null,
      roles: [...new Set(contact.roleAssignments.nodes.map((entry) => entry.role?.name).filter(Boolean))],
      companyLocations: contact.roleAssignments.nodes
        .map((entry) => entry.companyLocation)
        .filter((location): location is { id: string; name: string } => Boolean(location)),
      assignments,
    };
  });

  return CompanyUsersResponseSchema.parse({
    companyId: data.company.id,
    companyName: data.company.name,
    users,
  });
}
