import { useEffect, useState, type FormEvent } from "react";
import type { LinksFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import {
  DashboardAlert,
  DashboardCard,
  DashboardTabs,
  type DashboardTabItem,
} from "../modules/dashboard/components";
import {
  createBootstrapHeaders,
  fetchCompanyAddresses,
  fetchCompanyMembers,
  fetchCompanyOrders,
  makeRequestId,
  parseJsonResponse,
  patchCompanyAddress,
  readErrorContract,
} from "../modules/dashboard/dashboard-api";
import {
  BOOTSTRAP_TOKEN_STORAGE_KEY,
  DASHBOARD_SECTION_CONFIG,
} from "../modules/dashboard/dashboard.constants";
import dashboardTailwindHref from "../modules/dashboard/dashboard-tailwind.css?url";
import type {
  CompanyAddress,
  CompanyAddressesResponse,
  CompanyMembersResponse,
  CompanyOrdersListResponse,
  CompanyProfile,
  DashboardSectionKey,
  SessionData,
} from "../modules/dashboard/dashboard.types";
import { getDashboardErrorCopy, shouldRenderRuntimeErrorAsFullPage } from "../modules/dashboard/error-copy";
import type { ApiErrorContract, DashboardErrorState } from "../modules/dashboard/error-state";
import { toDashboardFrontendState } from "../modules/dashboard/error-state";
import { CompanyInfoSection } from "../modules/dashboard/sections/company-info-section";
import { CompanyOrdersSection } from "../modules/dashboard/sections/company-orders-section";
import { SharedDeliveryAddressesSection } from "../modules/dashboard/sections/shared-delivery-addresses-section";
import { UsersInvitesSection } from "../modules/dashboard/sections/users-invites-section";

type LoaderData =
  | {
      state: "ready";
      session: SessionData;
      profile: CompanyProfile;
      orders: CompanyOrdersListResponse;
      addresses: CompanyAddressesResponse;
      members: CompanyMembersResponse;
      bootstrapToken: string | null;
    }
  | {
      state: DashboardErrorState;
      error: ApiErrorContract;
    };

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;500;600;700&display=swap",
  },
  { rel: "stylesheet", href: dashboardTailwindHref },
];

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  try {
    const iframeSessionToken = new URL(request.url).searchParams.get("st");
    const headers = createBootstrapHeaders(request, iframeSessionToken);
    const sessionUrl = new URL("/api/auth/session", request.url);
    if (iframeSessionToken) {
      sessionUrl.searchParams.set("st", iframeSessionToken);
    }
    const response = await fetch(sessionUrl, {
      method: "GET",
      headers,
    });

    if (response.ok) {
      const session = await parseJsonResponse<SessionData>(response);
      const profileUrl = new URL("/api/company/profile", request.url);
      if (iframeSessionToken) {
        profileUrl.searchParams.set("st", iframeSessionToken);
      }
      const profileResponse = await fetch(profileUrl, {
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
      const ordersResponse = await fetchCompanyOrders(request, iframeSessionToken);
      if (!ordersResponse.ok) {
        const error = await readErrorContract(ordersResponse);
        return {
          state: toDashboardFrontendState(error),
          error,
        };
      }
      const orders = await parseJsonResponse<CompanyOrdersListResponse>(ordersResponse);
      const addressesResponse = await fetchCompanyAddresses(request, iframeSessionToken);
      if (!addressesResponse.ok) {
        const error = await readErrorContract(addressesResponse);
        return {
          state: toDashboardFrontendState(error),
          error,
        };
      }
      const addresses = await parseJsonResponse<CompanyAddressesResponse>(addressesResponse);
      let members: CompanyMembersResponse = { members: [] };
      if (session.role === "administrator") {
        const membersResponse = await fetchCompanyMembers(request, iframeSessionToken);
        if (!membersResponse.ok) {
          const error = await readErrorContract(membersResponse);
          return {
            state: toDashboardFrontendState(error),
            error,
          };
        }
        members = await parseJsonResponse<CompanyMembersResponse>(membersResponse);
      }
      return {
        state: "ready",
        session,
        profile,
        orders,
        addresses,
        members,
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
      message: "Dashboardet kunne ikke lastes akkurat nå.",
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
    data.state === "ready"
      ? data.profile.company_address
      : {
          line1: "",
          postalCode: "",
          city: "",
          country: "",
        },
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(
    data.state === "ready" ? data.bootstrapToken : null,
  );
  const [activeSection, setActiveSection] = useState<DashboardSectionKey>("company_info");

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
    const copy = getDashboardErrorCopy(error, state);

    return (
      <main className="min-h-screen bg-[var(--bk-color-bg-subtle)] px-4 py-8 sm:px-6">
        <section
          data-state={state}
          className="mx-auto w-full max-w-3xl rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-default)] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.10)] sm:p-8"
        >
          <p className="mb-3 inline-flex items-center rounded-[40px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-muted)] px-3 py-1 text-sm font-medium text-[var(--bk-color-text-muted)]">
            Dashboardstatus
          </p>
          <h1 className="mb-2 text-[28px] font-semibold leading-tight text-[var(--bk-color-text-strong)]">
            {copy.title}
          </h1>
          <p className="mb-2 text-base text-[var(--bk-color-text-primary)]">{copy.description}</p>
          <p className="mb-4 text-sm text-[var(--bk-color-text-muted)]">{copy.action}</p>
          {copy.showRequestId ? (
            <dl className="mb-4 rounded-[4px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-subtle)] px-3 py-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--bk-color-text-subtle)]">
                  Referanse for support
                </dt>
                <dd className="mt-1 font-mono text-sm text-[var(--bk-color-text-primary)]">
                  {error.requestId}
                </dd>
              </div>
            </dl>
          ) : null}
          {shouldShowRetry ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-[4px] bg-[var(--bk-color-accent-primary)] px-7 text-base font-semibold text-white transition-colors duration-200 hover:bg-[var(--bk-color-accent-primary-hover)]"
              type="button"
              onClick={() => window.location.reload()}
            >
              Prøv igjen
            </button>
          ) : null}
        </section>
      </main>
    );
  };

  if (data.state !== "ready") {
    return renderErrorState(data.state, data.error);
  }

  if (runtimeError && shouldRenderRuntimeErrorAsFullPage(runtimeError.error)) {
    return renderErrorState(runtimeError.state, runtimeError.error);
  }

  const onAddressSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveState("saving");
    setSaveMessage(null);
    setRuntimeError(null);

    const response = await patchCompanyAddress(address, authToken);

    if (!response.ok) {
      const error = await readErrorContract(response);
      const state = toDashboardFrontendState(error);
      setRuntimeError({ state, error });
      return;
    }

    const updatedProfile = await parseJsonResponse<CompanyProfile>(response);
    setAddress(updatedProfile.company_address);
    setSaveState("success");
    setSaveMessage("Firmaadresse lagret.");
  };

  const tabs: DashboardTabItem<DashboardSectionKey>[] = DASHBOARD_SECTION_CONFIG.map((section) => ({
    key: section.key,
    name: section.name,
    href: section.href,
    icon: section.icon,
    current: section.key === activeSection,
  }));

  const renderActiveSection = () => {
    if (activeSection === "company_info") {
      return (
        <CompanyInfoSection
          address={address}
          setAddress={setAddress}
          saveState={saveState}
          saveMessage={saveMessage}
          onAddressSubmit={onAddressSubmit}
        />
      );
    }

    if (activeSection === "company_orders") {
      return (
        <CompanyOrdersSection
          orders={data.orders.orders}
          authToken={authToken}
          onRuntimeError={(payload) => setRuntimeError(payload)}
        />
      );
    }

    if (activeSection === "users_invites") {
      return (
        <UsersInvitesSection
          isAdministrator={data.session.role === "administrator"}
          initialMembers={data.members}
          authToken={authToken}
          onRuntimeError={(payload) => setRuntimeError(payload)}
        />
      );
    }

    return (
      <SharedDeliveryAddressesSection
        initialData={data.addresses}
        authToken={authToken}
        canMutate={data.session.status === "active"}
        onRuntimeError={(payload) => setRuntimeError(payload)}
      />
    );
  };

  return (
    <main className="min-h-screen bg-[var(--bk-color-bg-subtle)] px-4 py-8 text-[var(--bk-color-text-primary)] sm:px-6 lg:px-10">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <DashboardCard>
          <h1 className="mt-2 text-[32px] font-semibold leading-tight text-[var(--bk-color-text-strong)]">
            {data.profile.company_name}
          </h1>
          <p className="mt-1 text-sm font-medium text-[var(--bk-color-text-muted)]">
            org.nr.: {data.profile.org_number}
          </p>
        </DashboardCard>

        {runtimeError ? (
          <DashboardAlert
            variant="error"
            title={getDashboardErrorCopy(runtimeError.error, runtimeError.state).title}
          >
            <p>{getDashboardErrorCopy(runtimeError.error, runtimeError.state).description}</p>
            <p className="mt-1">{getDashboardErrorCopy(runtimeError.error, runtimeError.state).action}</p>
            {getDashboardErrorCopy(runtimeError.error, runtimeError.state).showRequestId ? (
              <p className="mt-2 font-mono text-xs text-[var(--bk-color-text-subtle)]">
                Referanse for support: {runtimeError.error.requestId}
              </p>
            ) : null}
          </DashboardAlert>
        ) : null}

        <section className="overflow-hidden rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-default)] shadow-[0_4px_12px_rgba(0,0,0,0.10)]">
          <div className="border-b border-[var(--bk-color-border-default)] px-2 sm:px-4">
            <DashboardTabs
              tabs={tabs}
              onSelect={(tab) => {
                setActiveSection(tab.key);
              }}
            />
          </div>
          <div className="p-6 sm:p-8">{renderActiveSection()}</div>
        </section>
      </section>
    </main>
  );
}
