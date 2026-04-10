import { z } from "zod";
import {
  CartContextAttributesSchema,
  CompanyAddressSchema,
  CompanyProfileSchema,
} from "../../contracts/company.schema";
import {
  GetCompanyOrderByIdOutputSchema,
  GetCompanyOrderByIdParamsSchema,
  ListCompanyOrdersOutputSchema,
  ListCompanyOrdersQuerySchema,
} from "../../contracts/company-orders.schema";

export const GetCompanyProfileInputSchema = z.object({
  companyId: z.string().min(1),
});
export type GetCompanyProfileInput = z.infer<typeof GetCompanyProfileInputSchema>;

export const UpdateCompanyAddressInputSchema = z.object({
  companyId: z.string().min(1),
  shop: z.string().min(1),
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

export const ListCompanyOrdersInputSchema = z.object({
  companyId: z.string().min(1),
  shop: z.string().min(1),
  limit: ListCompanyOrdersQuerySchema.shape.limit,
  cursor: ListCompanyOrdersQuerySchema.shape.cursor,
});
export type ListCompanyOrdersInput = z.infer<typeof ListCompanyOrdersInputSchema>;

export const ListCompanyOrdersServiceOutputSchema = ListCompanyOrdersOutputSchema;
export type ListCompanyOrdersServiceOutput = z.infer<typeof ListCompanyOrdersServiceOutputSchema>;

export const GetCompanyOrderByIdInputSchema = z.object({
  companyId: z.string().min(1),
  shop: z.string().min(1),
  orderId: GetCompanyOrderByIdParamsSchema.shape.orderId,
});
export type GetCompanyOrderByIdInput = z.infer<typeof GetCompanyOrderByIdInputSchema>;

export const GetCompanyOrderByIdServiceOutputSchema = GetCompanyOrderByIdOutputSchema;
export type GetCompanyOrderByIdServiceOutput = z.infer<typeof GetCompanyOrderByIdServiceOutputSchema>;
