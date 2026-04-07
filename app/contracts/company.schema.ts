import { z } from "zod";

export const CompanyAddressSchema = z.object({
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().min(1).max(24),
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(2).max(2),
});
export type CompanyAddress = z.infer<typeof CompanyAddressSchema>;

export const CompanyProfileSchema = z.object({
  company_name: z.string().trim().min(1),
  org_number: z.string().trim().min(1),
  company_address: CompanyAddressSchema,
});
export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;

export const CartContextAttributesSchema = z.object({
  company_name: z.string().min(1),
  company_org_number: z.string().min(1),
  company_address_line1: z.string().min(1),
  company_address_line2: z.string(),
  company_postal_code: z.string().min(1),
  company_city: z.string().min(1),
  company_country: z.string().min(2).max(2),
});
export type CartContextAttributes = z.infer<typeof CartContextAttributesSchema>;
