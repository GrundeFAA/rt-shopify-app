import { z } from "zod";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import type {
  InviteCompanyUserInput,
  InviteCompanyUserResponse,
} from "../schemas/company.schema";
import {
  InviteCompanyUserResponseSchema,
  SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP,
  SHOPIFY_COMPANY_LOCATION_ROLE_VALUES,
} from "../schemas/company.schema";
import {
  COMPANY_ASSIGN_CUSTOMER_AS_CONTACT_MUTATION,
  COMPANY_CONTACT_ASSIGN_ROLES_MUTATION,
  COMPANY_MAIN_LOCATION_QUERY,
  CUSTOMER_BY_EMAIL_QUERY,
  CUSTOMER_CREATE_MUTATION,
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

const CustomerLookupSchema = z.object({
  customers: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        email: z.string().nullable().optional(),
      }),
    ),
  }),
});

const CustomerCreateSchema = z.object({
  customerCreate: z.object({
    customer: z
      .object({
        id: z.string(),
        email: z.string().nullable().optional(),
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

const CompanyAssignCustomerSchema = z.object({
  companyAssignCustomerAsContact: z.object({
    companyContact: z
      .object({
        id: z.string(),
        customer: z
          .object({
            id: z.string(),
            email: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
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

function buildCustomerEmailSearch(email: string): string {
  return `email:"${email.replace(/"/g, '\\"')}"`;
}

function resolveCompanyContactRoleId(
  roles: ManagedCompany["contactRoles"]["nodes"],
  requestedRole: (typeof SHOPIFY_COMPANY_LOCATION_ROLE_VALUES)[number],
) {
  const expectedRoleName = SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP[requestedRole];
  return roles.find((role) => role.name === expectedRoleName)?.id ?? null;
}

async function findCustomerByEmail(context: AdminServiceContext, email: string) {
  const data = await executeAdminGraphql({
    context,
    document: CUSTOMER_BY_EMAIL_QUERY,
    operationName: "CustomerByEmail",
    fallbackMessage: "Could not look up customer by email.",
    dataSchema: CustomerLookupSchema,
    variables: {
      query: buildCustomerEmailSearch(email),
    },
  });

  return data.customers.nodes[0] ?? null;
}

async function createCustomer(
  context: AdminServiceContext,
  input: InviteCompanyUserInput,
) {
  const data = await executeAdminGraphql({
    context,
    document: CUSTOMER_CREATE_MUTATION,
    operationName: "InviteCreateCustomer",
    fallbackMessage: "Could not create customer in Shopify.",
    dataSchema: CustomerCreateSchema,
    userErrorPath: ["customerCreate"],
    variables: {
      input: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    },
  });

  if (!data.customerCreate.customer) {
    throw new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Shopify did not return a created customer.",
      502,
      true,
      { shop: context.shop },
    );
  }

  return data.customerCreate.customer;
}

export async function inviteCompanyUser(
  context: AdminServiceContext,
  currentCustomerId: string,
  input: InviteCompanyUserInput,
): Promise<InviteCompanyUserResponse> {
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
      "Only company administrators can invite users.",
      403,
      false,
      { companyId: company.id, customerId: currentCustomerId },
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

  const existingCustomer = await findCustomerByEmail(context, input.email);
  if (existingCustomer) {
    throw new AppError(
      "CUSTOMER_ALREADY_EXISTS",
      "An account with this email already exists. Use edit access instead.",
      409,
      false,
      {
        customerId: existingCustomer.id,
        email: input.email,
      },
    );
  }

  const customer = await createCustomer(context, input);

  const assignCustomerResult = await executeAdminGraphql({
    context,
    document: COMPANY_ASSIGN_CUSTOMER_AS_CONTACT_MUTATION,
    operationName: "CompanyAssignCustomerAsContact",
    fallbackMessage: "Could not attach customer to company.",
    dataSchema: CompanyAssignCustomerSchema,
    userErrorPath: ["companyAssignCustomerAsContact"],
    variables: {
      companyId: company.id,
      customerId: customer.id,
    },
  });

  const companyContact = assignCustomerResult.companyAssignCustomerAsContact.companyContact;
  if (!companyContact) {
    throw new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Shopify did not return a company contact.",
      502,
      true,
      { companyId: company.id, customerId: customer.id, shop: context.shop },
    );
  }

  for (const assignment of input.assignments) {
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

  if (input.companyAdmin) {
    const nextAdministratorIds = [...new Set([...administratorIds, customer.id])];

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
  }

  return InviteCompanyUserResponseSchema.parse({
    companyId: company.id,
    customerId: customer.id,
    companyContactId: companyContact.id,
    companyAdmin: input.companyAdmin,
    assignmentsCreated: input.assignments.length,
  });
}
