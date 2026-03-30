import { z } from "zod";
import { CompanyAddressSchema, CompanyProfileSchema } from "../../contracts/company.schema";

export const GetCompanyProfileInputSchema = z.object({
  companyId: z.string().min(1),
});
export type GetCompanyProfileInput = z.infer<typeof GetCompanyProfileInputSchema>;

export const UpdateCompanyAddressInputSchema = z.object({
  companyId: z.string().min(1),
  role: z.enum(["administrator", "user"]),
  companyAddress: CompanyAddressSchema,
});
export type UpdateCompanyAddressInput = z.infer<typeof UpdateCompanyAddressInputSchema>;

export const CompanyProfileOutputSchema = CompanyProfileSchema;
export type CompanyProfileOutput = z.infer<typeof CompanyProfileOutputSchema>;
