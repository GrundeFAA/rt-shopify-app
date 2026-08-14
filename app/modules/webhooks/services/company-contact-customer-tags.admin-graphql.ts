export const CUSTOMER_TAGS_QUERY = `#graphql
  query CustomerTags($customerId: ID!) {
    customer(id: $customerId) {
      id
      tags
    }
  }
`;

export const CUSTOMER_TAGS_UPDATE_MUTATION = `#graphql
  mutation UpdateCustomerTags($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
`;
