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
      mainLocationId: metafield(namespace: "custom", key: "main_location_id") {
        value
      }
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

export const COMPANY_LOCATION_CREATE_MUTATION = `#graphql
  mutation CompanyLocationCreate($companyId: ID!, $input: CompanyLocationInput!) {
    companyLocationCreate(companyId: $companyId, input: $input) {
      companyLocation {
        id
        name
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const COMPANY_CONTACT_ASSIGN_ROLES_MUTATION = `#graphql
  mutation CompanyContactAssignRoles(
    $companyContactId: ID!
    $rolesToAssign: [CompanyContactRoleAssign!]!
  ) {
    companyContactAssignRoles(
      companyContactId: $companyContactId
      rolesToAssign: $rolesToAssign
    ) {
      roleAssignments {
        companyLocation {
          id
          name
        }
        role {
          id
          name
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const COMPANY_MAIN_LOCATION_QUERY = `#graphql
  query CompanyLocationManagement($companyId: ID!) {
    company(id: $companyId) {
      id
      name
      mainLocationId: metafield(namespace: "custom", key: "main_location_id") {
        value
      }
      administrators: metafield(namespace: "custom", key: "administrators") {
        jsonValue
        references(first: 50) {
          nodes {
            __typename
            ... on Customer {
              id
            }
          }
        }
      }
      contactRoles(first: 10) {
        nodes {
          id
          name
        }
      }
      contacts(first: 50) {
        nodes {
          id
          customer {
            id
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
      locations(first: 50) {
        nodes {
          id
          name
          billingAddress {
            address1
            address2
            city
            province
            zip
            country
          }
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
