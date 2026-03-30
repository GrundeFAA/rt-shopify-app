import type { PrismaClient } from "@prisma/client";

export type ShopifyOfflineSession = {
  shop: string;
  accessToken: string;
};

export class ShopifyOfflineSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getLatestOfflineSession(): Promise<ShopifyOfflineSession | null> {
    const session = await this.prisma.session.findFirst({
      where: {
        isOnline: false,
      },
      orderBy: {
        shop: "asc",
      },
    });

    if (!session?.shop || !session.accessToken) {
      return null;
    }

    return {
      shop: session.shop,
      accessToken: session.accessToken,
    };
  }
}
