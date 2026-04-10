-- Add canonical shared company addresses.
CREATE TABLE "CompanySharedAddress" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdByMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompanySharedAddress_pkey" PRIMARY KEY ("id")
);

-- Add sync-intent persistence table for command path durability.
CREATE TABLE "CompanyAddressSyncIntent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyAddressId" TEXT,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recipientCustomerIds" JSONB NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompanyAddressSyncIntent_pkey" PRIMARY KEY ("id")
);

-- Add per-member default shared address preference.
ALTER TABLE "CompanyMembership"
ADD COLUMN "defaultCompanyAddressId" TEXT;

CREATE INDEX "CompanyMembership_defaultCompanyAddressId_idx"
ON "CompanyMembership"("defaultCompanyAddressId");

CREATE INDEX "CompanySharedAddress_companyId_idx"
ON "CompanySharedAddress"("companyId");

CREATE INDEX "CompanyAddressSyncIntent_companyId_idx"
ON "CompanyAddressSyncIntent"("companyId");

CREATE INDEX "CompanyAddressSyncIntent_companyAddressId_idx"
ON "CompanyAddressSyncIntent"("companyAddressId");

ALTER TABLE "CompanySharedAddress"
ADD CONSTRAINT "CompanySharedAddress_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("companyId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyMembership"
ADD CONSTRAINT "CompanyMembership_defaultCompanyAddressId_fkey"
FOREIGN KEY ("defaultCompanyAddressId") REFERENCES "CompanySharedAddress"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompanyAddressSyncIntent"
ADD CONSTRAINT "CompanyAddressSyncIntent_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("companyId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyAddressSyncIntent"
ADD CONSTRAINT "CompanyAddressSyncIntent_companyAddressId_fkey"
FOREIGN KEY ("companyAddressId") REFERENCES "CompanySharedAddress"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
