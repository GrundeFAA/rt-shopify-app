-- Maps a Shopify company contact to its customer so delete webhooks can
-- untag after Shopify has already dropped the contact (and often the customer id).
CREATE TABLE "CompanyContactCustomer" (
    "shop" TEXT NOT NULL,
    "companyContactId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyContactCustomer_pkey" PRIMARY KEY ("shop", "companyContactId")
);

CREATE INDEX "CompanyContactCustomer_shop_customerId_idx" ON "CompanyContactCustomer"("shop", "customerId");
