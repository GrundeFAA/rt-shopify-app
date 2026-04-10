import { z } from "zod";
import {
  CompanyAddressIdParamsSchema,
  CompanySharedAddressInputSchema,
  CreateCompanyAddressOutputSchema,
  DeleteCompanyAddressOutputSchema,
  ListCompanyAddressesOutputSchema,
  UpdateCompanyAddressOutputSchema,
} from "../../contracts/company-addresses.schema";

export const CompanyAddressActorSchema = z.object({
  companyId: z.string().min(1),
  customerId: z.string().min(1),
});
export type CompanyAddressActor = z.infer<typeof CompanyAddressActorSchema>;

export const GetCompanyAddressesInputSchema = CompanyAddressActorSchema;
export type GetCompanyAddressesInput = z.infer<typeof GetCompanyAddressesInputSchema>;

export const CreateCompanyAddressServiceInputSchema = CompanyAddressActorSchema.extend({
  address: CompanySharedAddressInputSchema,
});
export type CreateCompanyAddressServiceInput = z.infer<typeof CreateCompanyAddressServiceInputSchema>;

export const UpdateCompanyAddressServiceInputSchema = CompanyAddressActorSchema.extend({
  addressId: CompanyAddressIdParamsSchema.shape.id,
  address: CompanySharedAddressInputSchema,
});
export type UpdateCompanyAddressServiceInput = z.infer<typeof UpdateCompanyAddressServiceInputSchema>;

export const DeleteCompanyAddressServiceInputSchema = CompanyAddressActorSchema.extend({
  addressId: CompanyAddressIdParamsSchema.shape.id,
});
export type DeleteCompanyAddressServiceInput = z.infer<typeof DeleteCompanyAddressServiceInputSchema>;

export const ListCompanyAddressesServiceOutputSchema = ListCompanyAddressesOutputSchema;
export type ListCompanyAddressesServiceOutput = z.infer<typeof ListCompanyAddressesServiceOutputSchema>;

export const CreateCompanyAddressServiceOutputSchema = CreateCompanyAddressOutputSchema;
export type CreateCompanyAddressServiceOutput = z.infer<typeof CreateCompanyAddressServiceOutputSchema>;

export const UpdateCompanyAddressServiceOutputSchema = UpdateCompanyAddressOutputSchema;
export type UpdateCompanyAddressServiceOutput = z.infer<typeof UpdateCompanyAddressServiceOutputSchema>;

export const DeleteCompanyAddressServiceOutputSchema = DeleteCompanyAddressOutputSchema;
export type DeleteCompanyAddressServiceOutput = z.infer<typeof DeleteCompanyAddressServiceOutputSchema>;
