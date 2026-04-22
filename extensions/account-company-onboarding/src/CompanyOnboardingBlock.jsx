import '@shopify/ui-extensions/preact';
import {render} from "preact";
import {useState} from "preact/hooks";
import {submitCompanyOnboarding} from "./services/company-onboarding.service";

export default async () => {
  render(<Extension />, document.body);
};

function isValidEmail(value) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeOrgNumber(value) {
  return value.replace(/\D+/g, "");
}

function Extension() {
  const existingCompanyId = shopify.authenticatedAccount?.purchasingCompany?.value?.company?.id;
  const [companyName, setCompanyName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [locationName, setLocationName] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoiceElectronic, setInvoiceElectronic] = useState(false);
  const [invoiceLine1, setInvoiceLine1] = useState("");
  const [invoiceLine2, setInvoiceLine2] = useState("");
  const [invoicePostalCode, setInvoicePostalCode] = useState("");
  const [invoiceCity, setInvoiceCity] = useState("");
  const [sameAsInvoice, setSameAsInvoice] = useState(true);
  const [deliveryLine1, setDeliveryLine1] = useState("");
  const [deliveryLine2, setDeliveryLine2] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  if (existingCompanyId) {
    return (
      <s-section heading={shopify.i18n.translate("companyOnboardingTitle")}>
        <s-banner tone="info">
          {shopify.i18n.translate("companyOnboardingAlreadyCompany")}
        </s-banner>
      </s-section>
    );
  }

  function validate() {
    const nextErrors = {};
    if (!companyName.trim()) {
      nextErrors.companyName = shopify.i18n.translate("companyOnboardingCompanyNameRequired");
    }

    const normalized = normalizeOrgNumber(orgNumber);
    if (normalized.length !== 9) {
      nextErrors.orgNumber = shopify.i18n.translate("companyOnboardingOrgNumberInvalid");
    }

    if (!locationName.trim()) {
      nextErrors.locationName = shopify.i18n.translate("companyOnboardingLocationNameRequired");
    }

    if (!isValidEmail(invoiceEmail.trim())) {
      nextErrors.invoiceEmail = shopify.i18n.translate("companyOnboardingInvoiceEmailInvalid");
    }

    if (!invoiceLine1.trim()) {
      nextErrors.invoiceLine1 = shopify.i18n.translate("companyOnboardingAddressLine1Required");
    }
    if (!invoicePostalCode.trim()) {
      nextErrors.invoicePostalCode = shopify.i18n.translate("companyOnboardingPostalCodeRequired");
    }
    if (!invoiceCity.trim()) {
      nextErrors.invoiceCity = shopify.i18n.translate("companyOnboardingCityRequired");
    }

    if (!sameAsInvoice) {
      if (!deliveryLine1.trim()) {
        nextErrors.deliveryLine1 = shopify.i18n.translate("companyOnboardingAddressLine1Required");
      }
      if (!deliveryPostalCode.trim()) {
        nextErrors.deliveryPostalCode = shopify.i18n.translate("companyOnboardingPostalCodeRequired");
      }
      if (!deliveryCity.trim()) {
        nextErrors.deliveryCity = shopify.i18n.translate("companyOnboardingCityRequired");
      }
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    setSubmitError("");
    setSubmitSuccess("");

    if (!validate()) {
      setSubmitError(shopify.i18n.translate("companyOnboardingValidationError"));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitCompanyOnboarding({
        version: 1,
        account_type: "company",
        company: {
          name: companyName.trim(),
          organization_number: normalizeOrgNumber(orgNumber),
          location_name: locationName.trim(),
          invoice: {
            electronic_invoice: invoiceElectronic,
            email: invoiceEmail.trim(),
            address: {
              country: "NO",
              line1: invoiceLine1.trim(),
              line2: invoiceLine2.trim(),
              postal_code: invoicePostalCode.trim(),
              city: invoiceCity.trim(),
            },
          },
          delivery: sameAsInvoice
            ? {
                same_as_invoice: true,
                address: null,
              }
            : {
                same_as_invoice: false,
                address: {
                  country: "NO",
                  line1: deliveryLine1.trim(),
                  line2: deliveryLine2.trim(),
                  postal_code: deliveryPostalCode.trim(),
                  city: deliveryCity.trim(),
                },
              },
        },
      });

      setSubmitSuccess(shopify.i18n.translate("companyOnboardingSubmitSuccess"));
      setFieldErrors({});
    } catch (error) {
      setSubmitError(
        error instanceof Error && error.message
          ? error.message
          : shopify.i18n.translate("companyOnboardingSubmitError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <s-section heading={shopify.i18n.translate("companyOnboardingTitle")}>
      <s-stack direction="block" gap="base">
        <s-text>{shopify.i18n.translate("companyOnboardingDescription")}</s-text>
        <s-button inlineSize="fit-content" variant="secondary" command="--show" commandFor="company-onboarding-modal">
          {shopify.i18n.translate("companyOnboardingButton")}
        </s-button>
      </s-stack>

      <s-modal id="company-onboarding-modal" heading={shopify.i18n.translate("companyOnboardingModalTitle")}>
        <s-box padding="base">
          <s-stack direction="block" gap="base">
            {submitError ? <s-banner tone="critical">{submitError}</s-banner> : null}
            {submitSuccess ? <s-banner tone="success">{submitSuccess}</s-banner> : null}

            <s-text-field
              error={fieldErrors.companyName}
              label={shopify.i18n.translate("companyOnboardingCompanyNameLabel")}
              value={companyName}
              onInput={(event) => setCompanyName(event.currentTarget.value)}
            />
            <s-text-field
              error={fieldErrors.orgNumber}
              label={shopify.i18n.translate("companyOnboardingOrgNumberLabel")}
              value={orgNumber}
              onInput={(event) => setOrgNumber(event.currentTarget.value)}
            />
            <s-text-field
              error={fieldErrors.locationName}
              label={shopify.i18n.translate("companyOnboardingLocationNameLabel")}
              value={locationName}
              onInput={(event) => setLocationName(event.currentTarget.value)}
            />

            <s-checkbox
              checked={invoiceElectronic}
              label={shopify.i18n.translate("companyOnboardingEhfLabel")}
              onChange={(event) => setInvoiceElectronic(event.currentTarget.checked)}
            />
            <s-email-field
              error={fieldErrors.invoiceEmail}
              label={shopify.i18n.translate("companyOnboardingInvoiceEmailLabel")}
              value={invoiceEmail}
              onInput={(event) => setInvoiceEmail(event.currentTarget.value)}
            />

            <s-text>{shopify.i18n.translate("companyOnboardingInvoiceAddressTitle")}</s-text>
            <s-text-field
              error={fieldErrors.invoiceLine1}
              label={shopify.i18n.translate("companyOnboardingAddressLine1Label")}
              value={invoiceLine1}
              onInput={(event) => setInvoiceLine1(event.currentTarget.value)}
            />
            <s-text-field
              label={shopify.i18n.translate("companyOnboardingAddressLine2Label")}
              value={invoiceLine2}
              onInput={(event) => setInvoiceLine2(event.currentTarget.value)}
            />
            <s-grid gridTemplateColumns="1fr 1fr">
              <s-text-field
                error={fieldErrors.invoicePostalCode}
                label={shopify.i18n.translate("companyOnboardingPostalCodeLabel")}
                value={invoicePostalCode}
                onInput={(event) => setInvoicePostalCode(event.currentTarget.value)}
              />
              <s-text-field
                error={fieldErrors.invoiceCity}
                label={shopify.i18n.translate("companyOnboardingCityLabel")}
                value={invoiceCity}
                onInput={(event) => setInvoiceCity(event.currentTarget.value)}
              />
            </s-grid>

            <s-checkbox
              checked={sameAsInvoice}
              label={shopify.i18n.translate("companyOnboardingDeliverySameAsInvoice")}
              onChange={(event) => setSameAsInvoice(event.currentTarget.checked)}
            />

            {!sameAsInvoice ? (
              <s-stack direction="block" gap="base">
                <s-text>{shopify.i18n.translate("companyOnboardingDeliveryAddressTitle")}</s-text>
                <s-text-field
                  error={fieldErrors.deliveryLine1}
                  label={shopify.i18n.translate("companyOnboardingAddressLine1Label")}
                  value={deliveryLine1}
                  onInput={(event) => setDeliveryLine1(event.currentTarget.value)}
                />
                <s-text-field
                  label={shopify.i18n.translate("companyOnboardingAddressLine2Label")}
                  value={deliveryLine2}
                  onInput={(event) => setDeliveryLine2(event.currentTarget.value)}
                />
                <s-grid gridTemplateColumns="1fr 1fr">
                  <s-text-field
                    error={fieldErrors.deliveryPostalCode}
                    label={shopify.i18n.translate("companyOnboardingPostalCodeLabel")}
                    value={deliveryPostalCode}
                    onInput={(event) => setDeliveryPostalCode(event.currentTarget.value)}
                  />
                  <s-text-field
                    error={fieldErrors.deliveryCity}
                    label={shopify.i18n.translate("companyOnboardingCityLabel")}
                    value={deliveryCity}
                    onInput={(event) => setDeliveryCity(event.currentTarget.value)}
                  />
                </s-grid>
              </s-stack>
            ) : null}

            <s-button inlineSize="fit-content" variant="secondary" disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting
                ? shopify.i18n.translate("companyOnboardingSubmitting")
                : shopify.i18n.translate("companyOnboardingSubmit")}
            </s-button>
            <s-button inlineSize="fit-content" variant="secondary" command="--hide" commandFor="company-onboarding-modal">
              {shopify.i18n.translate("close")}
            </s-button>
          </s-stack>
        </s-box>
      </s-modal>
    </s-section>
  );
}
