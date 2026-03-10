import type { PrismaClient } from "../../../../../generated/prisma";
import { shopifyCustomerWebhookSchema } from "../schemas";
import { customerSyncService } from "./customer-sync.service";

export const shopifyWebhookService = {
  async handleCustomerCreate(db: PrismaClient, payload: unknown) {
    const customer = shopifyCustomerWebhookSchema.parse(payload);
    return customerSyncService.upsertPendingMembershipFromCustomer(db, customer);
  },

  async handleCustomerUpdate(db: PrismaClient, payload: unknown) {
    const customer = shopifyCustomerWebhookSchema.parse(payload);
    return customerSyncService.upsertPendingMembershipFromCustomer(db, customer);
  },
};
