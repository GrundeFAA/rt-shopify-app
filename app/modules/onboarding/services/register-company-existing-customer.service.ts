import { z } from "zod";
import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql, toShopifyGid } from "../../shopify/admin.server";
import {
  normalizeOrganizationNumber,
  RegisterCompanyExistingCustomerInputSchema,
  RegisterCompanyExistingCustomerSuccessSchema,
  type RegisterCompanyExistingCustomerInput,
  type RegisterCompanyExistingCustomerSuccess,
} from "../schemas/register-company-existing-customer.schema";
import {
  COMPANY_ASSIGN_CUSTOMER_AS_CONTACT_MUTATION,
  COMPANY_BY_ID_QUERY,
  COMPANY_CONTACT_ASSIGN_ROLES_MUTATION,
  COMPANY_CREATE_MUTATION,
  COMPANY_LOCATION_CREATE_MUTATION,
  COMPANY_LOCATIONS_FOR_TAX_ID_QUERY,
  COMPANY_METAFIELDS_SET_MUTATION,
} from "./register-company.admin-graphql";

const CompanyRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const CompanyLocationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const CompanyWithBasicIdentitySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const CompanyContactSummarySchema = z.object({
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
        companyLocation: CompanyLocationSummarySchema.nullable().optional(),
        role: CompanyRoleSchema.nullable().optional(),
      }),
    ),
  }),
});

const CompanyAdministratorsSchema = z
  .object({
    jsonValue: z.array(z.string()).nullable().optional(),
    references: z.object({
      nodes: z.array(
        z.object({
          id: z.string(),
          __typename: z.literal("Customer"),
        }),
      ),
    }),
  })
  .nullable()
  .optional();

const CompanySummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  contactRoles: z.object({
    nodes: z.array(CompanyRoleSchema),
  }),
  administrators: CompanyAdministratorsSchema,
  contacts: z.object({
    nodes: z.array(CompanyContactSummarySchema),
  }),
  locations: z.object({
    nodes: z.array(CompanyLocationSummarySchema),
  }),
});

const CompanyLocationLookupSchema = z.object({
  companyLocations: z.object({
    pageInfo: z.object({
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable(),
    }),
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
        company: CompanyWithBasicIdentitySchema,
      }),
    ),
  }),
});

const CompanyByIdSchema = z.object({
  company: CompanySummarySchema.nullable(),
});

const CompanyCreateSchema = z.object({
  companyCreate: z.object({
    company: z
      .object({
        id: z.string(),
        name: z.string(),
      })
      .nullable(),
    userErrors: z.array(
      z.object({
        field: z.array(z.union([z.string(), z.number()])).nullable().optional(),
        message: z.string(),
        code: z.string().nullable().optional(),
      }),
    ),
  }),
});

const CompanyLocationCreateSchema = z.object({
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
        code: z.string().nullable().optional(),
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
        code: z.string().nullable().optional(),
      }),
    ),
  }),
});

