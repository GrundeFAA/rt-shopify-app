import { useEffect, useState, type FormEvent } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import type {
  ApiErrorContract,
  DashboardErrorState,
} from "../modules/dashboard/error-state";
import {
  toDashboardFrontendState,
  toDiagnosticEntries,
} from "../modules/dashboard/error-state";
import styles from "../modules/dashboard/dashboard-view.module.css";

type SessionData = {
  customerId: string;
  companyId: string;
  role: string;
  status: string;
  iat: number;
  exp: number;
  jti: string;
};

type CompanyAddress = {
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: string;
};

type CompanyProfile = {
  company_name: string;
  org_number: string;
  company_address: CompanyAddress;
};

type DriftMismatch = {
  key: "company_name" | "org_number" | "company_address";
  sourceValue: unknown;
  mirroredValue: unknown;
};

type DriftReport = {
  companyId: string;
  inSync: boolean;
  mismatches: DriftMismatch[];
};

type LoaderData =
  | {
      state: "ready";
      session: SessionData;
      profile: CompanyProfile;
      bootstrapToken: string | null;
    }
  | {
      state: DashboardErrorState;
      error: ApiErrorContract;
    };

const BOOTSTRAP_TOKEN_STORAGE_KEY = "rt_dashboard_bootstrap_token";

function makeRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStateTitle(state: DashboardErrorState): string {
  if (state === "unauthorized") {
    return "Authentication required";
  }

  if (state === "forbidden") {
    return "Access restricted";
  }

  if (state === "sync_in_progress") {
    return "Sync in progress";
  }

  return "Temporarily unavailable";
}

function getStateDescription(state: DashboardErrorState): string {
  if (state === "unauthorized") {
    return "Your dashboard session is missing or expired. Re-open the dashboard from the storefront entry point.";
  }

  if (state === "forbidden") {
    return "Your account does not currently have access to dashboard content.";
  }

  if (state === "sync_in_progress") {
    return "Your data is still being prepared. Refresh shortly to continue.";
  }

  return "A temporary dependency issue is preventing dashboard startup.";
}

