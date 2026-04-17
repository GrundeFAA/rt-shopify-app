export const CUSTOMER_BY_EMAIL_QUERY = `#graphql
  query CustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      nodes {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

export const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation RegisterCustomer($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        firstName
        lastName
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const COMPANY_LOCATIONS_FOR_TAX_ID_QUERY = `#graphql
  query CompanyLocationsForTaxId($first: Int!, $after: String) {
    companyLocations(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        name
        taxSettings {
          taxRegistrationId
        }
        company {
          id
          name
        }
      }
    }
  }
`;

export const COMPANY_CREATE_MUTATION = `#graphql
  mutation RegisterCompany($input: CompanyCreateInput!) {
    companyCreate(input: $input) {
      company {
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

export const COMPANY_BY_ID_QUERY = `#graphql
  query CompanyForOnboarding($companyId: ID!) {
    company(id: $companyId) {
      id
      name
      contactRoles(first: 10) {
        nodes {
          id
          name
        }
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
        }
      }
    }
  }
`;

export const COMPANY_LOCATION_CREATE_MUTATION = `#graphql
  mutation RegisterCompanyLocation($companyId: ID!, $input: CompanyLocationInput!) {
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

export const COMPANY_ASSIGN_CUSTOMER_AS_CONTACT_MUTATION = `#graphql
  mutation RegisterCompanyContact($companyId: ID!, $customerId: ID!) {
    companyAssignCustomerAsContact(companyId: $companyId, customerId: $customerId) {
      companyContact {
        id
        customer {
          id
          email
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const COMPANY_CONTACT_ASSIGN_ROLES_MUTATION = `#graphql
  mutation RegisterCompanyContactRoles(
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

export const COMPANY_METAFIELDS_SET_MUTATION = `#graphql
  mutation RegisterCompanyMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        key
        namespace
        value
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`;
