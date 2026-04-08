import {
  BuildingOfficeIcon,
  CreditCardIcon,
  MapPinIcon,
  UsersIcon,
} from "@heroicons/react/20/solid";
import type {
  DashboardDeliveryAddressRow,
  DashboardOrderRow,
  DashboardSectionConfigItem,
  DashboardUserRow,
} from "./dashboard.types";

export const BOOTSTRAP_TOKEN_STORAGE_KEY = "rt_dashboard_bootstrap_token";

export const DASHBOARD_SECTION_CONFIG: DashboardSectionConfigItem[] = [
  { key: "company_info", name: "Firmainfo", href: "#", icon: BuildingOfficeIcon },
  { key: "company_orders", name: "Ordrer", href: "#", icon: CreditCardIcon },
  {
    key: "shared_delivery_addresses",
    name: "Leveringsadresser",
    href: "#",
    icon: MapPinIcon,
  },
  { key: "users_invites", name: "Brukere", href: "#", icon: UsersIcon },
];

export const SKELETON_ORDER_ROWS: DashboardOrderRow[] = [
  {
    id: "ORD-1045",
    placedOn: "2026-03-24",
    placedBy: "Aleksander N.",
    paymentStatus: "Betalt",
    fulfillmentStatus: "Delvis oppfylt",
    total: "NOK 12,450",
  },
  {
    id: "ORD-1044",
    placedOn: "2026-03-18",
    placedBy: "Mona K.",
    paymentStatus: "Delvis betalt",
    fulfillmentStatus: "Ikke oppfylt",
    total: "NOK 7,990",
  },
  {
    id: "ORD-1043",
    placedOn: "2026-03-11",
    placedBy: "Jonas T.",
    paymentStatus: "Venter",
    fulfillmentStatus: "Oppfylt",
    total: "NOK 3,120",
  },
];

export const SKELETON_USER_ROWS: DashboardUserRow[] = [
  {
    id: "USR-1",
    name: "Nåværende firmabruker",
    email: "membership-linked",
    role: "administrator",
    status: "Aktiv",
  },
  {
    id: "USR-2",
    name: "Bruker med ventende invitasjon",
    email: "invite@example.com",
    role: "bruker",
    status: "Invitasjon sendt",
  },
];

export const SKELETON_DELIVERY_ADDRESS_ROWS: DashboardDeliveryAddressRow[] = [
  {
    id: "ADDR-001",
    label: "Lager øst",
    line1: "Industriveien 14",
    postalCode: "1461",
    city: "LORNSKOG",
    addedBy: "Aleksander N.",
  },
  {
    id: "ADDR-002",
    label: "Prosjektområde sør",
    line1: "Rudssletta 32",
    postalCode: "1351",
    city: "RUD",
    addedBy: "Mona K.",
  },
];