const CompanyAssignRolesSchema = z.object({
  companyContactAssignRoles: z.object({
    roleAssignments: z.array(
      z.object({
        companyLocation: CompanyLocationSummarySchema.nullable().optional(),
        role: CompanyRoleSchema.nullable().optional(),
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

const CompanyMetafieldsSetSchema = z.object({
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
        code: z.string().nullable().optional(),
      }),
    ),
  }),
});

type CompanySummary = z.infer<typeof CompanySummarySchema>;
type CompanyLocationLookupData = z.infer<typeof CompanyLocationLookupSchema>;
type CompanyLocationLookupNode = CompanyLocationLookupData["companyLocations"]["nodes"][number];
type ExistingCompanyLocationMatch = {
  companyId: string;
  companyName: string;
  locationId: string;
  locationName: string;
};

function mapAddress(address: RegisterCompanyExistingCustomerInput["company"]["invoice"]["address"]) {
  return {
    address1: address.line1,
    address2: address.line2 || undefined,
    city: address.city,
    zip: address.postal_code,
    countryCode: "NO",
  };
}

function getDeliveryAddress(payload: RegisterCompanyExistingCustomerInput) {
  return payload.company.delivery.same_as_invoice
    ? payload.company.invoice.address
    : payload.company.delivery.address;
}

function getAdminRole(company: CompanySummary) {
  return company.contactRoles.nodes.find((role) =>
    role.name.toLowerCase().includes("admin"),
  );
}

function getAdministratorIds(company: CompanySummary): string[] {
  const fromReferences =
    company.administrators?.references.nodes.map((node) => node.id).filter(Boolean) ?? [];
  const fromJson = Array.isArray(company.administrators?.jsonValue)
    ? company.administrators.jsonValue.filter(Boolean)
    : [];

  return [...new Set([...fromReferences, ...fromJson])];
}

async function findLocationByTaxRegistrationId(
  context: AdminServiceContext,
  taxRegistrationId: string,
): Promise<ExistingCompanyLocationMatch | null> {
  const normalizedTaxRegistrationId = normalizeOrganizationNumber(taxRegistrationId);
  let after: string | null | undefined = null;

  for (let page = 0; page < 10; page += 1) {
    const data: CompanyLocationLookupData = await executeAdminGraphql({
      context,
      document: COMPANY_LOCATIONS_FOR_TAX_ID_QUERY,
      operationName: "CompanyLocationsForTaxId",
      fallbackMessage: "Could not look up company location by tax registration id.",
      dataSchema: CompanyLocationLookupSchema,
      variables: {
        first: 100,
        after,
      },
    });

    const matchingLocation = data.companyLocations.nodes.find(
      (location: CompanyLocationLookupNode) =>
        normalizeOrganizationNumber(location.taxSettings?.taxRegistrationId ?? "") ===
        normalizedTaxRegistrationId,
    );

    if (matchingLocation) {
      return {
        companyId: matchingLocation.company.id,
        companyName: matchingLocation.company.name,
        locationId: matchingLocation.id,
        locationName: matchingLocation.name,
      };
    }

    if (!data.companyLocations.pageInfo.hasNextPage) {
      return null;
    }

    after = data.companyLocations.pageInfo.endCursor;
    if (!after) {
      return null;
    }
  }

  throw new AppError(
    "SHOPIFY_TEMPORARY_FAILURE",
    "Could not complete company location lookup.",
    503,
    true,
    { taxRegistrationId, shop: context.shop },
  );
}

async function getCompanyById(
  context: AdminServiceContext,
  companyId: string,
) {
  const data = await executeAdminGraphql({
    context,
    document: COMPANY_BY_ID_QUERY,
    operationName: "CompanyForCustomerOnboarding",
    fallbackMessage: "Could not reload company details from Shopify.",
    dataSchema: CompanyByIdSchema,
    variables: { companyId },
  });

  if (!data.company) {
    throw new AppError("RESOURCE_NOT_FOUND", "Company was not found.", 404, false, {
      companyId,
      shop: context.shop,
    });
  }

  return data.company;
}

async function createCompany(
  context: AdminServiceContext,
  payload: RegisterCompanyExistingCustomerInput,
) {
  const deliveryAddress = getDeliveryAddress(payload);
  const data = await executeAdminGraphql({
    context,
    document: COMPANY_CREATE_MUTATION,
    operationName: "RegisterCompanyExistingCustomer",
    fallbackMessage: "Could not create company in Shopify.",
    dataSchema: CompanyCreateSchema,
    userErrorPath: ["companyCreate"],
    variables: {
      input: {
        company: {
          name: payload.company.name,
        },
        companyLocation: {
          name: payload.company.location_name,
          taxRegistrationId: normalizeOrganizationNumber(payload.company.organization_number),
          billingAddress: mapAddress(payload.company.invoice.address),
          shippingAddress: mapAddress(deliveryAddress),
        },
      },
    },
  });

  if (!data.companyCreate.company) {
    throw new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Shopify did not return a created company.",
      502,
      true,
      { shop: context.shop },
    );
  }

  return getCompanyById(context, data.companyCreate.company.id);
}

async function ensureLocation(
  context: AdminServiceContext,
  company: CompanySummary,
  payload: RegisterCompanyExistingCustomerInput,
) {
  const existingLocation = company.locations.nodes.find(
    (location) => location.name === payload.company.location_name,
  );

  if (existingLocation) {
    return { location: existingLocation, created: false };
  }

  const deliveryAddress = getDeliveryAddress(payload);
  const data = await executeAdminGraphql({
    context,
    document: COMPANY_LOCATION_CREATE_MUTATION,
    operationName: "RegisterCompanyLocation",
    fallbackMessage: "Could not create company location in Shopify.",
    dataSchema: CompanyLocationCreateSchema,
    userErrorPath: ["companyLocationCreate"],
    variables: {
      companyId: company.id,
      input: {
        name: payload.company.location_name,
        taxRegistrationId: normalizeOrganizationNumber(payload.company.organization_number),
        billingAddress: mapAddress(payload.company.invoice.address),
        shippingAddress: mapAddress(deliveryAddress),
      },
    },
  });

  if (!data.companyLocationCreate.companyLocation) {
    throw new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Shopify did not return a created company location.",
      502,
      true,
      { companyId: company.id, shop: context.shop },
    );
  }

  return {
    location: data.companyLocationCreate.companyLocation,
    created: true,
  };
}

