import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body)
}

function Extension() {
  return (
    <s-banner tone="info">
      <s-text>
        {shopify.i18n.translate("companyAddressesPlaceholder")}
      </s-text>
    </s-banner>
  );
}
