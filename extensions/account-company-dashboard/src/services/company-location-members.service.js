import {postToAppBackend} from "../customer-account-api/app-backend-client";

export async function loadCompanyLocationMembers({companyId, locationId, translate}) {
  if (!companyId || !locationId) {
    throw new Error(translate("memberLoadError"));
  }

  return postToAppBackend("/api/customer-account/company/location-members", {
    companyId,
    locationId,
  });
}
