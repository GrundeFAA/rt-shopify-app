import { resolveMembershipByCustomerId } from "../../auth/membership.server";
import { AppError } from "../../auth/errors";
import { CompanyProfileRepository } from "../repositories/company-profile.repository.server";
import {
  GetProxyCartContextInput,
  GetProxyCartContextInputSchema,
  ProxyCartContextOutput,
  ProxyCartContextOutputSchema,
} from "../schemas";

export class GetProxyCartContextService {
  constructor(private readonly companyRepository: CompanyProfileRepository) {}

  async execute(input: GetProxyCartContextInput): Promise<ProxyCartContextOutput> {
    const parsedInput = GetProxyCartContextInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid cart-context request.", 400, false);
    }

    const membership = await resolveMembershipByCustomerId(parsedInput.data.customerId);
    if (!membership) {
      throw new AppError(
        "AUTH_NO_MEMBERSHIP",
        "No company membership is associated with this customer.",
        403,
        false,
      );
    }

    if (membership.status !== "active") {
      throw new AppError(
        "AUTH_INACTIVE_MEMBERSHIP",
        "Your membership is pending activation.",
        403,
        false,
      );
    }

    const companyProfile = await this.companyRepository.findByCompanyId(membership.companyId);
    if (!companyProfile) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false);
    }

    return ProxyCartContextOutputSchema.parse({
      company_name: companyProfile.companyName,
      company_org_number: companyProfile.orgNumber,
      company_address_line1: companyProfile.companyAddress.line1,
      company_address_line2: companyProfile.companyAddress.line2 ?? "",
      company_postal_code: companyProfile.companyAddress.postalCode,
      company_city: companyProfile.companyAddress.city,
      company_country: companyProfile.companyAddress.country,
    });
  }
}
