-- CreateTable
CREATE TABLE "CompanyProfile" (
    "companyId" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "orgNumber" TEXT NOT NULL,
    "companyAddress" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
