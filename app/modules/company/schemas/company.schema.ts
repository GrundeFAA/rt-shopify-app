import { z } from "zod";

const ShopifyIdSchema = z.string().trim().min(1);
export const SHOPIFY_COMPANY_LOCATION_ROLE_VALUES = ["admin", "buyer"] as const;
export const SHOPIFY_COMPANY_LOCATION_ROLE_NAME_MAP = {
  admin: "Location admin",
  buyer: "Ordering only",
} as const satisfies Record<
  (typeof SHOPIFY_COMPANY_LOCATION_ROLE_VALUES)[number],
  string
>;

export const CompanyIdInputSchema = z.object({
  companyId: ShopifyIdSchema,
});

export const UpdateCompanySettingsInputSchema = CompanyIdInputSchema.extend({
  ehf: z.boolean(),
  invoiceEmail: z.union([z.string().trim().email(), z.literal("")]),
});

export const CompanySettingsResponseSchema = z.object({
  companyId: ShopifyIdSchema,
  companyName: z.string(),
  ehf: z.boolean(),
  invoiceEmail: z.string(),
});

export const CompanyLocationSummarySchema = z.object({
  id: ShopifyIdSchema,
  name: z.string(),
});

export const CustomerAccountCompanySettingsLoadInputSchema = z.object({
  authenticatedCompanyId: ShopifyIdSchema.optional(),
  currentLocationId: ShopifyIdSchema.optional(),
});

const CustomerAccountContactSchema = z.object({
  id: ShopifyIdSchema,
  customer: z.object({
    id: ShopifyIdSchema,
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    emailAddress: z.object({
      emailAddress: z.string().nullable(),
    }),
  }),
});

const CustomerAccountRoleAssignmentSchema = z.object({
  contact: z.object({
    id: ShopifyIdSchema,
  }),
  role: z.object({
    id: ShopifyIdSchema,
    name: z.string(),
  }),
});

export const CustomerAccountCompanyLocationSchema = z.object({
  id: ShopifyIdSchema,
  name: z.string(),
  hasOrders: z.boolean(),
  shippingAddress: z.object({
    address1: z.string().nullable(),
    city: z.string().nullable(),
    zip: z.string().nullable(),
    country: z.string().nullable(),
  }),
  contacts: z.object({
    nodes: z.array(CustomerAccountContactSchema),
  }),
  roleAssignments: z.object({
    nodes: z.array(CustomerAccountRoleAssignmentSchema),
  }),
});

export const CustomerAccountCompanySettingsResponseSchema = z.object({
  companyId: ShopifyIdSchema,
  administratorIds: z.array(ShopifyIdSchema),
  ehf: z.boolean(),
  invoiceEmail: z.string(),
  isAdmin: z.boolean(),
  mainLocationId: ShopifyIdSchema.nullable(),
  locations: z.array(CustomerAccountCompanyLocationSchema),
});

export const CompanyLocationMembersInputSchema = z.object({
  companyId: ShopifyIdSchema,
  locationId: ShopifyIdSchema,
});

export const CompanyLocationMembersResponseSchema = z.array(
  z.object({
    id: ShopifyIdSchema,
    name: z.string(),
    permission: z.string(),
    email: z.string(),
  }),
);

export const CompanyUserAssignmentSchema = z.object({
  companyLocationId: ShopifyIdSchema,
  companyLocationName: z.string(),
  companyContactRoleAssignmentId: ShopifyIdSchema,
  role: z.enum(SHOPIFY_COMPANY_LOCATION_ROLE_VALUES),
  roleName: z.string(),
});

export const CompanyUserSchema = z.object({
  id: ShopifyIdSchema,
  companyContactId: ShopifyIdSchema,
  name: z.string(),
  email: z.string(),
  isMainContact: z.boolean(),
  title: z.string().nullable(),
  roles: z.array(z.string()),
  companyLocations: z.array(CompanyLocationSummarySchema),
  assignments: z.array(CompanyUserAssignmentSchema),
});

export const CompanyUsersResponseSchema = z.object({
  companyId: ShopifyIdSchema,
  companyName: z.string(),
  users: z.array(CompanyUserSchema),
});

export const CompanyLocationSchema = z.object({
  id: ShopifyIdSchema,
  name: z.string(),
  shippingAddress: z.object({
    address1: z.string().nullable(),
    address2: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable(),
    zip: z.string().nullable(),
    country: z.string().nullable(),
  }),
});

export const CompanyLocationsResponseSchema = z.object({
  companyId: ShopifyIdSchema,
  companyName: z.string(),
  mainLocationId: ShopifyIdSchema.nullable(),
  locations: z.array(CompanyLocationSchema),
});

export const CreateCompanyLocationAddressSchema = z.object({
  line1: z.string().trim().min(1),
  line2: z.string().trim().default(""),
  postalCode: z.string().trim().min(1),
  city: z.string().trim().min(1),
  country: z.literal("NO").default("NO"),
});