async function ensureCompanyContact(
  context: AdminServiceContext,
  company: CompanySummary,
  customerId: string,
) {
  const existingContact = company.contacts.nodes.find(
    (contact) => contact.customer?.id === customerId,
  );

  if (existingContact) {
    return { companyContact: existingContact, created: false };
  }

  const data = await executeAdminGraphql({
    context,
    document: COMPANY_ASSIGN_CUSTOMER_AS_CONTACT_MUTATION,
    operationName: "RegisterCompanyContactExistingCustomer",
    fallbackMessage: "Could not attach customer to company.",
    dataSchema: CompanyAssignCustomerSchema,
    userErrorPath: ["companyAssignCustomerAsContact"],
    variables: {
      companyId: company.id,
      customerId,
    },
  });

  if (!data.companyAssignCustomerAsContact.companyContact) {
    throw new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Shopify did not return a company contact.",
      502,
      true,
      { companyId: company.id, customerId, shop: context.shop },
    );
  }

  return {
    companyContact: {
      ...data.companyAssignCustomerAsContact.companyContact,
      roleAssignments: { nodes: [] },
    },
    created: true,
  };
}

async function ensureLocationAdminRole(
  context: AdminServiceContext,
  company: CompanySummary,
  companyContactId: string,
  companyLocationId: string,
  existingAssignments: CompanySummary["contacts"]["nodes"][number]["roleAssignments"]["nodes"],
) {
  const alreadyAssigned = existingAssignments.some(
    (assignment) =>
      assignment.companyLocation?.id === companyLocationId &&
      assignment.role?.name?.toLowerCase().includes("admin"),
  );

  if (alreadyAssigned) {
    return;
  }

  const adminRole = getAdminRole(company);
  if (!adminRole) {
    throw new AppError(
      "INTERNAL_ERROR",
      "Could not resolve Shopify B2B admin role.",
      500,
      false,
      { companyId: company.id, shop: context.shop },
    );
  }

  await executeAdminGraphql({
    context,
    document: COMPANY_CONTACT_ASSIGN_ROLES_MUTATION,
    operationName: "RegisterCompanyContactRolesExistingCustomer",
    fallbackMessage: "Could not assign company admin role.",
    dataSchema: CompanyAssignRolesSchema,
    userErrorPath: ["companyContactAssignRoles"],
    variables: {
      companyContactId,
      rolesToAssign: [
        {
          companyContactRoleId: adminRole.id,
          companyLocationId,
        },
      ],
    },
  });
}

async function syncCompanyMetafields(
  context: AdminServiceContext,
  company: CompanySummary,
  payload: RegisterCompanyExistingCustomerInput,
  mainLocationId: string,
  customerId: string,
) {
  const administratorIds = [...new Set([...getAdministratorIds(company), customerId])];

  await executeAdminGraphql({
    context,
    document: COMPANY_METAFIELDS_SET_MUTATION,
    operationName: "RegisterCompanyMetafieldsExistingCustomer",
    fallbackMessage: "Could not update company metafields.",
    dataSchema: CompanyMetafieldsSetSchema,
    userErrorPath: ["metafieldsSet"],
    variables: {
      metafields: [
        {
          ownerId: company.id,
          namespace: "custom",
          key: "ehf",
          type: "boolean",
          value: String(payload.company.invoice.electronic_invoice),
        },
        {
          ownerId: company.id,
          namespace: "custom",
          key: "invoice_email",
          type: "single_line_text_field",
          value: payload.company.invoice.email,
        },
        {
          ownerId: company.id,
          namespace: "custom",
          key: "main_location_id",
          type: "single_line_text_field",
          value: mainLocationId,
        },
        {
          ownerId: company.id,
          namespace: "custom",
          key: "administrators",
          type: "list.customer_reference",
          value: JSON.stringify(administratorIds),
        },
      ],
    },
  });
}

export async function registerCompanyForExistingCustomer(
  context: AdminServiceContext,
  customerId: string,
  rawPayload: unknown,
): Promise<RegisterCompanyExistingCustomerSuccess> {
  const payload = RegisterCompanyExistingCustomerInputSchema.parse(rawPayload);
  const normalizedOrgNumber = normalizeOrganizationNumber(payload.company.organization_number);
  const existingLocation = await findLocationByTaxRegistrationId(context, normalizedOrgNumber);

  if (existingLocation) {
    throw new AppError(
      "COMPANY_ALREADY_EXISTS",
      "This company is already registered. Contact your company administrator for access.",
      409,
      false,
      {
        companyId: existingLocation.companyId,
        companyName: existingLocation.companyName,
        locationId: existingLocation.locationId,
        locationName: existingLocation.locationName,
      },
    );
  }

  const canonicalCustomerId = toShopifyGid("Customer", customerId);
  const company = await createCompany(context, payload);
  const createdCompany = true;

  const { location, created: createdLocation } = await ensureLocation(context, company, payload);
  const { companyContact } = await ensureCompanyContact(context, company, canonicalCustomerId);

  await ensureLocationAdminRole(
    context,
    company,
    companyContact.id,
    location.id,
    companyContact.roleAssignments.nodes,
  );

  await syncCompanyMetafields(context, company, payload, location.id, canonicalCustomerId);

  return RegisterCompanyExistingCustomerSuccessSchema.parse({
    ok: true,
    customerId: canonicalCustomerId,
    companyId: company.id,
    companyLocationId: location.id,
    createdCompany,
    createdLocation,
  });
}
