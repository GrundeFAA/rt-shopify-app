import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/CompanyDetailsBlock.jsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.company-details.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/CompanyLocationAddressesBlock.jsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.company-location-addresses.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/CompanyLocationPaymentBlock.jsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.company-location-payment.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/CompanyLocationStaffBlock.jsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.company-location-staff.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}
