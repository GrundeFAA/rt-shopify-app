import { z } from "zod";

const NorwayAddressSchema = z.object({
  country: z.literal("NO"),
  line1: z.string().trim().min(1),
  line2: z.string().trim(),
  postal_code: z.string().trim().min(1),
  city: z.string().trim().min(1),
});

const UserSchema = z.object({
  first_name: z.string().trim().min(1),
  last_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional().default(""),
});

const CompanyDeliverySchema = z.discriminatedUnion("same_as_invoice", [
  z.object({
    same_as_invoice: z.literal(true),
    address: z.null(),
  }),
  z.object({
    same_as_invoice: z.literal(false),
    address: NorwayAddressSchema,
  }),
]);

export const RegisterCompanyPayloadSchema = z.object({
  version: z.literal(1),
  account_type: z.literal("company"),
  user: UserSchema,
  company: z
    .object({
      name: z.string().trim().min(1),
      organization_number: z.string().trim().min(1),
      location_name: z.string().trim().min(1).optional(),
      locationName: z.string().trim().min(1).optional(),
      invoice: z.object({
        electronic_invoice: z.boolean(),
        email: z.string().trim().email().or(z.literal("")),
        address: NorwayAddressSchema,
      }),
      delivery: CompanyDeliverySchema,
    })
    .transform((company) => ({
      ...company,
      location_name: company.location_name ?? company.locationName ?? "",
    }))
    .pipe(
      z.object({
        name: z.string().trim().min(1),
        organization_number: z.string().trim().min(1),
        location_name: z.string().trim().min(1),
        invoice: z.object({
          electronic_invoice: z.boolean(),
          email: z.string().trim().email().or(z.literal("")),
          address: NorwayAddressSchema,
        }),
        delivery: CompanyDeliverySchema,
      }),
    ),
});

export const RegisterCompanySuccessSchema = z.object({
  ok: z.literal(true),
  customerId: z.string(),
  companyId: z.string(),
  companyLocationId: z.string(),
  createdCustomer: z.boolean(),
  createdCompany: z.boolean(),
  createdLocation: z.boolean(),
});

export type RegisterCompanyPayload = z.infer<typeof RegisterCompanyPayloadSchema>;
export type RegisterCompanySuccess = z.infer<typeof RegisterCompanySuccessSchema>;

export function normalizeOrganizationNumber(input: string): string {
  return input.replace(/\D+/g, "");
}
