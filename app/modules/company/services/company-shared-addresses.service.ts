import { AppError } from "../../auth/errors";
import {
  CompanySharedAddressSchema,
  type CompanySharedAddressInput,
} from "../../../contracts/company-addresses.schema";
import {
  CreateCompanyAddressServiceInputSchema,
  CreateCompanyAddressServiceOutputSchema,
  DeleteCompanyAddressServiceInputSchema,
  DeleteCompanyAddressServiceOutputSchema,
  GetCompanyAddressesInputSchema,
  ListCompanyAddressesServiceOutputSchema,
  SetDefaultCompanyAddressServiceInputSchema,
  SetDefaultCompanyAddressServiceOutputSchema,
  UnsetDefaultCompanyAddressServiceInputSchema,
  UnsetDefaultCompanyAddressServiceOutputSchema,
  UpdateCompanyAddressServiceInputSchema,
  UpdateCompanyAddressServiceOutputSchema,
  type CreateCompanyAddressServiceInput,
  type CreateCompanyAddressServiceOutput,
  type DeleteCompanyAddressServiceInput,
  type DeleteCompanyAddressServiceOutput,
  type GetCompanyAddressesInput,
  type ListCompanyAddressesServiceOutput,
  type SetDefaultCompanyAddressServiceInput,
  type SetDefaultCompanyAddressServiceOutput,
  type UnsetDefaultCompanyAddressServiceInput,
  type UnsetDefaultCompanyAddressServiceOutput,
  type UpdateCompanyAddressServiceInput,
  type UpdateCompanyAddressServiceOutput,
} from "../shared-addresses.schemas";
import {
  type CompanyMembershipActorRecord,
  type CompanySharedAddressRecord,
  type CompanySharedAddressesRepository,
} from "../repositories/company-shared-addresses.repository.server";

type SharedAddressRepository = Pick<
  CompanySharedAddressesRepository,
  | "findMembershipByCustomerId"
  | "listByCompanyId"
  | "findByIdAndCompanyId"
  | "listSyncEligibleCustomerIds"
  | "createWithSyncIntent"
  | "updateWithSyncIntent"
  | "deleteWithSyncIntent"
  | "setDefaultAddress"
  | "unsetDefaultAddress"
>;

