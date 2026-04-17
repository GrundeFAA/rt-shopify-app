import { z } from "zod";

export const PublicProxyParamsSchema = z.object({
  signature: z.string().min(1),
  shop: z.string().min(1),
  timestamp: z.coerce.number().int().positive(),
  logged_in_customer_id: z.string().nullish(),
});

export const ProxyParamsSchema = PublicProxyParamsSchema.extend({
  logged_in_customer_id: z.string().min(1),
});
