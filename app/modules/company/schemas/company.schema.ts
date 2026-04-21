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

export const CompanyUserSchema = z.object({
  id: ShopifyIdSchema,
  name: z.string(),
  email: z.string(),
  isMainContact: z.boolean(),
  title: z.string().nullable(),
  roles: z.array(z.string()),
  companyLocations: z.array(CompanyLocationSummarySchema),
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

export type CompanyIdInput = z.infer<typeof CompanyIdInputSchema>;
export type UpdateCompanySettingsInput = z.infer<typeof UpdateCompanySettingsInputSchema>;
export type CompanySettingsResponse = z.infer<typeof CompanySettingsResponseSchema>;
export type CompanyUsersResponse = z.infer<typeof CompanyUsersResponseSchema>;
export type CompanyLocationsResponse = z.infer<typeof CompanyLocationsResponseSchema>;
export type CreateCompanyLocationInput = z.infer<typeof CreateCompanyLocationInputSchema>;
export type CreateCompanyLocationResponse = z.infer<typeof CreateCompanyLocationResponseSchema>;
