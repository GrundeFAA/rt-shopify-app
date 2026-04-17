import {
  fetchCustomerAccountGraphql,
  getGraphqlErrorMessage,
} from "../customer-account-api/client";
import {
  METAFIELD_NAMESPACE,
  getAdministratorIds,
  idsMatch,
} from "../utils/company-dashboard";

const COMPANY_SETTINGS_QUERY = `#graphql
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
            mainLocationId: metafield(namespace: "${METAFIELD_NAMESPACE}", key: "main_location_id") {
              value
            }
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

const UPDATE_COMPANY_SETTINGS_MUTATION = `#graphql
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

function matchCompanyContact(companyContacts, authenticatedCompanyId, currentLocationId) {
  return (
    companyContacts.find((contact) => idsMatch(contact?.company?.id, authenticatedCompanyId)) ??
    companyContacts.find((contact) =>
      (contact?.locations?.nodes ?? []).some((location) => idsMatch(location?.id, currentLocationId)),
    ) ??
    companyContacts[0]
  );
}

export async function loadCompanySettingsData({
  authenticatedCompanyId,
  currentLocationId,
  translate,
}) {
  const {response, payload} = await fetchCustomerAccountGraphql(COMPANY_SETTINGS_QUERY);
  const companyContacts = payload?.data?.customer?.companyContacts?.nodes ?? [];
  const graphqlErrors = payload?.errors ?? [];
  const matchedContact = matchCompanyContact(
    companyContacts,
    authenticatedCompanyId,
    currentLocationId,
  );
  const company = matchedContact?.company;
  const matchedCustomerId = matchedContact?.customer?.id;
  const administratorIds = getAdministratorIds(company);

  if (!response.ok || graphqlErrors.length > 0) {
    throw new Error(
      getGraphqlErrorMessage(
        payload,
        translate("companySettingsLoadError"),
      ),
    );
  }

  if (!company || !matchedCustomerId) {
    throw new Error(translate("companySettingsMissingCompany"));
  }

  return {
    companyId: company.id,
    administratorIds,
    ehf: company.ehf?.value === "true",
    invoiceEmail: company.invoiceEmail?.value ?? "",
    isAdmin: administratorIds.some((administratorId) => idsMatch(administratorId, matchedCustomerId)),
    mainLocationId: company.mainLocationId?.value ?? null,
    locations: company.locations?.nodes ?? [],
  };
}

export async function saveCompanySettings({
  companyId,
  ehf,
  invoiceEmail,
  translate,
}) {
  const metafields = [
    {
      namespace: METAFIELD_NAMESPACE,
      key: "ehf",
      ownerId: companyId,
      type: "boolean",
      value: String(ehf),
    },
  ];

  const trimmedInvoiceEmail = invoiceEmail.trim();
  if (trimmedInvoiceEmail) {
    metafields.push({
      namespace: METAFIELD_NAMESPACE,
      key: "invoice_email",
      ownerId: companyId,
      type: "single_line_text_field",
      value: trimmedInvoiceEmail,
    });
  }

  const {response, payload} = await fetchCustomerAccountGraphql(
    UPDATE_COMPANY_SETTINGS_MUTATION,
    {metafields},
  );
  const mutationResult = payload?.data?.metafieldsSet;
  const graphqlErrors = payload?.errors ?? [];
  const userErrors = mutationResult?.userErrors ?? [];

  if (!response.ok || graphqlErrors.length > 0 || userErrors.length > 0) {
    throw new Error(
      getGraphqlErrorMessage(
        payload,
        translate("companySettingsSaveError"),
        ["metafieldsSet"],
      ),
    );
  }
}
