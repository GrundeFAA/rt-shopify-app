-- Add unique organization number constraint for company linkage
ALTER TABLE "CompanyProfile"
ADD CONSTRAINT "CompanyProfile_orgNumber_key" UNIQUE ("orgNumber");

-- Membership records resolved by customer id
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyMembership_customerId_key" ON "CompanyMembership"("customerId");
CREATE INDEX "CompanyMembership_companyId_idx" ON "CompanyMembership"("companyId");

ALTER TABLE "CompanyMembership"
ADD CONSTRAINT "CompanyMembership_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("companyId")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Minimal idempotency/audit log for onboarding webhooks
CREATE TABLE "OnboardingEventLog" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerId" TEXT,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingEventLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingEventLog_webhookId_key" ON "OnboardingEventLog"("webhookId");
