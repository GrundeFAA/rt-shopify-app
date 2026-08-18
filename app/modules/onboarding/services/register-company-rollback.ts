import { z } from "zod";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { executeAdminGraphql } from "../../shopify/admin.server";
import {
  COMPANY_DELETE_MUTATION,
  CUSTOMER_DELETE_MUTATION,
} from "./register-company.admin-graphql";

const UserErrorsSchema = z.array(
  z.object({
    field: z.array(z.union([z.string(), z.number()])).nullable().optional(),
    message: z.string(),
  }),
);

const CompanyDeleteSchema = z.object({
  companyDelete: z.object({
    deletedCompanyId: z.string().nullable().optional(),
    userErrors: UserErrorsSchema,
  }),
});

const CustomerDeleteSchema = z.object({
  customerDelete: z.object({
    deletedCustomerId: z.string().nullable().optional(),
    userErrors: UserErrorsSchema,
  }),
});

export type PartialRegistration = {
  companyId?: string;
  /** Only set when this attempt created the customer, never for a pre-existing one. */
  customerId?: string;
};

async function runRollbackStep(
  context: AdminServiceContext,
  step: string,
  resourceId: string,
  run: () => Promise<unknown>,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "registration_rollback_failed",
        requestId: context.requestId,
        shop: context.shop,
        step,
        resourceId,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

/**
 * Undoes a company registration that failed partway through, so a retry is not blocked
 * by a half-created company that nobody can administer.
 *
 * Never throws: the caller must still surface the failure that triggered the rollback.
 */
export async function rollbackPartialRegistration(
  context: AdminServiceContext,
  registration: PartialRegistration,
): Promise<void> {
  // The company goes first. Deleting it also removes its locations, contacts and role
  // assignments, and Shopify refuses to delete a customer still attached as a contact.
  if (registration.companyId) {
    await runRollbackStep(context, "companyDelete", registration.companyId, () =>
      executeAdminGraphql({
        context,
        document: COMPANY_DELETE_MUTATION,
        operationName: "RollbackRegisteredCompany",
        fallbackMessage: "Could not roll back the created company.",
        dataSchema: CompanyDeleteSchema,
        userErrorPath: ["companyDelete"],
        variables: { companyId: registration.companyId },
      }),
    );
  }

  if (registration.customerId) {
    await runRollbackStep(context, "customerDelete", registration.customerId, () =>
      executeAdminGraphql({
        context,
        document: CUSTOMER_DELETE_MUTATION,
        operationName: "RollbackRegisteredCustomer",
        fallbackMessage: "Could not roll back the created customer.",
        dataSchema: CustomerDeleteSchema,
        userErrorPath: ["customerDelete"],
        variables: { customerId: registration.customerId },
      }),
    );
  }
}
