import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useEffect, useMemo, useState} from "preact/hooks";
import {loadCompanyLocationMembers} from "./services/company-location-members.service";

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
        const nextMembers = await loadCompanyLocationMembers({
          locationId,
          translate: shopify.i18n.translate,
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