async function readErrorContract(response: Response): Promise<ApiErrorContract> {
  const requestIdFromHeader = response.headers.get("x-request-id") ?? makeRequestId();
  const fallback: ApiErrorContract = {
    code: "INTERNAL_ERROR",
    message: "Unable to load dashboard session.",
    requestId: requestIdFromHeader,
    retryable: true,
  };

  try {
    const raw = await response.json();
    if (
      typeof raw?.code === "string" &&
      typeof raw?.message === "string" &&
      typeof raw?.requestId === "string" &&
      typeof raw?.retryable === "boolean"
    ) {
      return {
        code: raw.code,
        message: raw.message,
        requestId: raw.requestId,
        retryable: raw.retryable,
        details:
          raw.details && typeof raw.details === "object"
            ? (raw.details as Record<string, unknown>)
            : undefined,
      };
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function createBootstrapHeaders(
  request: Request,
  iframeSessionToken: string | null,
): Headers {
  const headers = new Headers({
    cookie: request.headers.get("cookie") ?? "",
    "x-request-id": request.headers.get("x-request-id") ?? makeRequestId(),
  });

  if (iframeSessionToken) {
    headers.set("authorization", `Bearer ${iframeSessionToken}`);
  }

  return headers;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  try {
    const iframeSessionToken = new URL(request.url).searchParams.get("st");
    const headers = createBootstrapHeaders(request, iframeSessionToken);
    const sessionUrl = new URL("/api/auth/session", request.url);
    const response = await fetch(sessionUrl, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      const session = await parseJsonResponse<SessionData>(response);
      const profileResponse = await fetch(new URL("/api/company/profile", request.url), {
        method: "GET",
        headers,
      });

      if (!profileResponse.ok) {
        const error = await readErrorContract(profileResponse);
        return {
          state: toDashboardFrontendState(error),
          error,
        };
      }

      const profile = await parseJsonResponse<CompanyProfile>(profileResponse);
      return {
        state: "ready",
        session,
        profile,
        bootstrapToken: iframeSessionToken,
      };
    }

    const error = await readErrorContract(response);
    return {
      state: toDashboardFrontendState(error),
      error,
    };
  } catch {
    const fallbackError: ApiErrorContract = {
      code: "INFRA_UNAVAILABLE",
      message: "The dashboard could not be loaded right now.",
      requestId: request.headers.get("x-request-id") ?? makeRequestId(),
      retryable: true,
    };

    return {
      state: "temporarily_unavailable",
      error: fallbackError,
    };
  }
};

export default function DashboardRoute() {
  const data = useLoaderData<typeof loader>();
  const [runtimeError, setRuntimeError] = useState<{
    state: DashboardErrorState;
    error: ApiErrorContract;
  } | null>(null);
  const [address, setAddress] = useState<CompanyAddress>(
    data.state === "ready" ? data.profile.company_address : {
      line1: "",
      postalCode: "",
      city: "",
      country: "",
    },
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [syncReport, setSyncReport] = useState<DriftReport | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(
    data.state === "ready" ? data.bootstrapToken : null,
  );

  useEffect(() => {
    if (data.state !== "ready") {
      return;
    }

    if (data.bootstrapToken) {
      sessionStorage.setItem(BOOTSTRAP_TOKEN_STORAGE_KEY, data.bootstrapToken);
      setAuthToken(data.bootstrapToken);
      return;
    }

    const cachedToken = sessionStorage.getItem(BOOTSTRAP_TOKEN_STORAGE_KEY);
    if (cachedToken) {
      setAuthToken(cachedToken);
    }
  }, [data]);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has("st")) {
      return;
    }

    currentUrl.searchParams.delete("st");
    window.history.replaceState({}, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
  }, []);

  const renderErrorState = (state: DashboardErrorState, error: ApiErrorContract) => {
    const shouldShowRetry = error.retryable;
    const diagnostics = toDiagnosticEntries(error.details);

    return (
      <main className={styles.page}>
        <section className={styles.panel} data-state={state}>
          <h1 className={styles.title}>{getStateTitle(state)}</h1>
          <p className={styles.message}>{getStateDescription(state)}</p>
          <p className={styles.reason}>{error.message}</p>
          <dl className={styles.metadata}>
            <div>
              <dt>Code</dt>
              <dd>{error.code}</dd>
            </div>
            <div>
              <dt>Request ID</dt>
              <dd>{error.requestId}</dd>
            </div>
            <div>
              <dt>Message</dt>
              <dd>{error.message}</dd>
            </div>
          </dl>
          {diagnostics.length > 0 ? (
            <section className={styles.diagnosticsSection} aria-label="Error diagnostics">
              <h2 className={styles.diagnosticsTitle}>Diagnostics</h2>
              <dl className={styles.diagnosticsList}>
                {diagnostics.map((entry) => (
                  <div key={entry.key}>
                    <dt>{entry.key}</dt>
                    <dd>{entry.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {shouldShowRetry ? (
            <button className={styles.retryButton} type="button" onClick={() => window.location.reload()}>
              Retry
            </button>
          ) : null}
        </section>
      </main>
    );
  };

  if (data.state !== "ready") {
    return renderErrorState(data.state, data.error);
  }

  if (runtimeError) {
    return renderErrorState(runtimeError.state, runtimeError.error);
  }

  const createApiHeaders = () => {
    const headers = new Headers({
      "content-type": "application/json",
      "x-request-id": makeRequestId(),
    });

    if (authToken) {
      headers.set("authorization", `Bearer ${authToken}`);
    }
    return headers;
  };

  const loadSyncReport = async (): Promise<void> => {
    const driftResponse = await fetch("/api/sync/company-profile-drift", {
      method: "GET",
      headers: createApiHeaders(),
    });

    if (!driftResponse.ok) {
      const error = await readErrorContract(driftResponse);
      const state = toDashboardFrontendState(error);
      setRuntimeError({ state, error });
      return;
    }

    const report = await parseJsonResponse<DriftReport>(driftResponse);
    setSyncReport(report);
    setSyncMessage(
      report.inSync
        ? "Profile mirror is in sync."
        : `Profile mirror has ${report.mismatches.length} mismatch(es).`,
    );
  };

  const onAddressSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveState("saving");
    setSaveMessage(null);
    setSyncMessage(null);
    setRuntimeError(null);

    const response = await fetch("/api/company/profile", {
      method: "PATCH",
      headers: createApiHeaders(),
      body: JSON.stringify({
        company_address: address,
      }),
    });

    if (!response.ok) {
      const error = await readErrorContract(response);
      const state = toDashboardFrontendState(error);
      setRuntimeError({ state, error });
      return;
    }

    const updatedProfile = await parseJsonResponse<CompanyProfile>(response);
    setAddress(updatedProfile.company_address);
    setSaveState("success");
    setSaveMessage("Company address saved.");
    await loadSyncReport();
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <h1 className={styles.title}>RT Dashboard</h1>
        <p className={styles.message}>Company profile address update</p>
        <p className={styles.meta}>Company: {data.profile.company_name}</p>
        <p className={styles.meta}>Organization number: {data.profile.org_number}</p>
        <p className={styles.meta}>Role: {data.session.role}</p>

        <form className={styles.form} onSubmit={onAddressSubmit}>
          <label className={styles.field}>
            <span>Address line 1</span>
            <input
              value={address.line1}
              onChange={(event) => setAddress((prev) => ({ ...prev, line1: event.target.value }))}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Address line 2</span>
            <input
              value={address.line2 ?? ""}
              onChange={(event) =>
                setAddress((prev) => ({
                  ...prev,
                  line2: event.target.value || undefined,
                }))
              }
            />
          </label>

          <label className={styles.field}>
            <span>Postal code</span>
            <input
              value={address.postalCode}
              onChange={(event) => setAddress((prev) => ({ ...prev, postalCode: event.target.value }))}
              required
            />
          </label>

          <label className={styles.field}>
            <span>City</span>
            <input
              value={address.city}
              onChange={(event) => setAddress((prev) => ({ ...prev, city: event.target.value }))}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Country (2-letter code)</span>
            <input
              value={address.country}
              maxLength={2}
              onChange={(event) =>
                setAddress((prev) => ({ ...prev, country: event.target.value.toUpperCase() }))
              }
              required
            />
          </label>

          <button className={styles.retryButton} type="submit" disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving..." : "Save address"}
          </button>
        </form>

        {saveMessage ? <p className={styles.success}>{saveMessage}</p> : null}
        {syncMessage ? <p className={styles.syncStatus}>{syncMessage}</p> : null}
        {syncReport && !syncReport.inSync ? (
          <div className={styles.mismatchBox}>
            <p className={styles.reason}>Mismatch summary</p>
            <ul className={styles.mismatchList}>
              {syncReport.mismatches.map((mismatch, index) => (
                <li key={`${mismatch.key}-${index}`}>
                  <strong>{mismatch.key}</strong>
                  <div>Source: {JSON.stringify(mismatch.sourceValue)}</div>
                  <div>Mirrored: {JSON.stringify(mismatch.mirroredValue)}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
