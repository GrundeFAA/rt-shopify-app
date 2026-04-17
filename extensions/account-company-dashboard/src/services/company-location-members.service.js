import {
  fetchCustomerAccountGraphql,
  getGraphqlErrorMessage,
} from "../customer-account-api/client";

const COMPANY_LOCATION_MEMBERS_QUERY = `#graphql
  query CompanyLocationMembers($locationId: ID!) {
    companyLocation(id: $locationId) {
      id
      contacts(first: 50) {
        nodes {
          id
          title
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
      roleAssignments(first: 50) {
        nodes {
          contact {
            id
          }
          role {
            id
            name
          }
        }
      }
    }
  }
`;

export async function loadCompanyLocationMembers({locationId, translate}) {
  const {response, payload} = await fetchCustomerAccountGraphql(
    COMPANY_LOCATION_MEMBERS_QUERY,
    {locationId},
  );
  const companyLocation = payload?.data?.companyLocation;
  const graphqlErrors = payload?.errors ?? [];

  if (!response.ok || graphqlErrors.length > 0 || !companyLocation) {
    throw new Error(
      getGraphqlErrorMessage(
        payload,
        translate("memberLoadError"),
      ),
    );
  }

  const roleAssignments = companyLocation.roleAssignments?.nodes ?? [];
  const contacts = companyLocation.contacts?.nodes ?? [];
  const roleNamesByContactId = new Map();

  for (const assignment of roleAssignments) {
    const contactId = assignment?.contact?.id;
    const roleName = assignment?.role?.name;
    if (!contactId || !roleName) continue;

    const existingRoleNames = roleNamesByContactId.get(contactId) ?? [];
    existingRoleNames.push(roleName);
    roleNamesByContactId.set(contactId, existingRoleNames);
  }

  return contacts.map((contact) => {
    const customer = contact.customer;
    const fullName = [customer?.firstName, customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      id: contact.id,
      name: fullName || customer?.emailAddress?.emailAddress || translate("memberNameFallback"),
      permission:
        (roleNamesByContactId.get(contact.id) ?? []).join(", ") ||
        translate("memberPermissionUnknown"),
      email: customer?.emailAddress?.emailAddress || "-",
    };
  });
}
