import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useEffect, useMemo, useState} from "preact/hooks";

const API_VERSION = "2026-01";
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

export default async () => {
  render(<Extension />, document.body)
}

function Extension() {
  const locationId = shopify.locationId;
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadMembers() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(
          `shopify://customer-account/api/${API_VERSION}/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: COMPANY_LOCATION_MEMBERS_QUERY,
              variables: {locationId},
            }),
          },
        );

        const payload = await response.json();
        const companyLocation = payload?.data?.companyLocation;
        const graphqlErrors = payload?.errors ?? [];

        if (!response.ok || graphqlErrors.length > 0 || !companyLocation) {
          throw new Error("Unable to load company members.");
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

        const nextMembers = contacts.map((contact) => {
          const customer = contact.customer;
          const fullName = [customer?.firstName, customer?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim();

          return {
            id: contact.id,
            name: fullName || customer?.emailAddress?.emailAddress || shopify.i18n.translate("memberNameFallback"),
            permission:
              (roleNamesByContactId.get(contact.id) ?? []).join(", ") ||
              shopify.i18n.translate("memberPermissionUnknown"),
            email: customer?.emailAddress?.emailAddress || "-",
          };
        });

        if (isActive) {
          setMembers(nextMembers);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(shopify.i18n.translate("memberLoadError"));
          setMembers([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      isActive = false;
    };
  }, [locationId]);

  const modalContent = useMemo(() => {
    if (isLoading) {
      return (
        <s-box padding="base">
          <s-spinner accessibilityLabel={shopify.i18n.translate("memberLoading")} />
        </s-box>
      );
    }

    if (errorMessage) {
      return <s-banner tone="critical">{errorMessage}</s-banner>;
    }

    if (members.length === 0) {
      return (
        <s-box padding="base">
          <s-text>{shopify.i18n.translate("memberEmptyState")}</s-text>
        </s-box>
      );
    }

    return (
      <s-box border="base" borderRadius="base">
        <s-box padding="base" background="subdued">
          <s-grid gridTemplateColumns="1.5fr 1fr 2fr">
            <s-text>{shopify.i18n.translate("memberName")}</s-text>
            <s-text>{shopify.i18n.translate("memberPermission")}</s-text>
            <s-text>{shopify.i18n.translate("memberEmail")}</s-text>
          </s-grid>
        </s-box>
        {members.map((member, index) => (
          <s-box key={member.id}>
            {index > 0 ? <s-divider /> : null}
            <s-box padding="base">
              <s-grid gridTemplateColumns="1.5fr 1fr 2fr">
                <s-text>{member.name}</s-text>
                <s-text>{member.permission}</s-text>
                <s-text>{member.email}</s-text>
              </s-grid>
            </s-box>
          </s-box>
        ))}
      </s-box>
    );
  }, [errorMessage, isLoading, members]);

  return (
    <s-box>
      <s-button command="--show" commandFor="manage-users-modal">
        {shopify.i18n.translate("manageUsers")}
      </s-button>
      <s-modal id="manage-users-modal" heading={shopify.i18n.translate("manageUsersModalTitle")}>
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            <s-text>{shopify.i18n.translate("manageUsersModalBody")}</s-text>
            {modalContent}
            <s-button command="--hide" commandFor="manage-users-modal">
              {shopify.i18n.translate("close")}
            </s-button>
          </s-stack>
        </s-box>
      </s-modal>
    </s-box>
  );
}
