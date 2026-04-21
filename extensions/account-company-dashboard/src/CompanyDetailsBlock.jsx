import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useCallback, useEffect, useMemo, useState} from "preact/hooks";
import {
  buildCompanyUsers,
  formatLocationAddress,
  getMainLocation,
  idsMatch,
  validateOptionalEmail,
} from "./utils/company-dashboard";
import {
  loadCompanySettingsData,
  saveCompanySettings,
} from "./services/company-settings.service";
import {createCompanyLocation, deleteCompanyLocation} from "./services/company-location-actions.service";
import {inviteCompanyUser, updateCompanyUser} from "./services/company-user-actions.service";

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
  const [deletingLocationId, setDeletingLocationId] = useState("");
  const [locationDeleteError, setLocationDeleteError] = useState("");
  const [locationDeleteSuccess, setLocationDeleteSuccess] = useState("");
  const [addAllUsersToLocation, setAddAllUsersToLocation] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState({});
  const [selectedUserRoles, setSelectedUserRoles] = useState({});
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCompanyAdmin, setInviteCompanyAdmin] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [isInvitingUser, setIsInvitingUser] = useState(false);
  const [selectedInviteLocationIds, setSelectedInviteLocationIds] = useState({});
  const [selectedInviteRoles, setSelectedInviteRoles] = useState({});
  const [editUserError, setEditUserError] = useState("");
  const [editUserSuccess, setEditUserSuccess] = useState("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editCompanyAdmin, setEditCompanyAdmin] = useState(false);
  const [selectedEditLocationIds, setSelectedEditLocationIds] = useState({});
  const [selectedEditRoles, setSelectedEditRoles] = useState({});

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

  function toggleInviteLocation(locationId, checked) {
    setSelectedInviteLocationIds((currentValue) => ({
      ...currentValue,
      [locationId]: checked,
    }));
    setSelectedInviteRoles((currentValue) => ({
      ...currentValue,
      [locationId]: currentValue[locationId] || "buyer",
    }));
  }

  function openEditUser(user) {
    setActiveUser(user);
    setEditCompanyAdmin(Boolean(user.isAdmin));
    setEditUserError("");
    setEditUserSuccess("");

    const nextSelectedLocationIds = {};
    const nextSelectedRoles = {};

    for (const assignment of user.assignments ?? []) {
      nextSelectedLocationIds[assignment.companyLocationId] = true;
      nextSelectedRoles[assignment.companyLocationId] = assignment.role;
    }

    setSelectedEditLocationIds(nextSelectedLocationIds);
    setSelectedEditRoles(nextSelectedRoles);
  }

  function toggleEditLocation(locationId, checked) {
    setSelectedEditLocationIds((currentValue) => ({
      ...currentValue,
      [locationId]: checked,
    }));
    setSelectedEditRoles((currentValue) => ({
      ...currentValue,
      [locationId]: currentValue[locationId] || "buyer",
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
    setLocationDeleteError("");
    setLocationDeleteSuccess("");

    try {
      const selectedUsers = users
        .filter((user) => addAllUsersToLocation || selectedUserIds[user.id])
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
      setAddAllUsersToLocation(false);
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

  async function handleDeleteLocation(locationId) {
    if (!companyId || !locationId) {
      setLocationDeleteError(shopify.i18n.translate("companySettingsMissingCompany"));
      return;
    }

    if (idsMatch(mainLocationId, locationId)) {
      setLocationDeleteError(shopify.i18n.translate("companySettingsLocationDeleteMainError"));
      return;
    }

    setDeletingLocationId(locationId);
    setLocationDeleteError("");
    setLocationDeleteSuccess("");

    try {
      await deleteCompanyLocation({
        companyId,
        companyLocationId: locationId,
      });
      setLocationDeleteSuccess(shopify.i18n.translate("companySettingsLocationDeleteSuccess"));
      await loadCompanySettings();
    } catch (error) {
      setLocationDeleteError(
        error instanceof Error && error.message
          ? error.message
          : shopify.i18n.translate("companySettingsLocationDeleteError"),
      );
    } finally {
      setDeletingLocationId("");
    }
  }

  async function handleInviteUser() {
    if (!companyId) {
      setInviteError(shopify.i18n.translate("companySettingsMissingCompany"));
      return;
    }

    if (!inviteFirstName.trim() || !inviteLastName.trim() || !inviteEmail.trim()) {
      setInviteError(shopify.i18n.translate("companySettingsInviteValidationError"));
      return;
    }

    const assignments = locations
      .filter((location) => selectedInviteLocationIds[location.id])
      .map((location) => ({
        companyLocationId: location.id,
        role: selectedInviteRoles[location.id] || "buyer",
      }));

    if (assignments.length === 0) {
      setInviteError(shopify.i18n.translate("companySettingsInviteAssignmentsRequired"));
      return;
    }

    setInviteError("");
    setInviteSuccess("");
    setIsInvitingUser(true);

    try {
      await inviteCompanyUser({
        companyId,
        firstName: inviteFirstName.trim(),
        lastName: inviteLastName.trim(),
        email: inviteEmail.trim(),
        companyAdmin: inviteCompanyAdmin,
        assignments,
      });

      setInviteSuccess(shopify.i18n.translate("companySettingsInviteSuccess"));
      setInviteFirstName("");
      setInviteLastName("");
      setInviteEmail("");
      setInviteCompanyAdmin(false);
      setSelectedInviteLocationIds({});
      setSelectedInviteRoles({});
      await loadCompanySettings();
    } catch (error) {
      setInviteError(
        error instanceof Error && error.message
          ? error.message
          : shopify.i18n.translate("companySettingsInviteError"),
      );
    } finally {
      setIsInvitingUser(false);
    }
  }

  async function handleUpdateUser() {
    if (!companyId || !activeUser) {
      setEditUserError(shopify.i18n.translate("companySettingsEditUserNoSelection"));
      return;
    }

    const assignments = locations
      .filter((location) => selectedEditLocationIds[location.id])
      .map((location) => ({
        companyLocationId: location.id,
        role: selectedEditRoles[location.id] || "buyer",
      }));

    if (assignments.length === 0) {
      setEditUserError(shopify.i18n.translate("companySettingsEditAssignmentsRequired"));
      return;
    }

    setEditUserError("");
    setEditUserSuccess("");
    setIsUpdatingUser(true);

    try {
      await updateCompanyUser({
        companyId,
        customerId: activeUser.id,
        companyAdmin: editCompanyAdmin,
        assignments,
      });

      setEditUserSuccess(shopify.i18n.translate("companySettingsEditUserSuccess"));
      await loadCompanySettings();
    } catch (error) {
      setEditUserError(
        error instanceof Error && error.message
          ? error.message
          : shopify.i18n.translate("companySettingsEditUserError"),
      );
    } finally {
      setIsUpdatingUser(false);
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

      <s-button inlineSize="fit-content" variant="secondary" disabled={isSaving} onClick={handleSave}>
        {isSaving
          ? shopify.i18n.translate("companySettingsSaving")
          : shopify.i18n.translate("companySettingsSave")}
      </s-button>
    </s-stack>
  );

  const locationsContent = (
    <s-stack direction="block" gap="base">
      <s-text>{shopify.i18n.translate("companySettingsLocationsDescription")}</s-text>
      <s-button inlineSize="fit-content" variant="secondary" command="--show" commandFor="add-location-modal">
        {shopify.i18n.translate("companySettingsAddLocation")}
      </s-button>
      {locationDeleteError ? <s-banner tone="critical">{locationDeleteError}</s-banner> : null}
      {locationDeleteSuccess ? <s-banner tone="success">{locationDeleteSuccess}</s-banner> : null}

      {locations.length === 0 ? (
        <s-text>{shopify.i18n.translate("companySettingsLocationsEmpty")}</s-text>
      ) : (
        <s-box border="base" borderRadius="base">
          <s-box padding="large" background="subdued">
            <s-grid alignItems="center" gridTemplateColumns="1.2fr 1.8fr auto">
              <s-text>{shopify.i18n.translate("companySettingsLocationNameColumn")}</s-text>
              <s-text>{shopify.i18n.translate("companySettingsLocationAddressColumn")}</s-text>
              <s-text>{shopify.i18n.translate("companySettingsUserActions")}</s-text>
            </s-grid>
          </s-box>
          {locations.map((location, index) => (
            <s-box key={location.id}>
              {index > 0 ? <s-divider /> : null}
              <s-box padding="large">
                <s-grid alignItems="center" gridTemplateColumns="1.2fr 1.8fr auto">
                  <s-text>
                    {location.name || shopify.i18n.translate("companySettingsLocationFallback")}
                    {mainLocation && mainLocation.id === location.id
                      ? ` (${shopify.i18n.translate("companySettingsMainLocationLabel")})`
                      : ""}
                    {location.hasOrders
                      ? ` (${shopify.i18n.translate("companySettingsLocationHasOrdersLabel")})`
                      : ""}
                  </s-text>
                  <s-text>{formatLocationAddress(location, shopify.i18n.translate)}</s-text>
                  <s-box padding="small-100">
                    <s-button
                      accessibilityLabel={shopify.i18n.translate("companySettingsDeleteLocationAccessibilityLabel", {
                        name: location.name || shopify.i18n.translate("companySettingsLocationFallback"),
                      })}
                      disabled={
                        deletingLocationId === location.id ||
                        idsMatch(mainLocationId, location.id) ||
                        location.hasOrders
                      }
                      onClick={() => handleDeleteLocation(location.id)}
                      variant="secondary"
                    >
                      {deletingLocationId === location.id ? (
                        <s-spinner accessibilityLabel={shopify.i18n.translate("companySettingsDeletingLocation")} />
                      ) : (
                        <s-icon size="small" type="delete" />
                      )}
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

  const usersContent = (
    <s-stack direction="block" gap="base">
      <s-text>{shopify.i18n.translate("companySettingsUsersDescription")}</s-text>
      <s-button inlineSize="fit-content" variant="secondary" command="--show" commandFor="invite-user-modal">
        {shopify.i18n.translate("companySettingsInviteUser")}
      </s-button>

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
                      onClick={() => openEditUser(user)}
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
                <s-checkbox
                  checked={addAllUsersToLocation}
                  disabled={users.length === 0}
                  label={shopify.i18n.translate("companySettingsAssignAllUsersLabel")}
                  onChange={(event) => setAddAllUsersToLocation(event.currentTarget.checked)}
                />
                {users.length === 0 ? (
                  <s-text>{shopify.i18n.translate("companySettingsAssignUsersEmpty")}</s-text>
                ) : (
                  users.map((user) => (
                    <s-box key={user.id} border="base" borderRadius="base" padding="base">
                      <s-stack direction="block" gap="tight">
                        <s-checkbox
                          checked={addAllUsersToLocation || Boolean(selectedUserIds[user.id])}
                          disabled={addAllUsersToLocation}
                          label={`${user.name} (${user.email})`}
                          onChange={(event) => toggleSelectedUser(user.id, event.currentTarget.checked)}
                        />
                        {addAllUsersToLocation || selectedUserIds[user.id] ? (
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

              <s-button inlineSize="fit-content" variant="secondary" disabled={isCreatingLocation} onClick={handleCreateLocation}>
                {isCreatingLocation
                  ? shopify.i18n.translate("companySettingsCreatingLocation")
                  : shopify.i18n.translate("companySettingsCreateLocation")}
              </s-button>
              <s-button inlineSize="fit-content" variant="secondary" command="--hide" commandFor="add-location-modal">
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
              {editUserError ? <s-banner tone="critical">{editUserError}</s-banner> : null}
              {editUserSuccess ? <s-banner tone="success">{editUserSuccess}</s-banner> : null}

              <s-text>{shopify.i18n.translate("companySettingsEditUserBody", {
                name: activeUser?.name || "",
              })}</s-text>
              <s-text>{activeUser?.email || shopify.i18n.translate("companySettingsEditUserNoSelection")}</s-text>

              <s-checkbox
                checked={editCompanyAdmin}
                disabled={!activeUser}
                label={shopify.i18n.translate("companySettingsInviteCompanyAdmin")}
                onChange={(event) => setEditCompanyAdmin(event.currentTarget.checked)}
              />

              <s-stack direction="block" gap="tight">
                <s-text>{shopify.i18n.translate("companySettingsInviteAssignmentsLabel")}</s-text>
                {locations.map((location) => (
                  <s-box key={location.id} border="base" borderRadius="base" padding="base">
                    <s-stack direction="block" gap="tight">
                      <s-checkbox
                        checked={Boolean(selectedEditLocationIds[location.id])}
                        disabled={!activeUser}
                        label={location.name || shopify.i18n.translate("companySettingsLocationFallback")}
                        onChange={(event) => toggleEditLocation(location.id, event.currentTarget.checked)}
                      />
                      {selectedEditLocationIds[location.id] ? (
                        <s-select
                          label={shopify.i18n.translate("companySettingsAssignRoleLabel")}
                          value={selectedEditRoles[location.id] || "buyer"}
                          onChange={(event) =>
                            setSelectedEditRoles((currentValue) => ({
                              ...currentValue,
                              [location.id]: event.currentTarget.value,
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
                ))}
              </s-stack>

              <s-button inlineSize="fit-content" variant="secondary" disabled={isUpdatingUser || !activeUser} onClick={handleUpdateUser}>
                {isUpdatingUser
                  ? shopify.i18n.translate("companySettingsUpdatingUser")
                  : shopify.i18n.translate("companySettingsSaveUserAccess")}
              </s-button>
              <s-button inlineSize="fit-content" variant="secondary" command="--hide" commandFor="edit-user-modal">
                {shopify.i18n.translate("close")}
              </s-button>
            </s-stack>
          </s-box>
        </s-modal>
        <s-modal
          id="invite-user-modal"
          heading={shopify.i18n.translate("companySettingsInviteUser")}
        >
          <s-box padding="base">
            <s-stack direction="block" gap="base">
              {inviteError ? <s-banner tone="critical">{inviteError}</s-banner> : null}
              {inviteSuccess ? <s-banner tone="success">{inviteSuccess}</s-banner> : null}

              <s-text>{shopify.i18n.translate("companySettingsInviteUserBody")}</s-text>

              <s-grid gridTemplateColumns="1fr 1fr">
                <s-text-field
                  label={shopify.i18n.translate("companySettingsInviteFirstName")}
                  value={inviteFirstName}
                  onInput={(event) => setInviteFirstName(event.currentTarget.value)}
                />
                <s-text-field
                  label={shopify.i18n.translate("companySettingsInviteLastName")}
                  value={inviteLastName}
                  onInput={(event) => setInviteLastName(event.currentTarget.value)}
                />
              </s-grid>

              <s-email-field
                label={shopify.i18n.translate("companySettingsInviteEmail")}
                value={inviteEmail}
                onInput={(event) => setInviteEmail(event.currentTarget.value)}
              />

              <s-checkbox
                checked={inviteCompanyAdmin}
                label={shopify.i18n.translate("companySettingsInviteCompanyAdmin")}
                onChange={(event) => setInviteCompanyAdmin(event.currentTarget.checked)}
              />

              <s-stack direction="block" gap="tight">
                <s-text>{shopify.i18n.translate("companySettingsInviteAssignmentsLabel")}</s-text>
                {locations.map((location) => (
                  <s-box key={location.id} border="base" borderRadius="base" padding="base">
                    <s-stack direction="block" gap="tight">
                      <s-checkbox
                        checked={Boolean(selectedInviteLocationIds[location.id])}
                        label={location.name || shopify.i18n.translate("companySettingsLocationFallback")}
                        onChange={(event) => toggleInviteLocation(location.id, event.currentTarget.checked)}
                      />
                      {selectedInviteLocationIds[location.id] ? (
                        <s-select
                          label={shopify.i18n.translate("companySettingsAssignRoleLabel")}
                          value={selectedInviteRoles[location.id] || "buyer"}
                          onChange={(event) =>
                            setSelectedInviteRoles((currentValue) => ({
                              ...currentValue,
                              [location.id]: event.currentTarget.value,
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
                ))}
              </s-stack>

              <s-button inlineSize="fit-content" variant="secondary" disabled={isInvitingUser} onClick={handleInviteUser}>
                {isInvitingUser
                  ? shopify.i18n.translate("companySettingsInvitingUser")
                  : shopify.i18n.translate("companySettingsInviteUser")}
              </s-button>
              <s-button inlineSize="fit-content" variant="secondary" command="--hide" commandFor="invite-user-modal">
                {shopify.i18n.translate("close")}
              </s-button>
            </s-stack>
          </s-box>
        </s-modal>
      </s-stack>
    </s-section>
  );
}
