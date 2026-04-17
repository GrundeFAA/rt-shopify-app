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

//@ts-ignore
declare module './src/utils/company-dashboard.js' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.company-details.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/services/company-settings.service.js' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.company-details.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/services/company-location-actions.service.js' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.company-details.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/customer-account-api/client.js' {
  const shopify:
    | import('@shopify/ui-extensions/customer-account.profile.company-details.render-after').Api
    | import('@shopify/ui-extensions/customer-account.profile.company-location-staff.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/customer-account-api/app-backend-client.js' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.company-details.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/services/company-location-members.service.js' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.company-location-staff.render-after').Api;
  const globalThis: { shopify: typeof shopify };
}
