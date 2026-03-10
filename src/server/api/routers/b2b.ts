import { createTRPCRouter, publicProcedure } from "#/server/api/trpc";
import {
  approveMembershipSchema,
  dashboardInputSchema,
} from "#/server/modules/b2b/schemas";
import { companyMemberRepository } from "#/server/modules/b2b/repositories/company-member.repository";
import { dashboardService } from "#/server/modules/b2b/services/dashboard.service";
import { membershipApprovalService } from "#/server/modules/b2b/services/membership-approval.service";

export const b2bRouter = createTRPCRouter({
  getDashboard: publicProcedure
    .input(dashboardInputSchema)
    .query(async ({ ctx, input }) => {
      return dashboardService.getByShopifyCustomerId(ctx.db, input.shopifyCustomerId);
    }),

  listPendingMemberships: publicProcedure.query(async ({ ctx }) => {
    return companyMemberRepository.listPendingWithCompany(ctx.db);
  }),

  approveMembership: publicProcedure
    .input(approveMembershipSchema)
    .mutation(async ({ ctx, input }) => {
      return membershipApprovalService.approveMembership(ctx.db, input);
    }),
});
