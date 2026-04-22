import {postToAppBackend} from "../customer-account-api/app-backend-client";

export async function submitCompanyOnboarding(payload) {
  return postToAppBackend("/api/customer-account/onboarding/register-company", payload, {
    method: "POST",
  });
}
