import { z } from "zod";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import type {
  CompanyLocationMembersInput,
  CompanyLocationMembersResponse,
  CustomerAccountCompanySettingsLoadInput,
  CustomerAccountCompanySettingsResponse,
} from "../schemas/company.schema";
import {
  CompanyLocationMembersResponseSchema,
  CustomerAccountCompanySettingsResponseSchema,
  SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP,
} from "../schemas/company.schema";
import { COMPANY_MAIN_LOCATION_QUERY } from "./company.admin-graphql";

const CompanyRoleAssignmentSchema = z.object({
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
});

const CompanyDashboardDataSchema = z.object({
  company: z
    .object({
      id: z.string(),
      name: z.string(),
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
      ehf: z
        .object({
          value: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
      invoiceEmail: z
        .object({
          value: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
      contacts: z.object({
        nodes: z.array(
          z.object({
            id: z.string(),
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
              nodes: z.array(CompanyRoleAssignmentSchema),
            }),
          }),
        ),
      }),
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
            shippingAddress: z
              .object({
                address1: z.string().nullable().optional(),
                city: z.string().nullable().optional(),
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

type ManagedCompany = NonNullable<z.infer<typeof CompanyDashboardDataSchema>["company"]>;
type ManagedCompanyContact = ManagedCompany["contacts"]["nodes"][number];

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

function buildLocationData(company: ManagedCompany) {
  return company.locations.nodes.map((location) => {
    const contactsForLocation: ManagedCompanyContact[] = [];
    const roleAssignments = [];

    for (const contact of company.contacts.nodes) {
      for (const assignment of contact.roleAssignments.nodes) {
        if (!idsMatch(assignment.companyLocation?.id, location.id)) {
          continue;
        }

        if (!assignment.role?.id || !assignment.role?.name) {
          roleAssignments.push({
            contact: { id: contact.id },
            role: {
              id: assignment.role?.id ?? "unknown",
              name: assignment.role?.name ?? SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP.buyer,
            },
          });
        } else {
          roleAssignments.push({
            contact: { id: contact.id },
            role: assignment.role,
          });
        }

        if (!contactsForLocation.some((entry) => idsMatch(entry.id, contact.id))) {
          contactsForLocation.push(contact);
        }
      }
    }

    return {
      id: location.id,
      name: location.name,
      hasOrders: (location.ordersCount?.count ?? 0) > 0,
      shippingAddress: {
        address1: location.shippingAddress?.address1 ?? null,
        city: location.shippingAddress?.city ?? null,
        zip: location.shippingAddress?.zip ?? null,
        country: location.shippingAddress?.country ?? null,
      },
      contacts: {
        nodes: contactsForLocation.map((contact) => ({
          id: contact.id,
          customer: {
            id: contact.customer?.id ?? contact.id,
            firstName: contact.customer?.firstName ?? null,
            lastName: contact.customer?.lastName ?? null,
            emailAddress: {
              emailAddress: contact.customer?.email ?? null,
            },
          },
        })),
      },
      roleAssignments: {
        nodes: roleAssignments,
      },
    };
  });
}

async function loadManagedCompany(
  context: AdminServiceContext,
  companyId: string,
): Promise<ManagedCompany> {
  const companyData = await executeAdminGraphql({
    context,
    document: COMPANY_MAIN_LOCATION_QUERY,
    operationName: "CompanyDashboardData",
    fallbackMessage: "Could not load company dashboard data from Shopify.",
    dataSchema: CompanyDashboardDataSchema,
    variables: { companyId: toShopifyGid("Company", companyId) },
  });

  if (!companyData.company) {
    throw new AppError("RESOURCE_NOT_FOUND", "Company was not found.", 404, false, {
      companyId,
      shop: context.shop,
    });
  }

  return companyData.company;
}

function findCurrentCustomerContact(company: ManagedCompany, currentCustomerId: string) {
  return company.contacts.nodes.find((contact) => idsMatch(contact.customer?.id, currentCustomerId)) ?? null;
}

export async function getCustomerAccountCompanyDashboard(
  context: AdminServiceContext,
  currentCustomerId: string,
  input: CustomerAccountCompanySettingsLoadInput,
): Promise<CustomerAccountCompanySettingsResponse> {
  if (!input.authenticatedCompanyId) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Missing company identifier in customer account context.",
      400,
      false,
    );
  }

  const company = await loadManagedCompany(context, input.authenticatedCompanyId);
  if (!idsMatch(company.id, input.authenticatedCompanyId)) {
    throw new AppError(
      "AUTH_FORBIDDEN",
      "Authenticated company does not match requested company.",
      403,
      false,
      { companyId: company.id, requestedCompanyId: input.authenticatedCompanyId },
    );
  }

  const currentCustomerContact = findCurrentCustomerContact(company, currentCustomerId);
  if (!currentCustomerContact) {
    throw new AppError(
      "AUTH_FORBIDDEN",
      "Authenticated customer is not a contact in this company.",
      403,
      false,
      { companyId: company.id, customerId: currentCustomerId },
    );
  }

  const administratorIds = getAdministratorIds(company);

  return CustomerAccountCompanySettingsResponseSchema.parse({
    companyId: company.id,
    administratorIds,
    ehf: company.ehf?.value === "true",
    invoiceEmail: company.invoiceEmail?.value ?? "",
    isAdmin: administratorIds.some((administratorId) => idsMatch(administratorId, currentCustomerId)),
    mainLocationId: company.mainLocationId?.value ?? null,
    locations: buildLocationData(company),
  });
}

export async function getCustomerAccountLocationMembers(
  context: AdminServiceContext,
  currentCustomerId: string,
  input: CompanyLocationMembersInput,
): Promise<CompanyLocationMembersResponse> {
  const company = await loadManagedCompany(context, input.companyId);

  const currentCustomerContact = findCurrentCustomerContact(company, currentCustomerId);
  if (!currentCustomerContact) {
    throw new AppError(
      "AUTH_FORBIDDEN",
      "Authenticated customer is not a contact in this company.",
      403,
      false,
      { companyId: company.id, customerId: currentCustomerId },
    );
  }

  const location = buildLocationData(company).find((entry) => idsMatch(entry.id, input.locationId));
  if (!location) {
    throw new AppError(
      "RESOURCE_NOT_FOUND",
      "Company location was not found.",
      404,
      false,
      { companyId: company.id, locationId: input.locationId },
    );
  }

  const roleNamesByContactId = new Map<string, string[]>();
  for (const assignment of location.roleAssignments.nodes) {
    const contactId = assignment.contact?.id;
    const roleName = assignment.role?.name;
    if (!contactId || !roleName) {
      continue;
    }
    const roleNames = roleNamesByContactId.get(contactId) ?? [];
    roleNames.push(roleName);
    roleNamesByContactId.set(contactId, roleNames);
  }

  return CompanyLocationMembersResponseSchema.parse(
    location.contacts.nodes.map((contact) => {
      const email = contact.customer?.emailAddress?.emailAddress ?? "-";
      const fullName = [contact.customer?.firstName, contact.customer?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      return {
        id: contact.id,
        name: fullName || email || "Unknown member",
        permission: (roleNamesByContactId.get(contact.id) ?? []).join(", ") || "Unknown permission",
        email,
      };
    }),
  );
}

export async function assertCustomerAccountCompanyAdmin(
  context: AdminServiceContext,
  currentCustomerId: string,
  companyId: string,
) {
  const company = await loadManagedCompany(context, companyId);
  const administratorIds = getAdministratorIds(company);

  if (!findCurrentCustomerContact(company, currentCustomerId)) {
    throw new AppError(
      "AUTH_FORBIDDEN",
      "Authenticated customer is not a contact in this company.",
      403,
      false,
      { companyId: company.id, customerId: currentCustomerId },
    );
  }

  if (!administratorIds.some((administratorId) => idsMatch(administratorId, currentCustomerId))) {
    throw new AppError(
      "AUTH_FORBIDDEN",
      "Only company administrators can update company settings.",
      403,
      false,
      { companyId: company.id, customerId: currentCustomerId },
    );
  }
}
