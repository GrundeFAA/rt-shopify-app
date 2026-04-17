import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const offlineSession = await prisma.session.findFirst({
    where: { isOnline: false },
    select: { shop: true },
  });

  console.log("No custom app data seed is currently required.");

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