function toSharedAddressDto(record: CompanySharedAddressRecord) {
  return CompanySharedAddressSchema.parse({
    id: record.id,
    label: record.label,
    line1: record.line1,
    line2: record.line2,
    postalCode: record.postalCode,
    city: record.city,
    country: record.country,
    source: record.source,
    createdByMemberId: record.createdByMemberId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export class CompanySharedAddressesService {
  constructor(private readonly repository: SharedAddressRepository) {}

  private async requireMembershipForCompany(
    customerId: string,
    companyId: string,
  ): Promise<CompanyMembershipActorRecord> {
    const membership = await this.repository.findMembershipByCustomerId(customerId);
    if (!membership || membership.companyId !== companyId) {
      throw new AppError("AUTH_NO_MEMBERSHIP", "No company membership was found.", 403, false);
    }

    return membership;
  }

  private requireActiveMutationMembership(membership: CompanyMembershipActorRecord): void {
    if (membership.status !== "active") {
      throw new AppError(
        "AUTH_INACTIVE_MEMBERSHIP",
        "Only active members can modify shared addresses.",
        403,
        false,
      );
    }
  }

  private normalizeAddressInput(input: CompanySharedAddressInput): CompanySharedAddressInput {
    return {
      label: input.label?.trim(),
      line1: input.line1.trim(),
      line2: input.line2?.trim(),
      postalCode: input.postalCode.trim(),
      city: input.city.trim(),
      country: input.country.trim().toUpperCase(),
    };
  }

  async list(input: GetCompanyAddressesInput): Promise<ListCompanyAddressesServiceOutput> {
    const parsed = GetCompanyAddressesInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid company addresses request.", 400, false);
    }

    const membership = await this.requireMembershipForCompany(
      parsed.data.customerId,
      parsed.data.companyId,
    );
    const addresses = await this.repository.listByCompanyId(parsed.data.companyId);

    return ListCompanyAddressesServiceOutputSchema.parse({
      addresses: addresses.map(toSharedAddressDto),
      myDefaultAddressId: membership.defaultCompanyAddressId,
    });
  }

  async create(input: CreateCompanyAddressServiceInput): Promise<CreateCompanyAddressServiceOutput> {
    const parsed = CreateCompanyAddressServiceInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid create shared address request.", 400, false);
    }

    const membership = await this.requireMembershipForCompany(
      parsed.data.customerId,
      parsed.data.companyId,
    );
    this.requireActiveMutationMembership(membership);

    const syncEligibleCustomerIds = await this.repository.listSyncEligibleCustomerIds(
      parsed.data.companyId,
    );

    const created = await this.repository.createWithSyncIntent({
      companyId: parsed.data.companyId,
      actorCustomerId: parsed.data.customerId,
      actorMembershipId: membership.id,
      address: this.normalizeAddressInput(parsed.data.address),
      setAsMyDefault: parsed.data.setAsMyDefault,
      syncEligibleCustomerIds,
    });

    return CreateCompanyAddressServiceOutputSchema.parse({
      address: toSharedAddressDto(created.address),
      myDefaultAddressId: created.myDefaultAddressId,
      syncIntentId: created.syncIntentId,
    });
  }

  async update(input: UpdateCompanyAddressServiceInput): Promise<UpdateCompanyAddressServiceOutput> {
    const parsed = UpdateCompanyAddressServiceInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid update shared address request.", 400, false);
    }

    const membership = await this.requireMembershipForCompany(
      parsed.data.customerId,
      parsed.data.companyId,
    );
    this.requireActiveMutationMembership(membership);

    const syncEligibleCustomerIds = await this.repository.listSyncEligibleCustomerIds(
      parsed.data.companyId,
    );
    const updated = await this.repository.updateWithSyncIntent({
      companyId: parsed.data.companyId,
      addressId: parsed.data.addressId,
      address: this.normalizeAddressInput(parsed.data.address),
      syncEligibleCustomerIds,
    });

    if (!updated) {
      throw new AppError("RESOURCE_NOT_FOUND", "Shared address was not found.", 404, false);
    }

    return UpdateCompanyAddressServiceOutputSchema.parse({
      address: toSharedAddressDto(updated.address),
      syncIntentId: updated.syncIntentId,
    });
  }

  async delete(input: DeleteCompanyAddressServiceInput): Promise<DeleteCompanyAddressServiceOutput> {
    const parsed = DeleteCompanyAddressServiceInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid delete shared address request.", 400, false);
    }

    const membership = await this.requireMembershipForCompany(
      parsed.data.customerId,
      parsed.data.companyId,
    );
    this.requireActiveMutationMembership(membership);

    const syncEligibleCustomerIds = await this.repository.listSyncEligibleCustomerIds(
      parsed.data.companyId,
    );
    const deleted = await this.repository.deleteWithSyncIntent({
      companyId: parsed.data.companyId,
      addressId: parsed.data.addressId,
      syncEligibleCustomerIds,
    });
    if (!deleted) {
      throw new AppError("RESOURCE_NOT_FOUND", "Shared address was not found.", 404, false);
    }

    return DeleteCompanyAddressServiceOutputSchema.parse(deleted);
  }

  async setDefault(
    input: SetDefaultCompanyAddressServiceInput,
  ): Promise<SetDefaultCompanyAddressServiceOutput> {
    const parsed = SetDefaultCompanyAddressServiceInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid set-default request.", 400, false);
    }

    const membership = await this.requireMembershipForCompany(
      parsed.data.customerId,
      parsed.data.companyId,
    );
    this.requireActiveMutationMembership(membership);

    // Enforce same-company reference invariant before writing pointer.
    const address = await this.repository.findByIdAndCompanyId(
      parsed.data.companyId,
      parsed.data.addressId,
    );
    if (!address) {
      throw new AppError("RESOURCE_NOT_FOUND", "Shared address was not found.", 404, false);
    }

    const defaultAddressId = await this.repository.setDefaultAddress({
      companyId: parsed.data.companyId,
      customerId: parsed.data.customerId,
      addressId: parsed.data.addressId,
    });
    if (!defaultAddressId) {
      throw new AppError("AUTH_NO_MEMBERSHIP", "No company membership was found.", 403, false);
    }

    return SetDefaultCompanyAddressServiceOutputSchema.parse({
      myDefaultAddressId: defaultAddressId,
    });
  }

  async unsetDefault(
    input: UnsetDefaultCompanyAddressServiceInput,
  ): Promise<UnsetDefaultCompanyAddressServiceOutput> {
    const parsed = UnsetDefaultCompanyAddressServiceInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid unset-default request.", 400, false);
    }

    const membership = await this.requireMembershipForCompany(
      parsed.data.customerId,
      parsed.data.companyId,
    );
    this.requireActiveMutationMembership(membership);

    const updated = await this.repository.unsetDefaultAddress({
      companyId: parsed.data.companyId,
      customerId: parsed.data.customerId,
    });
    if (!updated) {
      throw new AppError("AUTH_NO_MEMBERSHIP", "No company membership was found.", 403, false);
    }

    return UnsetDefaultCompanyAddressServiceOutputSchema.parse({
      myDefaultAddressId: null,
    });
  }
}