export const CreateCompanyLocationAssignmentSchema = z.object({
  customerId: ShopifyIdSchema,
  role: z.enum(SHOPIFY_COMPANY_LOCATION_ROLE_VALUES),
});

export const CreateCompanyLocationInputSchema = CompanyIdInputSchema.extend({
  deliveryAddress: CreateCompanyLocationAddressSchema,
  locationName: z.string().trim().min(1),
  selectedUsers: z.array(CreateCompanyLocationAssignmentSchema),
});

export const CreateCompanyLocationResponseSchema = z.object({
  companyId: ShopifyIdSchema,
  companyLocationId: ShopifyIdSchema,
  mainLocationId: ShopifyIdSchema,
  locationName: z.string(),
});

export const DeleteCompanyLocationInputSchema = CompanyIdInputSchema.extend({
  companyLocationId: ShopifyIdSchema,
});

export const DeleteCompanyLocationResponseSchema = z.object({
  companyId: ShopifyIdSchema,
  companyLocationId: ShopifyIdSchema,
  deleted: z.boolean(),
});

export const SetCompanyMainLocationInputSchema = CompanyIdInputSchema.extend({
  companyLocationId: ShopifyIdSchema,
});

export const SetCompanyMainLocationResponseSchema = z.object({
  companyId: ShopifyIdSchema,
  mainLocationId: ShopifyIdSchema,
});

export const InviteCompanyUserAssignmentSchema = z.object({
  companyLocationId: ShopifyIdSchema,
  role: z.enum(SHOPIFY_COMPANY_LOCATION_ROLE_VALUES),
});

export const InviteCompanyUserInputSchema = CompanyIdInputSchema.extend({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  companyAdmin: z.boolean().default(false),
  assignments: z.array(InviteCompanyUserAssignmentSchema).min(1),
});

export const InviteCompanyUserResponseSchema = z.object({
  companyId: ShopifyIdSchema,
  customerId: ShopifyIdSchema,
  companyContactId: ShopifyIdSchema,
  companyAdmin: z.boolean(),
  assignmentsCreated: z.number().int().nonnegative(),
});

export const UpdateCompanyUserInputSchema = CompanyIdInputSchema.extend({
  companyAdmin: z.boolean().default(false),
  customerId: ShopifyIdSchema,
  assignments: z.array(InviteCompanyUserAssignmentSchema).min(1),
});

export const UpdateCompanyUserResponseSchema = z.object({
  companyAdmin: z.boolean(),
  companyId: ShopifyIdSchema,
  customerId: ShopifyIdSchema,
  assignmentsCreated: z.number().int().nonnegative(),
  assignmentsRevoked: z.number().int().nonnegative(),
});

export type CompanyIdInput = z.infer<typeof CompanyIdInputSchema>;
export type UpdateCompanySettingsInput = z.infer<typeof UpdateCompanySettingsInputSchema>;
export type CompanySettingsResponse = z.infer<typeof CompanySettingsResponseSchema>;
export type CompanyUsersResponse = z.infer<typeof CompanyUsersResponseSchema>;
export type CompanyLocationsResponse = z.infer<typeof CompanyLocationsResponseSchema>;
export type CustomerAccountCompanySettingsLoadInput = z.infer<
  typeof CustomerAccountCompanySettingsLoadInputSchema
>;
export type CustomerAccountCompanySettingsResponse = z.infer<
  typeof CustomerAccountCompanySettingsResponseSchema
>;
export type CompanyLocationMembersInput = z.infer<typeof CompanyLocationMembersInputSchema>;
export type CompanyLocationMembersResponse = z.infer<typeof CompanyLocationMembersResponseSchema>;
export type CreateCompanyLocationInput = z.infer<typeof CreateCompanyLocationInputSchema>;
export type CreateCompanyLocationResponse = z.infer<typeof CreateCompanyLocationResponseSchema>;
export type DeleteCompanyLocationInput = z.infer<typeof DeleteCompanyLocationInputSchema>;
export type DeleteCompanyLocationResponse = z.infer<typeof DeleteCompanyLocationResponseSchema>;
export type SetCompanyMainLocationInput = z.infer<typeof SetCompanyMainLocationInputSchema>;
export type SetCompanyMainLocationResponse = z.infer<typeof SetCompanyMainLocationResponseSchema>;
export type InviteCompanyUserInput = z.infer<typeof InviteCompanyUserInputSchema>;
export type InviteCompanyUserResponse = z.infer<typeof InviteCompanyUserResponseSchema>;
export type UpdateCompanyUserInput = z.infer<typeof UpdateCompanyUserInputSchema>;
export type UpdateCompanyUserResponse = z.infer<typeof UpdateCompanyUserResponseSchema>;
