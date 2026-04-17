export const COMPANY_SETTINGS_QUERY = `#graphql
  query CompanySettings($companyId: ID!) {
    company(id: $companyId) {
      id
      name
      ehf: metafield(namespace: "custom", key: "ehf") {
        value
        type
      }
      invoiceEmail: metafield(namespace: "custom", key: "invoice_email") {
        value
        type
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

export const COMPANY_USERS_QUERY = `#graphql
  query CompanyUsers($companyId: ID!) {
    company(id: $companyId) {
      id
      name
      contacts(first: 50) {
        nodes {
          id
          isMainContact
          title
          customer {
            id
            firstName
            lastName
            email
          }
          roleAssignments(first: 50) {
            nodes {
              companyLocation {
                id
                name
              }
              role {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

export const COMPANY_LOCATIONS_QUERY = `#graphql
  query CompanyLocations($companyId: ID!) {
    company(id: $companyId) {
      id
      name
      locations(first: 50) {
        nodes {
          id
          name
          shippingAddress {
            address1
            address2
            city
            province
            zip
            country
          }
        }
      }
    }
  }
`;
