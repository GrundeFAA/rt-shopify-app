import { AppError } from "../../auth/errors";
import { CompanyProfileRepository } from "../repositories/company-profile.repository.server";
import {
  CompanyProfileOutput,
  CompanyProfileOutputSchema,
  GetCompanyProfileInput,
  GetCompanyProfileInputSchema,
} from "../schemas";

export class GetCompanyProfileService {
  constructor(private readonly repository: CompanyProfileRepository) {}

  async execute(input: GetCompanyProfileInput): Promise<CompanyProfileOutput> {
    const parsedInput = GetCompanyProfileInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid company profile request.", 400, false);
    }

    const companyProfile = await this.repository.findByCompanyId(parsedInput.data.companyId);
    if (!companyProfile) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false);
    }

    return CompanyProfileOutputSchema.parse(
      CompanyProfileRepository.toProfileDto(companyProfile),
    );
  }
}
