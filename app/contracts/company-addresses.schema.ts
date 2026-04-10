import { z } from "zod";

export const CompanySharedAddressSourceSchema = z.enum(["dashboard", "checkout_import"]);
export type CompanySharedAddressSource = z.infer<typeof CompanySharedAddressSourceSchema>;

export const CompanySharedAddressSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().max(120).nullable(),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).nullable(),
  postalCode: z.string().trim().min(1).max(24),
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(2).max(2),
  source: CompanySharedAddressSourceSchema,
  createdByMemberId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CompanySharedAddress = z.infer<typeof CompanySharedAddressSchema>;

export const CompanySharedAddressInputSchema = z.object({
  label: z.string().trim().max(120).optional(),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().min(1).max(24),
  city: z.string().trim().min(1).max(80),
  country: z.string().trim().min(2).max(2),
});
export type CompanySharedAddressInput = z.infer<typeof CompanySharedAddressInputSchema>;

export const CompanyAddressIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});
export type CompanyAddressIdParams = z.infer<typeof CompanyAddressIdParamsSchema>;

export const ListCompanyAddressesOutputSchema = z.object({
  addresses: z.array(CompanySharedAddressSchema),
});
export type ListCompanyAddressesOutput = z.infer<typeof ListCompanyAddressesOutputSchema>;

export const CreateCompanyAddressInputSchema = z.object({
  address: CompanySharedAddressInputSchema,
});
export type CreateCompanyAddressInput = z.infer<typeof CreateCompanyAddressInputSchema>;

export const CreateCompanyAddressOutputSchema = z.object({
  address: CompanySharedAddressSchema,
  syncIntentId: z.string().min(1),
});
export type CreateCompanyAddressOutput = z.infer<typeof CreateCompanyAddressOutputSchema>;

export const UpdateCompanyAddressInputSchema = z.object({
  address: CompanySharedAddressInputSchema,
});
export type UpdateCompanyAddressInput = z.infer<typeof UpdateCompanyAddressInputSchema>;

export const UpdateCompanyAddressOutputSchema = z.object({
  address: CompanySharedAddressSchema,
  syncIntentId: z.string().min(1),
});
export type UpdateCompanyAddressOutput = z.infer<typeof UpdateCompanyAddressOutputSchema>;

export const DeleteCompanyAddressOutputSchema = z.object({
  deletedAddressId: z.string().min(1),
  syncIntentId: z.string().min(1),
});
export type DeleteCompanyAddressOutput = z.infer<typeof DeleteCompanyAddressOutputSchema>;
