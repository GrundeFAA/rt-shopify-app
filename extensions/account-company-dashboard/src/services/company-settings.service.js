import {postToAppBackend} from "../customer-account-api/app-backend-client";

export async function loadCompanySettingsData({
  authenticatedCompanyId,
  currentLocationId,
  translate,
}) {
  if (!authenticatedCompanyId) {
    throw new Error(translate("companySettingsMissingCompany"));
  }

  return postToAppBackend("/api/customer-account/company/settings", {
    authenticatedCompanyId,
    currentLocationId,
  });
}

export async function saveCompanySettings({
  companyId,
  ehf,
  invoiceEmail,
  translate,
}) {
  if (!companyId) {
    throw new Error(translate("companySettingsMissingCompany"));
  }

  await postToAppBackend(
    "/api/customer-account/company/settings",
    {
      companyId,
      ehf,
      invoiceEmail: invoiceEmail.trim(),
    },
    {method: "PATCH"},
  );
}
