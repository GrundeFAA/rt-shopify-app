-- Remove per-member default delivery address preference.
ALTER TABLE "CompanyMembership"
DROP CONSTRAINT IF EXISTS "CompanyMembership_defaultCompanyAddressId_fkey";

DROP INDEX IF EXISTS "CompanyMembership_defaultCompanyAddressId_idx";

ALTER TABLE "CompanyMembership"
DROP COLUMN IF EXISTS "defaultCompanyAddressId";
