import { z } from "zod";

export const MembershipRoleSchema = z.enum(["administrator", "user"]);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const MembershipStatusSchema = z.enum([
  "active",
  "inactive",
  "pending_user_acceptance",
  "pending_admin_approval",
]);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const ProxyParamsSchema = z.object({
  signature: z.string().min(1),
  shop: z.string().min(1),
  timestamp: z.coerce.number().int().positive(),
  logged_in_customer_id: z.string().min(1),
});
