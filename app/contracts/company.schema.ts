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
