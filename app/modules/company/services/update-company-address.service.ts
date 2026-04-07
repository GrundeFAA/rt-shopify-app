import { AppError } from "../../auth/errors";
import { MirrorCompanyProfileService } from "../../sync/services/mirror-company-profile.service";
import { runCompanyProfileHardSyncOperation } from "./company-profile-hard-sync.operation";
import { CompanyProfileRepository } from "../repositories/company-profile.repository.server";
import { CompanyProfileOutput, UpdateCompanyAddressInput, UpdateCompanyAddressInputSchema } from "../schemas";

export class UpdateCompanyAddressService {
  constructor(
    private readonly repository: CompanyProfileRepository,
    private readonly mirrorService?: MirrorCompanyProfileService,
  ) {}

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

    const result = await runCompanyProfileHardSyncOperation({
      input: {
        companyId: parsedInput.data.companyId,
        mutation: {
          kind: "update_address",
          companyAddress: parsedInput.data.companyAddress,
        },
      },
      repository: this.repository,
      mirrorService: this.mirrorService,
    });

    return result.updatedProfile;
  }
}
