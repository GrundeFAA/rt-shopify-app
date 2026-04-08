import type { ApiErrorContract, DashboardErrorState } from "./error-state";

export type DashboardErrorCopy = {
  title: string;
  description: string;
  action: string;
  showRequestId: boolean;
};

const ERROR_COPY_BY_CODE: Record<string, DashboardErrorCopy> = {
  AUTH_INVALID_IFRAME_SESSION: {
    title: "Økten er utløpt",
    description: "Dashbordøkten din er ikke lenger aktiv.",
    action: "Åpne dashboardet på nytt fra kontosiden i nettbutikken.",
    showRequestId: true,
  },
  AUTH_EXPIRED_IFRAME_SESSION: {
    title: "Økten er utløpt",
    description: "Dashbordøkten din har gått ut på tid.",
    action: "Åpne dashboardet på nytt fra kontosiden i nettbutikken.",
    showRequestId: true,
  },
  AUTH_INVALID_PROXY_SIGNATURE: {
    title: "Sikker tilgang kreves",
    description: "Denne siden kan bare åpnes via sikker inngang til dashboardet.",
    action: "Gå tilbake til kontosiden og åpne dashboardet på nytt.",
    showRequestId: true,
  },
  AUTH_EXPIRED_PROXY_REQUEST: {
    title: "Siden er utløpt",
    description: "Denne dashboardlenken har utløpt.",
    action: "Gå tilbake til kontosiden og åpne dashboardet på nytt.",
    showRequestId: true,
  },
  AUTH_MISSING_CUSTOMER_CONTEXT: {
    title: "Innlogging kreves",
    description: "Vi kunne ikke bekrefte kundesesjonen din.",
    action: "Logg inn på kontoen din og åpne dashboardet på nytt.",
    showRequestId: true,
  },
  AUTH_FORBIDDEN_ROLE: {
    title: "Tilgang begrenset",
    description: "Kontoen din har ikke tilgang til dette området i dashboardet.",
    action: "Kontakt en administrator i firmaet for tilgang.",
    showRequestId: true,
  },
  AUTH_NO_MEMBERSHIP: {
    title: "Tilgang begrenset",
    description: "Kontoen din er ikke koblet til en firmaprofil i dashboardet ennå.",
    action: "Kontakt en administrator i firmaet for å fullføre oppsett av tilgang.",
    showRequestId: true,
  },
  AUTH_INACTIVE_MEMBERSHIP: {
    title: "Venter på aktivering",
    description: "Firmakontoen din er koblet til, men tilgangen din venter fortsatt på godkjenning.",
    action: "Kontakt en administrator i firmaet for å aktivere kontoen din.",
    showRequestId: false,
  },
  SYNC_IN_PROGRESS: {
    title: "Synkronisering pågår",
    description: "Firmadata synkroniseres fortsatt.",
    action: "Vent litt og prøv igjen.",
    showRequestId: false,
  },
  SYNC_PROCESSING_FAILED: {
    title: "Synkronisering pågår",
    description: "Firmadata synkroniseres fortsatt.",
    action: "Vent litt og prøv igjen.",
    showRequestId: false,
  },
  SHOPIFY_RATE_LIMITED: {
    title: "Midlertidig utilgjengelig",
    description: "Vi håndterer midlertidig høy trafikk.",
    action: "Prøv igjen om litt.",
    showRequestId: true,
  },
  SHOPIFY_TEMPORARY_FAILURE: {
    title: "Midlertidig utilgjengelig",
    description: "Et midlertidig tjenesteproblem hindret dashboardet i å laste.",
    action: "Prøv igjen om litt.",
    showRequestId: true,
  },
  INFRA_TIMEOUT: {
    title: "Forespørselen tok for lang tid",
    description: "Forespørselen til dashboardet brukte for lang tid.",
    action: "Prøv igjen om et øyeblikk.",
    showRequestId: true,
  },
  INFRA_UNAVAILABLE: {
    title: "Midlertidig utilgjengelig",
    description: "Dashbordtjenesten er midlertidig utilgjengelig.",
    action: "Prøv igjen om litt.",
    showRequestId: true,
  },
  SYNC_WRITE_ABORTED: {
    title: "Oppdateringen ble ikke fullført",
    description: "Vi kunne ikke fullføre oppdateringen på grunn av et midlertidig synkroniseringsproblem.",
    action: "Prøv igjen om et øyeblikk.",
    showRequestId: true,
  },
  SYNC_RECONCILIATION_MISMATCH: {
    title: "Oppdateringen ble ikke fullført",
    description: "Vi kunne ikke bekrefte oppdateringen på tvers av tilkoblede systemer.",
    action: "Prøv igjen senere, eller kontakt support hvis problemet fortsetter.",
    showRequestId: true,
  },
  VALIDATION_FAILED: {
    title: "Kontroller informasjonen",
    description: "Noen opplysninger mangler eller er ugyldige.",
    action: "Se gjennom feltene og prøv igjen.",
    showRequestId: false,
  },
  STATE_CONFLICT: {
    title: "Allerede oppdatert et annet sted",
    description: "Disse dataene ble endret før forespørselen din ble fullført.",
    action: "Oppdater siden og prøv igjen.",
    showRequestId: false,
  },
  INTERNAL_ERROR: {
    title: "Noe gikk galt",
    description: "Et uventet problem hindret forespørselen i å fullføres.",
    action: "Prøv igjen. Kontakt support hvis problemet fortsetter.",
    showRequestId: true,
  },
};

function getErrorCopyFromState(state: DashboardErrorState): DashboardErrorCopy {
  if (state === "unauthorized") {
    return {
      title: "Autentisering kreves",
      description: "Dashbordøkten din mangler eller er utløpt.",
      action: "Åpne dashboardet på nytt fra kontosiden i nettbutikken.",
      showRequestId: true,
    };
  }

  if (state === "forbidden") {
    return {
      title: "Tilgang begrenset",
      description: "Kontoen din har ikke tilgang til dette området i dashboardet.",
      action: "Kontakt en administrator i firmaet for tilgang.",
      showRequestId: true,
    };
  }

  if (state === "sync_in_progress") {
    return {
      title: "Synkronisering pågår",
      description: "Firmadata synkroniseres fortsatt.",
      action: "Vent litt og prøv igjen.",
      showRequestId: false,
    };
  }

  return {
    title: "Midlertidig utilgjengelig",
    description: "Et midlertidig problem hindret dashboardet i å laste.",
    action: "Prøv igjen om litt.",
    showRequestId: true,
  };
}

export function getDashboardErrorCopy(
  error: ApiErrorContract,
  state: DashboardErrorState,
): DashboardErrorCopy {
  return ERROR_COPY_BY_CODE[error.code] ?? getErrorCopyFromState(state);
}

export function shouldRenderRuntimeErrorAsFullPage(error: ApiErrorContract): boolean {
  return [
    "AUTH_INVALID_IFRAME_SESSION",
    "AUTH_EXPIRED_IFRAME_SESSION",
    "AUTH_INVALID_PROXY_SIGNATURE",
    "AUTH_EXPIRED_PROXY_REQUEST",
    "AUTH_MISSING_CUSTOMER_CONTEXT",
  ].includes(error.code);
}
