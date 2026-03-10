import { z } from "zod";

export const membershipStatusSchema = z.enum(["PENDING", "APPROVED", "DENIED"]);
export const memberRoleSchema = z.enum(["ADMIN", "USER"]);

export const shopifyCustomerWebhookSchema = z.object({
  id: z.union([z.string(), z.number()]).transform((value) => String(value)),
  email: z.string().email().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const approveMembershipSchema = z.object({
  companyId: z.string().min(1),
  shopifyCustomerId: z.string().min(1),
});

export const dashboardInputSchema = z.object({
  shopifyCustomerId: z.string().min(1),
});
