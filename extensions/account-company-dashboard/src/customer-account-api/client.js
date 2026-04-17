export const API_VERSION = "2026-01";
export const CUSTOMER_ACCOUNT_API_URL = `shopify://customer-account/api/${API_VERSION}/graphql.json`;

export async function fetchCustomerAccountGraphql(query, variables) {
  const response = await fetch(CUSTOMER_ACCOUNT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const payload = await response.json();

  return {response, payload};
}

export function getGraphqlErrorMessage(payload, fallbackMessage, userErrorPath = []) {
  const graphqlMessage = payload?.errors?.[0]?.message;
  const mutationRoot = userErrorPath.reduce((value, key) => value?.[key], payload?.data);
  const userErrorMessage = mutationRoot?.userErrors?.[0]?.message;

  return userErrorMessage || graphqlMessage || fallbackMessage;
}
