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
              id
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

export const COMPANY_LOCATION_DELETE_MUTATION = `#graphql
  mutation CompanyLocationDelete($companyLocationId: ID!) {
    companyLocationDelete(companyLocationId: $companyLocationId) {
      deletedCompanyLocationId
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

export const COMPANY_CONTACT_REVOKE_ROLES_MUTATION = `#graphql
  mutation CompanyContactRevokeRoles($companyContactId: ID!, $roleAssignmentIds: [ID!]) {
    companyContactRevokeRoles(
      companyContactId: $companyContactId
      roleAssignmentIds: $roleAssignmentIds
    ) {
      revokedRoleAssignmentIds
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
      ehf: metafield(namespace: "custom", key: "ehf") {
        value
      }
      invoiceEmail: metafield(namespace: "custom", key: "invoice_email") {
        value
      }
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
            firstName
            lastName
            email
          }
          roleAssignments(first: 50) {
            nodes {
              id
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
          ordersCount {
            count
          }
          taxSettings {
            taxRegistrationId
          }
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
