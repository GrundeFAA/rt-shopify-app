import '@shopify/ui-extensions/preact';
import {render} from "preact";

export default async () => {
  render(<Extension />, document.body)
}

function Extension() {
  return (
    <s-banner tone="info">
      {shopify.i18n.translate("companyPaymentLegacyPlacement")}
    </s-banner>
  );
}
