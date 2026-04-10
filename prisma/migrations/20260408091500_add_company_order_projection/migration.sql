CREATE TABLE "CompanyOrder" (
    "orderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL,
    "placedByCustomerId" TEXT,
    "placedByDisplayName" TEXT,
    "paymentStatus" TEXT NOT NULL,
    "fulfillmentStatus" TEXT NOT NULL,
    "totalAmount" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyOrder_pkey" PRIMARY KEY ("orderId")
);

CREATE INDEX "CompanyOrder_companyId_placedAt_idx" ON "CompanyOrder"("companyId", "placedAt");
CREATE INDEX "CompanyOrder_placedByCustomerId_idx" ON "CompanyOrder"("placedByCustomerId");

ALTER TABLE "CompanyOrder"
ADD CONSTRAINT "CompanyOrder_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "CompanyProfile"("companyId")
ON DELETE CASCADE ON UPDATE CASCADE;
