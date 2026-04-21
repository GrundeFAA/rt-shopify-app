import {postToAppBackend} from "../customer-account-api/app-backend-client";

export async function inviteCompanyUser({
  companyId,
  firstName,
  lastName,
  email,
  companyAdmin,
  assignments,
}) {
  return postToAppBackend("/api/customer-account/company/users", {
    companyId,
    firstName,
    lastName,
    email,
    companyAdmin,
    assignments,
  });
}

export async function updateCompanyUser({
  companyId,
  customerId,
  companyAdmin,
  assignments,
}) {
  return postToAppBackend(
    "/api/customer-account/company/users",
    {
      companyId,
      customerId,
      companyAdmin,
      assignments,
    },
    {method: "PATCH"},
  );
}
