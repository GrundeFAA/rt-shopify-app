import { AppError } from "../../auth/errors";
import { CompanyProfileRepository } from "../repositories/company-profile.repository.server";
import { CompanyProfileOutput, UpdateCompanyAddressInput, UpdateCompanyAddressInputSchema } from "../schemas";

export class UpdateCompanyAddressService {
  constructor(private readonly repository: CompanyProfileRepository) {}

  async execute(input: UpdateCompanyAddressInput): Promise<CompanyProfileOutput> {
    const parsedInput = UpdateCompanyAddressInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid company address update request.", 400, false);
    }

    if (parsedInput.data.role !== "administrator") {
      throw new AppError(
        "AUTH_FORBIDDEN_ROLE",
        "Only administrators can update the company address.",
        403,
        false,
      );
    }

    const updated = await this.repository.updateCompanyAddress(
      parsedInput.data.companyId,
      parsedInput.data.companyAddress,
    );
    if (!updated) {
      throw new AppError("RESOURCE_NOT_FOUND", "Company profile was not found.", 404, false);
    }

    return CompanyProfileRepository.toProfileDto(updated);
  }
}
