import { z } from "zod";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import type {
  CreateCompanyLocationInput,
  CreateCompanyLocationResponse,
} from "../schemas/company.schema";
import {
  CreateCompanyLocationResponseSchema,
  SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP,
  SHOPIFY_COMPANY_LOCATION_ROLE_VALUES,
} from "../schemas/company.schema";
import {
  COMPANY_CONTACT_ASSIGN_ROLES_MUTATION,
  COMPANY_LOCATION_CREATE_MUTATION,
  COMPANY_MAIN_LOCATION_QUERY,
  UPDATE_COMPANY_SETTINGS_MUTATION,
} from "./company.admin-graphql";

const CompanyRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const CompanyAddressSchema = z
  .object({
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    province: z.string().nullable().optional(),
    zip: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const CompanyManagementDataSchema = z.object({
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
            taxSettings: z
              .object({
                taxRegistrationId: z.string().nullable().optional(),
              })
              .nullable()
              .optional(),
            billingAddress: CompanyAddressSchema,
            shippingAddress: CompanyAddressSchema,
          }),
        ),
      }),
    })
    .nullable(),
});

const CompanyLocationCreateDataSchema = z.object({
  companyLocationCreate: z.object({
    companyLocation: z
      .object({
        id: z.string(),
        name: z.string(),
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
type ManagedCompanyAddress = NonNullable<ManagedCompany["locations"]["nodes"][number]["billingAddress"]>;

function idsMatch(leftId: string | null | undefined, rightId: string | null | undefined) {
  if (!leftId || !rightId) {
    return false;
  }

  return leftId === rightId || leftId.endsWith(`/${rightId}`) || rightId.endsWith(`/${leftId}`);
}

function findCompanyContactIdByCustomerId(
  contactIdByCustomerId: Map<string, string>,
  customerId: string,
): string | null {
  for (const [contactCustomerId, companyContactId] of contactIdByCustomerId.entries()) {
    if (idsMatch(contactCustomerId, customerId)) {
      return companyContactId;
    }
  }

  return null;
}

function getAdministratorIds(company: ManagedCompany) {
  const fromReferences =
    company.administrators?.references?.nodes.map((node) => node.id).filter(Boolean) ?? [];
  const fromJson = Array.isArray(company.administrators?.jsonValue)
    ? company.administrators.jsonValue.filter(Boolean)
    : [];

  return [...new Set([...fromReferences, ...fromJson])];
}

function mapInheritedBillingAddress(address: ManagedCompanyAddress | null | undefined) {
  return {
    address1: address?.address1 ?? "",
    address2: address?.address2 ?? "",
    city: address?.city ?? "",
    zip: address?.zip ?? "",
    countryCode: "NO",
    ...(address?.province ? { zoneCode: address.province } : {}),
  };
}

function mapDeliveryAddress(address: CreateCompanyLocationInput["deliveryAddress"]) {
  return {
    address1: address.line1,
    address2: address.line2 || undefined,
    city: address.city,
    zip: address.postalCode,
    countryCode: "NO",
  };
}

function resolveCompanyContactRoleId(
  roles: ManagedCompany["contactRoles"]["nodes"],
  requestedRole: (typeof SHOPIFY_COMPANY_LOCATION_ROLE_VALUES)[number],
) {
  const expectedRoleName = SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP[requestedRole];
  return roles.find((role) => role.name === expectedRoleName)?.id ?? null;
}

export async function createCompanyLocation(
  context: AdminServiceContext,
  currentCustomerId: string,
  input: CreateCompanyLocationInput,
): Promise<CreateCompanyLocationResponse> {
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
      "Only company administrators can add locations.",
      403,
      false,
      { companyId: company.id, customerId: currentCustomerId },
    );
  }

  const fallbackMainLocation =
    company.locations.nodes.find((location) =>
      idsMatch(location.id, company.mainLocationId?.value ?? ""),
    ) ?? company.locations.nodes[0];

  if (!fallbackMainLocation) {
    throw new AppError(
      "RESOURCE_NOT_FOUND",
      "No main location is configured for this company.",
      404,
      false,
      { companyId: company.id },
    );
  }

  const createResult = await executeAdminGraphql({
    context,
    document: COMPANY_LOCATION_CREATE_MUTATION,
    operationName: "CompanyLocationCreate",
    fallbackMessage: "Could not create company location in Shopify.",
    dataSchema: CompanyLocationCreateDataSchema,
    userErrorPath: ["companyLocationCreate"],
    variables: {
      companyId: company.id,
      input: {
        name: input.locationName,
        taxRegistrationId: fallbackMainLocation.taxSettings?.taxRegistrationId ?? undefined,
        billingAddress: mapInheritedBillingAddress(
          fallbackMainLocation.billingAddress ?? fallbackMainLocation.shippingAddress,
        ),
        shippingAddress: mapDeliveryAddress(input.deliveryAddress),
      },
    },
  });

  const createdLocation = createResult.companyLocationCreate.companyLocation;
  if (!createdLocation) {
    throw new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Shopify did not return a created company location.",
      502,
      true,
      { companyId: company.id, shop: context.shop },
    );
  }

  const contactIdByCustomerId = new Map(
    company.contacts.nodes
      .filter(
        (
          contact,
        ): contact is typeof contact & { customer: { id: string; email?: string | null } } =>
          Boolean(contact.customer?.id),
      )
      .map((contact) => [contact.customer.id, contact.id]),
  );

  for (const selectedUser of input.selectedUsers) {
    const companyContactId = findCompanyContactIdByCustomerId(
      contactIdByCustomerId,
      selectedUser.customerId,
    );
    if (!companyContactId) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Selected user is not attached to this company.",
        400,
        false,
        { customerId: selectedUser.customerId, companyId: company.id },
      );
    }

    const companyContactRoleId = resolveCompanyContactRoleId(
      company.contactRoles.nodes,
      selectedUser.role,
    );
    if (!companyContactRoleId) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Selected role is not available for this company.",
        400,
        false,
        {
          role: selectedUser.role,
          companyId: company.id,
          expectedRoleName: SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP[selectedUser.role],
          availableRoles: company.contactRoles.nodes.map((role) => role.name),
        },
      );
    }

    await executeAdminGraphql({
      context,
      document: COMPANY_CONTACT_ASSIGN_ROLES_MUTATION,
      operationName: "CompanyContactAssignRoles",
      fallbackMessage: "Could not assign location roles in Shopify.",
      dataSchema: CompanyAssignRolesDataSchema,
      userErrorPath: ["companyContactAssignRoles"],
      variables: {
        companyContactId,
        rolesToAssign: [
          {
            companyContactRoleId,
            companyLocationId: createdLocation.id,
          },
        ],
      },
    });
  }

  const mainLocationId = company.mainLocationId?.value ?? fallbackMainLocation.id;
  if (!company.mainLocationId?.value) {
    await executeAdminGraphql({
      context,
      document: UPDATE_COMPANY_SETTINGS_MUTATION,
      operationName: "SetMainLocationId",
      fallbackMessage: "Could not persist company main location metadata.",
      dataSchema: MetafieldsSetDataSchema,
      userErrorPath: ["metafieldsSet"],
      variables: {
        metafields: [
          {
            ownerId: company.id,
            namespace: "custom",
            key: "main_location_id",
            type: "single_line_text_field",
            value: fallbackMainLocation.id,
          },
        ],
      },
    });
  }

  return CreateCompanyLocationResponseSchema.parse({
    companyId: company.id,
    companyLocationId: createdLocation.id,
    mainLocationId,
    locationName: createdLocation.name,
  });
}
