import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANY_ID = process.env.TEST_COMPANY_ID ?? "cmp_001";

const COMPANY_PROFILE = {
  companyName: "Reolteknikk AS",
  orgNumber: "123456789",
  addressLine1: "Storgata 15",
  addressLine2: "Suite 2",
  addressPostalCode: "0155",
  addressCity: "Oslo",
  addressCountry: "NO",
};

const AUTH_MEMBERSHIP_MAP = {
  "9196649283759": {
    companyId: COMPANY_ID,
    role: "administrator",
    status: "active",
  },
  "9190535757999": {
    companyId: COMPANY_ID,
    role: "user",
    status: "active",
  },
};

async function main() {
  const upserted = await prisma.companyProfile.upsert({
    where: { companyId: COMPANY_ID },
    update: COMPANY_PROFILE,
    create: {
      companyId: COMPANY_ID,
      ...COMPANY_PROFILE,
    },
  });

  const offlineSession = await prisma.session.findFirst({
    where: { isOnline: false },
    select: { shop: true },
  });

  console.log("Seeded CompanyProfile:");
  console.log(
    JSON.stringify(
      {
        companyId: upserted.companyId,
        companyName: upserted.companyName,
        orgNumber: upserted.orgNumber,
      },
      null,
      2,
    ),
  );

  console.log("\nSet this in .env as AUTH_MEMBERSHIP_MAP for proxy auth testing:");
  console.log(JSON.stringify(AUTH_MEMBERSHIP_MAP));

  if (!offlineSession) {
    console.warn(
      "\nWarning: No offline Shopify session found in DB. Some admin-backed app functionality may remain unavailable until the app has a valid offline session.",
    );
  } else {
    console.log(`\nOffline Shopify session detected for shop: ${offlineSession.shop}`);
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

