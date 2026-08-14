import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import { upsertCompanyContactCustomer } from "./company-contact-customer.repository";
import {
  addB2bCustomerTag,
  getCompanyContactIdFromPayload,
  getCustomerIdFromPayload,
} from "./company-contact-customer-tags.service";

type ProcessCompanyContactsCreateWebhookInput = {
  adminContext?: AdminServiceContext;
  payload: Record<string, unknown>;
  requestId: string;
  shop: string;
  topic: string;
  webhookId: string;
};

export async function processCompanyContactsCreateWebhook({
  adminContext,
  payload,
  requestId,
  shop,
  topic,
  webhookId,
}: ProcessCompanyContactsCreateWebhookInput): Promise<void> {
  const customerId = getCustomerIdFromPayload(payload);
  const companyContactId = getCompanyContactIdFromPayload(payload);

  if (!adminContext) {
    throw new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Missing admin session for company contact create webhook.",
      503,
      true,
      { shop, topic, webhookId },
    );
  }

  if (!customerId || !companyContactId) {
    console.log(
      JSON.stringify({
        event: "company_contacts_create_webhook_skipped",
        requestId,
        topic,
        webhookId,
        shop,
        customerId,
        companyContactId,
        reason: "Missing customer or company contact id.",
      }),
    );
    return;
  }

  await upsertCompanyContactCustomer({
    shop,
    companyContactId,
    customerId,
  });

  const result = await addB2bCustomerTag(adminContext, customerId);

  console.log(
    JSON.stringify({
      event: "company_contacts_create_webhook_processed",
      requestId,
      topic,
      webhookId,
      shop,
      customerId: result.customerId,
      companyContactId,
      tagsAdded: result.tagsAdded,
    }),
  );
}
