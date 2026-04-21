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

export async function deleteCompanyLocation({companyId, companyLocationId}) {
  return postToAppBackend(
    "/api/customer-account/company/locations",
    {
      companyId,
      companyLocationId,
    },
    {method: "DELETE"},
  );
}

export async function setCompanyMainLocation({companyId, companyLocationId}) {
  return postToAppBackend(
    "/api/customer-account/company/locations",
    {
      companyId,
      companyLocationId,
    },
    {method: "PATCH"},
  );
}
