import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useCallback, useEffect, useMemo, useState} from "preact/hooks";
import {
  buildCompanyUsers,
  formatLocationAddress,
  getMainLocation,
  validateOptionalEmail,
} from "./utils/company-dashboard";
import {
  loadCompanySettingsData,
  saveCompanySettings,
} from "./services/company-settings.service";
import {createCompanyLocation} from "./services/company-location-actions.service";

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
  const [mainLocationId, setMainLocationId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [emailError, setEmailError] = useState("");
  const [locationName, setLocationName] = useState("");
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryLine2, setDeliveryLine2] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [locationFormError, setLocationFormError] = useState("");
  const [locationFormSuccess, setLocationFormSuccess] = useState("");
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState({});
  const [selectedUserRoles, setSelectedUserRoles] = useState({});

  const loadCompanySettings = useCallback(async () => {
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

      setCompanyId(data.companyId);
      setAdministratorIds(data.administratorIds);
      setEhf(data.ehf);
      setInvoiceEmail(data.invoiceEmail);
      setLocations(data.locations);
      setMainLocationId(data.mainLocationId || "");
      setIsAdmin(data.isAdmin);
    } catch (error) {
      setLoadError(
        error instanceof Error && error.message
          ? error.message
          : shopify.i18n.translate("companySettingsLoadError"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedCompanyId, currentLocationId]);

  useEffect(() => {
    let isActive = true;

    loadCompanySettings().catch(() => {
      if (isActive) {
        setLoadError(shopify.i18n.translate("companySettingsLoadError"));
        setIsLoading(false);
      }
    });

    return () => {
      isActive = false;
    };
  }, [loadCompanySettings]);

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
  const mainLocation = useMemo(
    () => getMainLocation(locations, mainLocationId),
    [locations, mainLocationId],
  );

  function toggleSelectedUser(userId, checked) {
    setSelectedUserIds((currentValue) => ({
      ...currentValue,
      [userId]: checked,
    }));
    setSelectedUserRoles((currentValue) => ({
      ...currentValue,
      [userId]: currentValue[userId] || "buyer",
    }));
  }

  async function handleCreateLocation() {
    if (!companyId) {
      setLocationFormError(shopify.i18n.translate("companySettingsMissingCompany"));
      return;
    }

    if (!mainLocation) {
      setLocationFormError(shopify.i18n.translate("companySettingsMainLocationMissing"));
      return;
    }

    if (!locationName.trim() || !deliveryLine1.trim() || !deliveryPostalCode.trim() || !deliveryCity.trim()) {
      setLocationFormError(shopify.i18n.translate("companySettingsLocationValidationError"));
      return;
    }

    setIsCreatingLocation(true);
    setLocationFormError("");
    setLocationFormSuccess("");

    try {
      const selectedUsers = users
        .filter((user) => selectedUserIds[user.id])
        .map((user) => ({
          customerId: user.id,
          role: selectedUserRoles[user.id] || "buyer",
        }));

      await createCompanyLocation({
        companyId,
        locationName: locationName.trim(),
        deliveryAddress: {
          line1: deliveryLine1.trim(),
          line2: deliveryLine2.trim(),
          postalCode: deliveryPostalCode.trim(),
          city: deliveryCity.trim(),
        },
        selectedUsers,
      });

      setLocationFormSuccess(shopify.i18n.translate("companySettingsLocationCreateSuccess"));
      setLocationName("");
      setDeliveryLine1("");
      setDeliveryLine2("");
      setDeliveryPostalCode("");
      setDeliveryCity("");
      setSelectedUserIds({});
      setSelectedUserRoles({});
      await loadCompanySettings();
    } catch (error) {
      setLocationFormError(
        error instanceof Error && error.message
          ? error.message
          : shopify.i18n.translate("companySettingsLocationCreateError"),
      );
    } finally {
      setIsCreatingLocation(false);
    }
  }

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
                  <s-text>
                    {location.name || shopify.i18n.translate("companySettingsLocationFallback")}
                    {mainLocation && mainLocation.id === location.id
                      ? ` (${shopify.i18n.translate("companySettingsMainLocationLabel")})`
                      : ""}
                  </s-text>
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
              {locationFormError ? <s-banner tone="critical">{locationFormError}</s-banner> : null}
              {locationFormSuccess ? <s-banner tone="success">{locationFormSuccess}</s-banner> : null}

              <s-text>{shopify.i18n.translate("companySettingsAddLocationBody")}</s-text>
              <s-text>{shopify.i18n.translate("companySettingsMainLocationAddressLabel")}</s-text>
              <s-text>
                {mainLocation
                  ? formatLocationAddress(mainLocation, shopify.i18n.translate)
                  : shopify.i18n.translate("companySettingsMainLocationMissing")}
              </s-text>

              <s-text-field
                label={shopify.i18n.translate("companySettingsNewLocationNameLabel")}
                value={locationName}
                onInput={(event) => setLocationName(event.currentTarget.value)}
              />

              <s-text-field
                label={shopify.i18n.translate("companySettingsDeliveryAddressLine1")}
                value={deliveryLine1}
                onInput={(event) => setDeliveryLine1(event.currentTarget.value)}
              />
              <s-text-field
                label={shopify.i18n.translate("companySettingsDeliveryAddressLine2")}
                value={deliveryLine2}
                onInput={(event) => setDeliveryLine2(event.currentTarget.value)}
              />
              <s-grid gridTemplateColumns="1fr 1fr">
                <s-text-field
                  label={shopify.i18n.translate("companySettingsDeliveryPostalCode")}
                  value={deliveryPostalCode}
                  onInput={(event) => setDeliveryPostalCode(event.currentTarget.value)}
                />
                <s-text-field
                  label={shopify.i18n.translate("companySettingsDeliveryCity")}
                  value={deliveryCity}
                  onInput={(event) => setDeliveryCity(event.currentTarget.value)}
                />
              </s-grid>

              <s-stack direction="block" gap="tight">
                <s-text>{shopify.i18n.translate("companySettingsAssignUsersLabel")}</s-text>
                {users.length === 0 ? (
                  <s-text>{shopify.i18n.translate("companySettingsAssignUsersEmpty")}</s-text>
                ) : (
                  users.map((user) => (
                    <s-box key={user.id} border="base" borderRadius="base" padding="base">
                      <s-stack direction="block" gap="tight">
                        <s-checkbox
                          checked={Boolean(selectedUserIds[user.id])}
                          label={`${user.name} (${user.email})`}
                          onChange={(event) => toggleSelectedUser(user.id, event.currentTarget.checked)}
                        />
                        {selectedUserIds[user.id] ? (
                          <s-select
                            label={shopify.i18n.translate("companySettingsAssignRoleLabel")}
                            value={selectedUserRoles[user.id] || "buyer"}
                            onChange={(event) =>
                              setSelectedUserRoles((currentValue) => ({
                                ...currentValue,
                                [user.id]: event.currentTarget.value,
                              }))
                            }
                          >
                            <s-option value="buyer">
                              {shopify.i18n.translate("companySettingsRoleBuyer")}
                            </s-option>
                            <s-option value="admin">
                              {shopify.i18n.translate("companySettingsRoleAdmin")}
                            </s-option>
                          </s-select>
                        ) : null}
                      </s-stack>
                    </s-box>
                  ))
                )}
              </s-stack>

              <s-button disabled={isCreatingLocation} onClick={handleCreateLocation}>
                {isCreatingLocation
                  ? shopify.i18n.translate("companySettingsCreatingLocation")
                  : shopify.i18n.translate("companySettingsCreateLocation")}
              </s-button>
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
