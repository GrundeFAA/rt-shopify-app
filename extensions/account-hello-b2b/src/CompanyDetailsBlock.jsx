import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useEffect, useMemo, useState} from "preact/hooks";

const API_VERSION = "2026-01";
const METAFIELD_NAMESPACE = "custom";

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

function getGraphqlErrorMessage(payload, fallbackMessage) {
  const graphqlMessage = payload?.errors?.[0]?.message;
  const userErrorMessage = payload?.data?.metafieldsSet?.userErrors?.[0]?.message;

  return userErrorMessage || graphqlMessage || fallbackMessage;
}

function idsMatch(leftId, rightId) {
  if (!leftId || !rightId) {
    return false;
  }

  return leftId === rightId || leftId.endsWith(`/${rightId}`) || rightId.endsWith(`/${leftId}`);
}

export default async () => {
  render(<Extension />, document.body)
}

function Extension() {
  const authenticatedCompanyId = shopify.authenticatedAccount?.purchasingCompany?.value?.company?.id;
  const currentLocationId = shopify.authenticatedAccount?.purchasingCompany?.value?.location?.id;
  const [companyId, setCompanyId] = useState("");
  const [activeTab, setActiveTab] = useState("settings");
  const [activeUser, setActiveUser] = useState(null);
  const [administratorIds, setAdministratorIds] = useState([]);
  const [ehf, setEhf] = useState(false);
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadCompanySettings() {
      if (!currentLocationId && !authenticatedCompanyId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError("");
      setSaveError("");
      setSaveSuccess("");

      try {
        const response = await fetch(
          `shopify://customer-account/api/${API_VERSION}/graphql.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: COMPANY_SETTINGS_QUERY,
            }),
          },
        );

        const payload = await response.json();
        const companyContacts = payload?.data?.customer?.companyContacts?.nodes ?? [];
        const graphqlErrors = payload?.errors ?? [];
        const matchedContact =
          companyContacts.find((contact) =>
            idsMatch(contact?.company?.id, authenticatedCompanyId),
          ) ??
          companyContacts.find((contact) =>
            (contact?.locations?.nodes ?? []).some((location) => idsMatch(location?.id, currentLocationId)),
          ) ??
          companyContacts[0];
        const company = matchedContact?.company;
        const matchedCustomerId = matchedContact?.customer?.id;
        const administratorIdsFromReferences =
          company?.administrators?.references?.nodes?.map((node) => node?.id).filter(Boolean) ?? [];
        const administratorIdsFromJson = Array.isArray(company?.administrators?.jsonValue)
          ? company.administrators.jsonValue.filter(Boolean)
          : [];
        const nextAdministratorIds = [
          ...administratorIdsFromJson,
          ...administratorIdsFromReferences,
        ];

        if (!response.ok || graphqlErrors.length > 0) {
          throw new Error(
            getGraphqlErrorMessage(
              payload,
              shopify.i18n.translate("companySettingsLoadError"),
            ),
          );
        }

        if (!company || !matchedCustomerId) {
          throw new Error(shopify.i18n.translate("companySettingsMissingCompany"));
        }

        if (isActive) {
          setCompanyId(company.id);
          setAdministratorIds(nextAdministratorIds);
          setEhf(company.ehf?.value === "true");
          setInvoiceEmail(company.invoiceEmail?.value ?? "");
          setLocations(company.locations?.nodes ?? []);
          setIsAdmin(nextAdministratorIds.some((administratorId) => idsMatch(administratorId, matchedCustomerId)));
        }
      } catch (error) {
        if (isActive) {
          setLoadError(
            error instanceof Error && error.message
              ? error.message
              : shopify.i18n.translate("companySettingsLoadError"),
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadCompanySettings();

    return () => {
      isActive = false;
    };
  }, [authenticatedCompanyId, currentLocationId]);

  function validateEmail(value) {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return "";
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)
      ? ""
      : shopify.i18n.translate("companySettingsInvoiceEmailInvalid");
  }

  const users = useMemo(() => {
    const usersById = new Map();

    for (const location of locations) {
      const locationName = location?.name || shopify.i18n.translate("companySettingsLocationFallback");
      const contacts = location?.contacts?.nodes ?? [];

      for (const contact of contacts) {
        const customer = contact?.customer;
        const customerId = customer?.id ?? contact?.id;
        if (!customerId) continue;

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
          name: fullName || customer?.emailAddress?.emailAddress || shopify.i18n.translate("memberNameFallback"),
          email: customer?.emailAddress?.emailAddress || "-",
          locationNames: [locationName],
        });
      }
    }

    return [...usersById.values()];
  }, [administratorIds, locations]);

  async function handleSave() {
    if (!companyId) {
      setSaveError(shopify.i18n.translate("companySettingsMissingCompany"));
      return;
    }

    const nextEmailError = validateEmail(invoiceEmail);
    setEmailError(nextEmailError);
    setSaveError("");
    setSaveSuccess("");

    if (nextEmailError) {
      return;
    }

    setIsSaving(true);

    try {
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

      const response = await fetch(
        `shopify://customer-account/api/${API_VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: UPDATE_COMPANY_SETTINGS_MUTATION,
            variables: {metafields},
          }),
        },
      );

      const payload = await response.json();
      const mutationResult = payload?.data?.metafieldsSet;
      const graphqlErrors = payload?.errors ?? [];
      const userErrors = mutationResult?.userErrors ?? [];

      if (!response.ok || graphqlErrors.length > 0 || userErrors.length > 0) {
        throw new Error(
          getGraphqlErrorMessage(
            payload,
            shopify.i18n.translate("companySettingsSaveError"),
          ),
        );
      }

      setSaveSuccess(shopify.i18n.translate("companySettingsSaveSuccess"));
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : shopify.i18n.translate("companySettingsSaveError"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <s-box padding="base">
        <s-spinner accessibilityLabel={shopify.i18n.translate("companySettingsLoading")} />
      </s-box>
    );
  }

  if (loadError) {
    return <s-banner tone="critical">{loadError}</s-banner>;
  }

  if (!isAdmin) {
    return <s-banner tone="info">{shopify.i18n.translate("companySettingsNotAdmin")}</s-banner>;
  }

  const settingsContent = (
    <s-stack direction="block" gap="base">
      {saveError ? <s-banner tone="critical">{saveError}</s-banner> : null}
      {saveSuccess ? <s-banner tone="success">{saveSuccess}</s-banner> : null}

      <s-checkbox
        checked={ehf}
        label={shopify.i18n.translate("companySettingsEhfLabel")}
        onChange={(event) => setEhf(event.currentTarget.checked)}
      />

      <s-email-field
        autocomplete="billing email"
        error={emailError}
        label={shopify.i18n.translate("companySettingsInvoiceEmailLabel")}
        value={invoiceEmail}
        onInput={(event) => {
          const nextValue = event.currentTarget.value;
          setInvoiceEmail(nextValue);
          setEmailError(validateEmail(nextValue));
        }}
      />

      <s-button disabled={isSaving} onClick={handleSave}>
        {isSaving
          ? shopify.i18n.translate("companySettingsSaving")
          : shopify.i18n.translate("companySettingsSave")}
      </s-button>
    </s-stack>
  );

  const locationsContent = (
    <s-stack direction="block" gap="base">
      <s-text>{shopify.i18n.translate("companySettingsLocationsDescription")}</s-text>
      <s-button command="--show" commandFor="add-location-modal">
        {shopify.i18n.translate("companySettingsAddLocation")}
      </s-button>

      {locations.length === 0 ? (
        <s-text>{shopify.i18n.translate("companySettingsLocationsEmpty")}</s-text>
      ) : (
        <s-box border="base" borderRadius="base">
          {locations.map((location, index) => (
            <s-box key={location.id}>
              {index > 0 ? <s-divider /> : null}
              <s-box padding="base">
                <s-stack direction="block" gap="tight">
                  <s-text>{location.name || shopify.i18n.translate("companySettingsLocationFallback")}</s-text>
                  <s-text>
                    {[
                      location?.shippingAddress?.address1,
                      location?.shippingAddress?.city,
                      location?.shippingAddress?.zip,
                      location?.shippingAddress?.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || shopify.i18n.translate("companySettingsLocationNoAddress")}
                  </s-text>
                </s-stack>
              </s-box>
            </s-box>
          ))}
        </s-box>
      )}
    </s-stack>
  );

  const usersContent = (
    <s-stack direction="block" gap="base">
      <s-text>{shopify.i18n.translate("companySettingsUsersDescription")}</s-text>

      {users.length === 0 ? (
        <s-text>{shopify.i18n.translate("companySettingsUsersEmpty")}</s-text>
      ) : (
        <s-box border="base" borderRadius="base">
          <s-box padding="large" background="subdued">
            <s-grid alignItems="center" gridTemplateColumns="1.2fr 1.5fr 0.8fr 1.1fr auto">
              <s-text>{shopify.i18n.translate("memberName")}</s-text>
              <s-text>{shopify.i18n.translate("memberEmail")}</s-text>
              <s-text>{shopify.i18n.translate("companySettingsUserAdmin")}</s-text>
              <s-text>{shopify.i18n.translate("companySettingsUserLocations")}</s-text>
              <s-text>{shopify.i18n.translate("companySettingsUserActions")}</s-text>
            </s-grid>
          </s-box>
          {users.map((user, index) => (
            <s-box key={user.id}>
              {index > 0 ? <s-divider /> : null}
              <s-box padding="large">
                <s-grid alignItems="center" gridTemplateColumns="1.2fr 1.5fr 0.8fr 1.1fr auto">
                  <s-text>{user.name}</s-text>
                  <s-text>{user.email}</s-text>
                  <s-text>
                    {user.isAdmin
                      ? shopify.i18n.translate("companySettingsUserAdminYes")
                      : shopify.i18n.translate("companySettingsUserAdminNo")}
                  </s-text>
                  <s-text>{user.locationNames.join(", ")}</s-text>
                  <s-box padding="small-100">
                    <s-button
                      accessibilityLabel={shopify.i18n.translate("companySettingsEditUserAccessibilityLabel", {
                        name: user.name,
                      })}
                      command="--show"
                      commandFor="edit-user-modal"
                      onClick={() => setActiveUser(user)}
                      variant="secondary"
                    >
                      <s-icon size="small" type="edit" />
                    </s-button>
                  </s-box>
                </s-grid>
              </s-box>
            </s-box>
          ))}
        </s-box>
      )}
    </s-stack>
  );

  const activeTabContent =
    activeTab === "settings"
      ? settingsContent
      : activeTab === "locations"
        ? locationsContent
        : usersContent;

  return (
    <s-section heading={shopify.i18n.translate("companySettingsTitle")}>
      <s-stack direction="block" gap="base">
        <s-text>{shopify.i18n.translate("companySettingsDescription")}</s-text>
        <s-box border="base" borderRadius="base" overflow="hidden">
          <s-box background="subdued" padding="small-100">
            <s-grid gridTemplateColumns="repeat(3, 1fr)">
              <s-press-button
                inlineSize="fill"
                pressed={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
              >
                <s-stack alignItems="center" direction="inline" gap="small-100">
                  <s-icon size="small" type="settings" />
                  <s-text>{shopify.i18n.translate("companySettingsTabSettings")}</s-text>
                </s-stack>
              </s-press-button>
              <s-press-button
                inlineSize="fill"
                pressed={activeTab === "locations"}
                onClick={() => setActiveTab("locations")}
              >
                <s-stack alignItems="center" direction="inline" gap="small-100">
                  <s-icon size="small" type="location" />
                  <s-text>{shopify.i18n.translate("companySettingsTabLocations")}</s-text>
                </s-stack>
              </s-press-button>
              <s-press-button
                inlineSize="fill"
                pressed={activeTab === "users"}
                onClick={() => setActiveTab("users")}
              >
                <s-stack alignItems="center" direction="inline" gap="small-100">
                  <s-icon size="small" type="profile" />
                  <s-text>{shopify.i18n.translate("companySettingsTabUsers")}</s-text>
                </s-stack>
              </s-press-button>
            </s-grid>
          </s-box>
          <s-divider />
          <s-box background="base" padding="large">
            {activeTabContent}
          </s-box>
        </s-box>

        <s-modal
          id="add-location-modal"
          heading={shopify.i18n.translate("companySettingsAddLocation")}
        >
          <s-box padding="base">
            <s-stack direction="block" gap="base">
              <s-text>{shopify.i18n.translate("companySettingsAddLocationBody")}</s-text>
              <s-button command="--hide" commandFor="add-location-modal">
                {shopify.i18n.translate("close")}
              </s-button>
            </s-stack>
          </s-box>
        </s-modal>
        <s-modal
          id="edit-user-modal"
          heading={shopify.i18n.translate("companySettingsEditUser")}
        >
          <s-box padding="base">
            <s-stack direction="block" gap="base">
              <s-text>
                {activeUser
                  ? shopify.i18n.translate("companySettingsEditUserBody", {
                      name: activeUser.name,
                    })
                  : shopify.i18n.translate("companySettingsEditUserNoSelection")}
              </s-text>
              <s-button command="--hide" commandFor="edit-user-modal">
                {shopify.i18n.translate("close")}
              </s-button>
            </s-stack>
          </s-box>
        </s-modal>
      </s-stack>
    </s-section>
  );
}
