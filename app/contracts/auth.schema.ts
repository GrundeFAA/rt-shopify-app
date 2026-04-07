import { z } from "zod";

export const MembershipRoleSchema = z.enum(["administrator", "user"]);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const MembershipStatusSchema = z.enum(["active", "inactive"]);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const ProxyParamsSchema = z.object({
  signature: z.string().min(1),
  shop: z.string().min(1),
  timestamp: z.coerce.number().int().positive(),
  logged_in_customer_id: z.string().min(1),
});

export const DashboardSessionClaimsSchema = z.object({
  customerId: z.string().min(1),
  companyId: z.string().min(1),
  shop: z.string().min(1),
  role: MembershipRoleSchema,
  status: MembershipStatusSchema,
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
  jti: z.string().uuid(),
});

export type DashboardSessionClaims = z.infer<typeof DashboardSessionClaimsSchema>;
