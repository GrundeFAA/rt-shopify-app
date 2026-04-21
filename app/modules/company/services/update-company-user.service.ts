import { z } from "zod";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import type {
  UpdateCompanyUserInput,
  UpdateCompanyUserResponse,
} from "../schemas/company.schema";
import {
  SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP,
  SHOPIFY_COMPANY_LOCATION_ROLE_VALUES,
  UpdateCompanyUserResponseSchema,
} from "../schemas/company.schema";
import {
  COMPANY_CONTACT_ASSIGN_ROLES_MUTATION,
  COMPANY_CONTACT_REVOKE_ROLES_MUTATION,
  COMPANY_MAIN_LOCATION_QUERY,
  UPDATE_COMPANY_SETTINGS_MUTATION,
} from "./company.admin-graphql";

const CompanyRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const CompanyManagementDataSchema = z.object({
  company: z
    .object({
      id: z.string(),
      name: z.string(),
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
      contactRoles: z.object({
        nodes: z.array(CompanyRoleSchema),
      }),
      contacts: z.object({
        nodes: z.array(
          z.object({
            id: z.string(),
            customer: z
              .object({
                id: z.string(),
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
                  role: CompanyRoleSchema.nullable().optional(),
                }),
              ),
            }),
          }),
        ),
      }),
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

const CompanyAssignRolesDataSchema = z.object({
  companyContactAssignRoles: z.object({
    roleAssignments: z.array(
      z.object({
        companyLocation: z
          .object({
            id: z.string(),
            name: z.string(),
          })
          .nullable()
          .optional(),
        role: CompanyRoleSchema.nullable().optional(),
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

const CompanyRevokeRolesDataSchema = z.object({
  companyContactRevokeRoles: z.object({
    revokedRoleAssignmentIds: z.array(z.string()),
    userErrors: z.array(
      z.object({
        field: z.array(z.union([z.string(), z.number()])).nullable().optional(),
        message: z.string(),
      }),
    ),
  }),
});

const MetafieldsSetDataSchema = z.object({
  metafieldsSet: z.object({
    metafields: z.array(
      z.object({
        id: z.string(),
        key: z.string(),
        namespace: z.string(),
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

type CompanyManagementData = z.infer<typeof CompanyManagementDataSchema>;
type ManagedCompany = NonNullable<CompanyManagementData["company"]>;
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

function resolveCompanyContactRoleId(
  roles: ManagedCompany["contactRoles"]["nodes"],
  requestedRole: (typeof SHOPIFY_COMPANY_LOCATION_ROLE_VALUES)[number],
) {
  const expectedRoleName = SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP[requestedRole];
  return roles.find((role) => role.name === expectedRoleName)?.id ?? null;
}

function findCompanyContactByCustomerId(
  company: ManagedCompany,
  customerId: string,
): ManagedCompanyContact | null {
  return (
    company.contacts.nodes.find((contact) => idsMatch(contact.customer?.id ?? "", customerId)) ??
    null
  );
}

export async function updateCompanyUser(
  context: AdminServiceContext,
  currentCustomerId: string,
  input: UpdateCompanyUserInput,
): Promise<UpdateCompanyUserResponse> {
  const companyId = toShopifyGid("Company", input.companyId);
  const companyData = await executeAdminGraphql({
    context,
    document: COMPANY_MAIN_LOCATION_QUERY,
    operationName: "CompanyUserManagement",
    fallbackMessage: "Could not load company user management data from Shopify.",
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
      "Only company administrators can edit users.",
      403,
      false,
      { companyId: company.id, customerId: currentCustomerId },
    );
  }

  const companyContact = findCompanyContactByCustomerId(company, input.customerId);
  if (!companyContact) {
    throw new AppError(
      "RESOURCE_NOT_FOUND",
      "User was not found in this company.",
      404,
      false,
      { companyId: company.id, customerId: input.customerId },
    );
  }

  for (const assignment of input.assignments) {
    const hasMatchingLocation = company.locations.nodes.some((location) =>
      idsMatch(location.id, assignment.companyLocationId),
    );
    if (!hasMatchingLocation) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Selected location does not belong to this company.",
        400,
        false,
        { companyId: company.id, companyLocationId: assignment.companyLocationId },
      );
    }
  }

  const currentAssignmentsByLocationId = new Map(
    companyContact.roleAssignments.nodes
      .filter(
        (
          assignment,
        ): assignment is typeof assignment & {
          id: string;
          companyLocation: { id: string; name: string };
          role: { id: string; name: string };
        } => Boolean(assignment.id && assignment.companyLocation?.id && assignment.role?.name),
      )
      .map((assignment) => [assignment.companyLocation.id, assignment]),
  );
  const desiredAssignmentsByLocationId = new Map(
    input.assignments.map((assignment) => [assignment.companyLocationId, assignment]),
  );

  const companyContactsByLocationId = new Map();
  for (const contact of company.contacts.nodes) {
    for (const assignment of contact.roleAssignments.nodes) {
      const companyLocationId = assignment.companyLocation?.id;
      if (!companyLocationId) {
        continue;
      }

      const existingCustomerIds = companyContactsByLocationId.get(companyLocationId) ?? new Set();
      if (contact.customer?.id) {
        existingCustomerIds.add(contact.customer.id);
      }
      companyContactsByLocationId.set(companyLocationId, existingCustomerIds);
    }
  }

  for (const [companyLocationId, assignedCustomerIds] of companyContactsByLocationId.entries()) {
    const remainingCustomerIds = new Set(assignedCustomerIds);

    if (!desiredAssignmentsByLocationId.has(companyLocationId)) {
      remainingCustomerIds.delete(input.customerId);
    }

    if (remainingCustomerIds.size === 0) {
      const locationName =
        company.locations.nodes.find((location) => location.id === companyLocationId)?.name ??
        companyLocationId;
      throw new AppError(
        "VALIDATION_FAILED",
        "A location must have at least one assigned user.",
        400,
        false,
        { companyLocationId, locationName },
      );
    }
  }

  const roleAssignmentIdsToRevoke = [];
  const assignmentsToCreate = [];

  for (const [companyLocationId, currentAssignment] of currentAssignmentsByLocationId.entries()) {
    const desiredAssignment = desiredAssignmentsByLocationId.get(companyLocationId);
    if (!desiredAssignment) {
      roleAssignmentIdsToRevoke.push(currentAssignment.id);
      continue;
    }

    const expectedRoleName = SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP[desiredAssignment.role];
    if (currentAssignment.role.name !== expectedRoleName) {
      roleAssignmentIdsToRevoke.push(currentAssignment.id);
      assignmentsToCreate.push(desiredAssignment);
    }
  }

  for (const [companyLocationId, desiredAssignment] of desiredAssignmentsByLocationId.entries()) {
    if (!currentAssignmentsByLocationId.has(companyLocationId)) {
      assignmentsToCreate.push(desiredAssignment);
    }
  }

  if (roleAssignmentIdsToRevoke.length > 0) {
    await executeAdminGraphql({
      context,
      document: COMPANY_CONTACT_REVOKE_ROLES_MUTATION,
      operationName: "CompanyContactRevokeRoles",
      fallbackMessage: "Could not revoke user roles in Shopify.",
      dataSchema: CompanyRevokeRolesDataSchema,
      userErrorPath: ["companyContactRevokeRoles"],
      variables: {
        companyContactId: companyContact.id,
        roleAssignmentIds: roleAssignmentIdsToRevoke,
      },
    });
  }

  for (const assignment of assignmentsToCreate) {
    const companyContactRoleId = resolveCompanyContactRoleId(
      company.contactRoles.nodes,
      assignment.role,
    );

    if (!companyContactRoleId) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Selected role is not available for this company.",
        400,
        false,
        {
          role: assignment.role,
          companyId: company.id,
          expectedRoleName: SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP[assignment.role],
          availableRoles: company.contactRoles.nodes.map((role) => role.name),
        },
      );
    }

    await executeAdminGraphql({
      context,
      document: COMPANY_CONTACT_ASSIGN_ROLES_MUTATION,
      operationName: "CompanyContactAssignRoles",
      fallbackMessage: "Could not assign user roles in Shopify.",
      dataSchema: CompanyAssignRolesDataSchema,
      userErrorPath: ["companyContactAssignRoles"],
      variables: {
        companyContactId: companyContact.id,
        rolesToAssign: [
          {
            companyContactRoleId,
            companyLocationId: assignment.companyLocationId,
          },
        ],
      },
    });
  }

  const nextAdministratorIds = input.companyAdmin
    ? [...new Set([...administratorIds, input.customerId])]
    : administratorIds.filter((administratorId) => !idsMatch(administratorId, input.customerId));

  if (nextAdministratorIds.length === 0) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Company must have at least one administrator.",
      400,
      false,
      { companyId: company.id, customerId: input.customerId },
    );
  }

  await executeAdminGraphql({
    context,
    document: UPDATE_COMPANY_SETTINGS_MUTATION,
    operationName: "UpdateCompanyAdministrators",
    fallbackMessage: "Could not update company administrators.",
    dataSchema: MetafieldsSetDataSchema,
    userErrorPath: ["metafieldsSet"],
    variables: {
      metafields: [
        {
          ownerId: company.id,
          namespace: "custom",
          key: "administrators",
          type: "list.customer_reference",
          value: JSON.stringify(nextAdministratorIds),
        },
      ],
    },
  });

  return UpdateCompanyUserResponseSchema.parse({
    companyAdmin: input.companyAdmin,
    companyId: company.id,
    customerId: input.customerId,
    assignmentsCreated: assignmentsToCreate.length,
    assignmentsRevoked: roleAssignmentIdsToRevoke.length,
  });
}
