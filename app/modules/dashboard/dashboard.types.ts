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

export type DriftMismatch = {
  key: "company_name" | "org_number" | "company_address";
  sourceValue: unknown;
  mirroredValue: unknown;
};

export type DriftReport = {
  companyId: string;
  inSync: boolean;
  mismatches: DriftMismatch[];
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
  id: string;
  placedOn: string;
  placedBy: string;
  paymentStatus: "Betalt" | "Delvis betalt" | "Venter";
  fulfillmentStatus: "Oppfylt" | "Delvis oppfylt" | "Ikke oppfylt";
  total: string;
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
