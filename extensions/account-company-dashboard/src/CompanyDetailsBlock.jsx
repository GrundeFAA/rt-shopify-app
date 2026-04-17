import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useEffect, useMemo, useState} from "preact/hooks";
import {
  buildCompanyUsers,
  formatLocationAddress,
  validateOptionalEmail,
} from "./utils/company-dashboard";
import {
  loadCompanySettingsData,
  saveCompanySettings,
} from "./services/company-settings.service";

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
        const data = await loadCompanySettingsData({
          authenticatedCompanyId,
          currentLocationId,
          translate: shopify.i18n.translate,
        });

        if (isActive) {
          setCompanyId(data.companyId);
          setAdministratorIds(data.administratorIds);
          setEhf(data.ehf);
          setInvoiceEmail(data.invoiceEmail);
          setLocations(data.locations);
          setIsAdmin(data.isAdmin);
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
    return validateOptionalEmail(
      value,
      shopify.i18n.translate("companySettingsInvoiceEmailInvalid"),
    );
  }

  const users = useMemo(
    () => buildCompanyUsers(locations, administratorIds, shopify.i18n.translate),
    [administratorIds, locations],
  );

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
      await saveCompanySettings({
        companyId,
        ehf,
        invoiceEmail,
        translate: shopify.i18n.translate,
      });
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
                    {formatLocationAddress(location, shopify.i18n.translate)}
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
