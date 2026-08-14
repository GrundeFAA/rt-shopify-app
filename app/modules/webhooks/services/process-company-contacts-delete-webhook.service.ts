import { AppError } from "../../auth/errors";
import type { AdminServiceContext } from "../../shopify/admin.server";
import {
  countCompanyContactsForCustomer,
  deleteCompanyContactCustomer,
  findCompanyContactCustomer,
} from "./company-contact-customer.repository";
import {
  getCompanyContactIdFromPayload,
  getCustomerIdFromPayload,
  removeB2bCustomerTags,
} from "./company-contact-customer-tags.service";

type ProcessCompanyContactsDeleteWebhookInput = {
  adminContext?: AdminServiceContext;
  payload: Record<string, unknown>;
  requestId: string;
  shop: string;
  topic: string;
  webhookId: string;
};

export async function processCompanyContactsDeleteWebhook({
  adminContext,
  payload,
  requestId,
  shop,
  topic,
  webhookId,
}: ProcessCompanyContactsDeleteWebhookInput): Promise<void> {
  if (!adminContext) {
    throw new AppError(
      "SHOPIFY_TEMPORARY_FAILURE",
      "Missing admin session for company contact delete webhook.",
      503,
      true,
      { shop, topic, webhookId },
    );
  }

  const companyContactId = getCompanyContactIdFromPayload(payload);
  const payloadCustomerId = getCustomerIdFromPayload(payload);
  const existingLink = companyContactId
    ? await findCompanyContactCustomer(shop, companyContactId)
    : null;
  const customerId = existingLink?.customerId ?? payloadCustomerId;

  if (companyContactId) {
    await deleteCompanyContactCustomer(shop, companyContactId);
  }

  if (!customerId) {
    console.log(
      JSON.stringify({
        event: "company_contacts_delete_webhook_skipped",
        requestId,
        topic,
        webhookId,
        shop,
        companyContactId,
        reason: "Could not resolve customer from mapping table or delete payload.",
      }),
    );
    return;
  }

  const remainingContacts = await countCompanyContactsForCustomer(shop, customerId);
  if (remainingContacts > 0) {
    console.log(
      JSON.stringify({
        event: "company_contacts_delete_webhook_processed",
        requestId,
        topic,
        webhookId,
        shop,
        customerId,
        companyContactId,
        tagsRemoved: [],
        remainingContacts,
      }),
    );
    return;
  }

  const result = await removeB2bCustomerTags(adminContext, customerId);

  console.log(
    JSON.stringify({
      event: "company_contacts_delete_webhook_processed",
      requestId,
      topic,
      webhookId,
      shop,
      customerId: result.customerId,
      companyContactId,
      tagsRemoved: result.tagsRemoved,
      remainingContacts,
    }),
  );
}
