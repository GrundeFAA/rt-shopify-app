ALTER TABLE "CompanyProfile"
ADD COLUMN "addressLine1" TEXT,
ADD COLUMN "addressLine2" TEXT,
ADD COLUMN "addressPostalCode" TEXT,
ADD COLUMN "addressCity" TEXT,
ADD COLUMN "addressCountry" TEXT;

UPDATE "CompanyProfile" p
SET
  "addressLine1" = COALESCE(legacy."line1", ''),
  "addressLine2" = legacy."line2",
  "addressPostalCode" = COALESCE(legacy."postalCode", ''),
  "addressCity" = COALESCE(legacy."city", ''),
  "addressCountry" = COALESCE(legacy."country", 'NO')
FROM (
  SELECT DISTINCT ON ("companyId")
    "companyId",
    "line1",
    "line2",
    "postalCode",
    "city",
    "country"
  FROM "CompanySharedAddress"
  WHERE "addressType" = 'post'
  ORDER BY "companyId", "createdAt" ASC, "id" ASC
) AS legacy
WHERE legacy."companyId" = p."companyId";

ALTER TABLE "CompanyProfile"
ALTER COLUMN "addressLine1" SET NOT NULL,
ALTER COLUMN "addressPostalCode" SET NOT NULL,
ALTER COLUMN "addressCity" SET NOT NULL,
ALTER COLUMN "addressCountry" SET NOT NULL;

DROP TABLE "CompanyAddressSyncIntent";
DROP TABLE "CompanySharedAddress";
