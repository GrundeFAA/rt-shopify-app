import { z } from "zod";
import {
  CartContextAttributesSchema,
  CompanyAddressSchema,
  CompanyProfileSchema,
} from "../../contracts/company.schema";

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

export const GetProxyCartContextInputSchema = z.object({
  customerId: z.string().min(1),
});
export type GetProxyCartContextInput = z.infer<typeof GetProxyCartContextInputSchema>;

export const ProxyCartContextOutputSchema = CartContextAttributesSchema;
export type ProxyCartContextOutput = z.infer<typeof ProxyCartContextOutputSchema>;
