export const API_VERSION = "2026-01";
export const METAFIELD_NAMESPACE = "custom";
export const CUSTOMER_ACCOUNT_API_URL = `shopify://customer-account/api/${API_VERSION}/graphql.json`;

export const COMPANY_SETTINGS_QUERY = `#graphql
  query CompanySettingsData {
    customer {
      id
      companyContacts(first: 20) {
        nodes {
          id
          customer {
            id
          }
          company {
            id
            administrators: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "administrators") {
              id
              type
              jsonValue
              references(first: 50) {
                nodes {
                  __typename
                  ... on Node {
                    id
                  }
                }
              }
            }
            ehf: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "ehf") {
              id
              value
              type
            }
            invoiceEmail: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "invoice_email") {
              id
              value
              type
            }
            locations(first: 20) {
              nodes {
                id
                name
                shippingAddress {
                  address1
                  city
                  zip
                  country
                }
                contacts(first: 20) {
                  nodes {
                    id
                    customer {
                      id
                      firstName
                      lastName
                      emailAddress {
                        emailAddress
                      }
                    }
                  }
                }
              }
            }
          }
          locations(first: 50) {
            nodes {
              id
            }
          }
        }
      }
    }
  }
`;

export const UPDATE_COMPANY_SETTINGS_MUTATION = `#graphql
  mutation UpdateCompanySettings($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
        type
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

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

export function idsMatch(leftId, rightId) {
  if (!leftId || !rightId) {
    return false;
  }

  return leftId === rightId || leftId.endsWith(`/${rightId}`) || rightId.endsWith(`/${leftId}`);
}

export function getAdministratorIds(company) {
  const administratorIdsFromReferences =
    company?.administrators?.references?.nodes?.map((node) => node?.id).filter(Boolean) ?? [];
  const administratorIdsFromJson = Array.isArray(company?.administrators?.jsonValue)
    ? company.administrators.jsonValue.filter(Boolean)
    : [];

  return [...new Set([...administratorIdsFromJson, ...administratorIdsFromReferences])];
}

export function buildCompanyUsers(locations, administratorIds, translate) {
  const usersById = new Map();

  for (const location of locations) {
    const locationName = location?.name || translate("companySettingsLocationFallback");
    const contacts = location?.contacts?.nodes ?? [];

    for (const contact of contacts) {
      const customer = contact?.customer;
      const customerId = customer?.id ?? contact?.id;
      if (!customerId) {
        continue;
      }

      const existingUser = usersById.get(customerId);
      const fullName = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim();

      if (existingUser) {
        if (!existingUser.locationNames.includes(locationName)) {
          existingUser.locationNames.push(locationName);
        }
        continue;
      }

      usersById.set(customerId, {
        id: customerId,
        isAdmin: administratorIds.some((administratorId) => idsMatch(administratorId, customerId)),
        name: fullName || customer?.emailAddress?.emailAddress || translate("memberNameFallback"),
        email: customer?.emailAddress?.emailAddress || "-",
        locationNames: [locationName],
      });
    }
  }

  return [...usersById.values()];
}

export function formatLocationAddress(location, translate) {
  const parts = [
    location?.shippingAddress?.address1,
    location?.shippingAddress?.city,
    location?.shippingAddress?.zip,
    location?.shippingAddress?.country,
  ].filter(Boolean);

  return parts.join(", ") || translate("companySettingsLocationNoAddress");
}

export function validateOptionalEmail(value, invalidMessage) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return "";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue) ? "" : invalidMessage;
}
