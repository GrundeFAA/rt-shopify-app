import type { ComponentType, SVGProps } from "react";

export type SessionData = {
  customerId: string;
  companyId: string;
  shop: string;
  role: string;
  status: string;
  iat: number;
  exp: number;
  jti: string;
};

export type CompanyAddress = {
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: string;
};

export type CompanyProfile = {
  company_name: string;
  org_number: string;
  company_address: CompanyAddress;
};

export type DashboardSectionKey =
  | "company_info"
  | "company_orders"
  | "shared_delivery_addresses"
  | "users_invites";

export type DashboardSectionConfigItem = {
  key: DashboardSectionKey;
  name: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type DashboardOrderRow = {
  sourceOrderId?: string;
  id: string;
  placedOn: string;
  placedBy: string;
  paymentStatus: "Betalt" | "Delvis betalt" | "Venter";
  fulfillmentStatus: "Oppfylt" | "Delvis oppfylt" | "Ikke oppfylt";
  total: string;
};

export type CompanyOrdersListItem = {
  orderId: string;
  orderNumber: string;
  placedAt: string;
  placedByCustomerId: string;
  placedByDisplayName: string | null;
  paymentStatus:
    | "PAID"
    | "PARTIALLY_PAID"
    | "PENDING"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED"
    | "VOIDED"
    | "UNKNOWN";
  fulfillmentStatus:
    | "FULFILLED"
    | "PARTIALLY_FULFILLED"
    | "UNFULFILLED"
    | "SCHEDULED"
    | "ON_HOLD"
    | "REQUEST_DECLINED"
    | "OPEN"
    | "IN_PROGRESS"
    | "UNKNOWN";
  totalAmount: string;
  currencyCode: string;
};

export type CompanyOrdersListResponse = {
  orders: CompanyOrdersListItem[];
  pageInfo: {
    hasNextPage: boolean;
    nextCursor: string | null;
  };
};

export type CompanyOrderDetailAddress = {
  name: string | null;
  company: string | null;
  line1: string | null;
  line2: string | null;
  postalCode: string | null;
  city: string | null;
  countryCode: string | null;
  phone: string | null;
};

export type CompanyOrderDetailLineItem = {
  title: string;
  sku: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type CompanyOrderDetailTotals = {
  subtotal: string;
  shipping: string;
  tax: string;
  discounts: string;
  total: string;
  currencyCode: string;
};

export type CompanyOrderDetail = CompanyOrdersListItem & {
  lineItems: CompanyOrderDetailLineItem[];
  totals: CompanyOrderDetailTotals;
  shippingAddress: CompanyOrderDetailAddress | null;
  billingAddress: CompanyOrderDetailAddress | null;
};

export type CompanyOrderDetailResponse = {
  order: CompanyOrderDetail;
};

export type CompanySharedAddress = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  source: "dashboard" | "checkout_import";
  createdByMemberId: string;
  createdAt: string;
  updatedAt: string;
};

export type CompanyAddressesResponse = {
  addresses: CompanySharedAddress[];
  myDefaultAddressId: string | null;
};

export type CreateCompanyAddressResponse = {
  address: CompanySharedAddress;
  myDefaultAddressId: string | null;
  syncIntentId: string;
};

export type UpdateCompanyAddressResponse = {
  address: CompanySharedAddress;
  syncIntentId: string;
};

export type DeleteCompanyAddressResponse = {
  deletedAddressId: string;
  syncIntentId: string;
};

export type SetDefaultCompanyAddressResponse = {
  myDefaultAddressId: string;
};

export type UnsetDefaultCompanyAddressResponse = {
  myDefaultAddressId: null;
};

export type DashboardUserRow = {
  id: string;
  name: string;
  email: string;
  role: "bruker" | "administrator";
  status: "Aktiv" | "Inaktiv" | "Invitasjon sendt";
};

export type DashboardDeliveryAddressRow = {
  id: string;
  label: string;
  line1: string;
  postalCode: string;
  city: string;
  addedBy: string;
};
