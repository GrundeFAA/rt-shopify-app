-- Add typed address role for unified canonical address storage.
ALTER TABLE "CompanySharedAddress"
ADD COLUMN "addressType" TEXT;

-- Existing shared addresses become delivery addresses.
UPDATE "CompanySharedAddress"
SET "addressType" = 'delivery'
WHERE "addressType" IS NULL;

-- Backfill one post address per company from legacy CompanyProfile.companyAddress JSON.
INSERT INTO "CompanySharedAddress" (
  "id",
  "companyId",
  "addressType",
  "label",
  "line1",
  "line2",
  "postalCode",
  "city",
  "country",
  "source",
  "createdByMemberId",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('post_', replace(cp."companyId", '-', '_')),
  cp."companyId",
  'post',
  'Postadresse',
  cp."companyAddress"->>'line1',
  nullif(cp."companyAddress"->>'line2', ''),
  cp."companyAddress"->>'postalCode',
  cp."companyAddress"->>'city',
  cp."companyAddress"->>'country',
  'dashboard',
  COALESCE(
    (
      SELECT m."id"
      FROM "CompanyMembership" m
      WHERE m."companyId" = cp."companyId"
      ORDER BY m."createdAt" ASC
      LIMIT 1
    ),
    'system'
  ),
  NOW(),
  NOW()
FROM "CompanyProfile" cp
WHERE NOT EXISTS (
  SELECT 1
  FROM "CompanySharedAddress" a
  WHERE a."companyId" = cp."companyId"
    AND a."addressType" = 'post'
);

ALTER TABLE "CompanySharedAddress"
ALTER COLUMN "addressType" SET NOT NULL;

-- Keep exactly one post address per company.
CREATE UNIQUE INDEX "CompanySharedAddress_companyId_post_unique"
ON "CompanySharedAddress"("companyId")
WHERE "addressType" = 'post';

CREATE INDEX "CompanySharedAddress_companyId_addressType_idx"
ON "CompanySharedAddress"("companyId", "addressType");

-- Remove legacy embedded postal address after backfill.
ALTER TABLE "CompanyProfile"
DROP COLUMN "companyAddress";
