import prisma from "../../../db.server";

type CompanyContactCustomerLink = {
  shop: string;
  companyContactId: string;
  customerId: string;
};

export async function upsertCompanyContactCustomer(
  link: CompanyContactCustomerLink,
): Promise<void> {
  await prisma.companyContactCustomer.upsert({
    where: {
      shop_companyContactId: {
        shop: link.shop,
        companyContactId: link.companyContactId,
      },
    },
    create: link,
    update: {
      customerId: link.customerId,
    },
  });
}

export async function findCompanyContactCustomer(
  shop: string,
  companyContactId: string,
): Promise<CompanyContactCustomerLink | null> {
  return prisma.companyContactCustomer.findUnique({
    where: {
      shop_companyContactId: {
        shop,
        companyContactId,
      },
    },
  });
}

export async function deleteCompanyContactCustomer(
  shop: string,
  companyContactId: string,
): Promise<void> {
  await prisma.companyContactCustomer.deleteMany({
    where: {
      shop,
      companyContactId,
    },
  });
}

export async function countCompanyContactsForCustomer(
  shop: string,
  customerId: string,
): Promise<number> {
  return prisma.companyContactCustomer.count({
    where: {
      shop,
      customerId,
    },
  });
}
