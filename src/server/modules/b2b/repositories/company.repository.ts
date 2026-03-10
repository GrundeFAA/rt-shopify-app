import { Prisma } from "../../../../../generated/prisma";
import type { PrismaClient } from "../../../../../generated/prisma";

export const companyRepository = {
  findByOrgNumber(db: PrismaClient, orgNumber: string) {
    return db.company.findUnique({
      where: { orgNumber },
    });
  },

  /**
   * Race-safe find-or-create by orgNumber.
   * Two concurrent webhooks with the same orgNumber will both attempt to
   * insert; the loser catches the unique constraint violation and re-reads.
   */
  async findOrCreate(
    db: PrismaClient,
    input: { name: string; orgNumber?: string },
  ) {
    if (!input.orgNumber) {
      return db.company.create({
        data: { name: input.name },
      });
    }

    try {
      return await db.company.upsert({
        where: { orgNumber: input.orgNumber },
        create: { name: input.name, orgNumber: input.orgNumber },
        update: {},
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const existing = await db.company.findUnique({
          where: { orgNumber: input.orgNumber },
        });
        if (existing) return existing;
      }
      throw err;
    }
  },

  getById(db: PrismaClient, id: string) {
    return db.company.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
        },
      },
    });
  },
};
