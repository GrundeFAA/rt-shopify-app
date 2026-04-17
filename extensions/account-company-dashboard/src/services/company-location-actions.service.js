import {postToAppBackend} from "../customer-account-api/app-backend-client";

export async function createCompanyLocation({
  companyId,
  locationName,
  deliveryAddress,
  selectedUsers,
}) {
  return postToAppBackend("/api/customer-account/company/locations", {
    companyId,
    locationName,
    deliveryAddress: {
      ...deliveryAddress,
      country: "NO",
    },
    selectedUsers,
  });
}
