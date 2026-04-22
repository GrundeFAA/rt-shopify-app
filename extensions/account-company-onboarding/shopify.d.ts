import '@shopify/ui-extensions';

//@ts-ignore
declare module './src/CompanyOnboardingBlock.jsx' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/services/company-onboarding.service.js' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}

//@ts-ignore
declare module './src/customer-account-api/app-backend-client.js' {
  const shopify: import('@shopify/ui-extensions/customer-account.profile.block.render').Api;
  const globalThis: { shopify: typeof shopify };
}
