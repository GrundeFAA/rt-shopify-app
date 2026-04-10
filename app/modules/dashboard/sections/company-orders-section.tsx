import { useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { DashboardBadge, DashboardTable } from "../components";
import {
  fetchCompanyOrderDetail,
  parseJsonResponse,
  readErrorContract,
} from "../dashboard-api";
import { toDashboardFrontendState } from "../error-state";
import type {
  CompanyOrderDetail,
  CompanyOrderDetailAddress,
  CompanyOrderDetailResponse,
  CompanyOrdersListItem,
  DashboardOrderRow,
} from "../dashboard.types";
import type { ApiErrorContract, DashboardErrorState } from "../error-state";

const PAYMENT_STATUS_VARIANT: Record<
  DashboardOrderRow["paymentStatus"],
  "warning" | "info" | "success"
> = {
  Venter: "warning",
  "Delvis betalt": "info",
  Betalt: "success",
};

const FULFILLMENT_STATUS_VARIANT: Record<
  DashboardOrderRow["fulfillmentStatus"],
  "warning" | "info" | "success"
> = {
  "Ikke oppfylt": "warning",
  "Delvis oppfylt": "info",
  Oppfylt: "success",
};

function mapPaymentStatus(status: CompanyOrdersListItem["paymentStatus"]): DashboardOrderRow["paymentStatus"] {
  if (status === "PAID") {
    return "Betalt";
  }

  if (status === "PARTIALLY_PAID") {
    return "Delvis betalt";
  }

  return "Venter";
}

function mapFulfillmentStatus(
  status: CompanyOrdersListItem["fulfillmentStatus"],
): DashboardOrderRow["fulfillmentStatus"] {
  if (status === "FULFILLED") {
    return "Oppfylt";
  }

  if (status === "PARTIALLY_FULFILLED") {
    return "Delvis oppfylt";
  }

  return "Ikke oppfylt";
}

function toDashboardRows(orders: CompanyOrdersListItem[]): DashboardOrderRow[] {
  return orders.map((order) => ({
    sourceOrderId: order.orderId,
    id: order.orderNumber,
    placedOn: new Date(order.placedAt).toISOString().slice(0, 10),
    placedBy: order.placedByDisplayName ?? order.placedByCustomerId,
    paymentStatus: mapPaymentStatus(order.paymentStatus),
    fulfillmentStatus: mapFulfillmentStatus(order.fulfillmentStatus),
    total: `${order.currencyCode} ${order.totalAmount}`,
  }));
}

type CompanyOrdersSectionProps = {
  orders: CompanyOrdersListItem[];
  authToken: string | null;
  onRuntimeError: (payload: { state: DashboardErrorState; error: ApiErrorContract }) => void;
};

function formatCurrency(amount: string, currencyCode: string): string {
  return `${currencyCode} ${amount}`;
}

function renderAddress(address: CompanyOrderDetailAddress | null) {
  if (!address) {
    return <p className="text-sm text-[var(--bk-color-text-subtle)]">Ikke registrert</p>;
  }

  const lines = [
    address.name,
    address.company,
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(" ").trim(),
    address.countryCode,
    address.phone,
  ].filter((line) => Boolean(line && line.trim().length > 0)) as string[];

  if (lines.length === 0) {
    return <p className="text-sm text-[var(--bk-color-text-subtle)]">Ikke registrert</p>;
  }

  return (
    <address className="not-italic">
      <ul className="space-y-1 text-sm text-[var(--bk-color-text-primary)]">
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    </address>
  );
}

export function CompanyOrdersSection({
  orders,
  authToken,
  onRuntimeError,
}: CompanyOrdersSectionProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<CompanyOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const rows = toDashboardRows(orders);

  const onViewOrder = async (row: DashboardOrderRow) => {
    const orderId = row.sourceOrderId ?? row.id;
    setDetailLoading(true);
    const response = await fetchCompanyOrderDetail(orderId, authToken);
    if (!response.ok) {
      const error = await readErrorContract(response);
      onRuntimeError({ state: toDashboardFrontendState(error), error });
      setDetailLoading(false);
      return;
    }

    const payload = await parseJsonResponse<CompanyOrderDetailResponse>(response);
    setSelectedOrderId(orderId);
    setDetailOrder(payload.order);
    setDetailLoading(false);
  };

  if (selectedOrderId && detailOrder) {
    return (
      <section className="grid gap-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSelectedOrderId(null);
              setDetailOrder(null);
            }}
            className="inline-flex items-center gap-2 rounded-[4px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-muted)] px-3 py-2 text-sm font-medium text-[var(--bk-color-text-primary)] transition-colors duration-200 hover:bg-[#e7ebed]"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Tilbake til ordreliste
          </button>
        </div>

        <div className="grid gap-6 rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-default)] p-6">
          <header className="grid gap-4 border-b border-[var(--bk-color-border-default)] pb-4 sm:grid-cols-2">
            <div>
              <h2 className="text-[24px] font-semibold text-[var(--bk-color-text-strong)]">
                Ordre {detailOrder.orderNumber}
              </h2>
              <p className="mt-1 text-sm text-[var(--bk-color-text-muted)]">
                Bestilt {new Date(detailOrder.placedAt).toISOString().slice(0, 10)} av{" "}
                {detailOrder.placedByDisplayName ?? detailOrder.placedByCustomerId}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2 sm:justify-end">
              <DashboardBadge variant={PAYMENT_STATUS_VARIANT[mapPaymentStatus(detailOrder.paymentStatus)]}>
                {mapPaymentStatus(detailOrder.paymentStatus)}
              </DashboardBadge>
              <DashboardBadge
                variant={FULFILLMENT_STATUS_VARIANT[mapFulfillmentStatus(detailOrder.fulfillmentStatus)]}
              >
                {mapFulfillmentStatus(detailOrder.fulfillmentStatus)}
              </DashboardBadge>
            </div>
          </header>

          <section className="grid gap-3">
            <h3 className="text-lg font-semibold text-[var(--bk-color-text-strong)]">Varelinjer</h3>
            <div className="overflow-x-auto rounded-[6px] border border-[var(--bk-color-border-default)]">
              <table className="min-w-full divide-y divide-[var(--bk-color-border-default)]">
                <thead className="bg-[var(--bk-color-bg-subtle)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--bk-color-text-primary)]">
                      Produkt
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--bk-color-text-primary)]">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--bk-color-text-primary)]">
                      Antall
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--bk-color-text-primary)]">
                      Enhetspris
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--bk-color-text-primary)]">
                      Linjesum
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--bk-color-border-default)]">
                  {detailOrder.lineItems.map((line, index) => (
                    <tr key={`${line.title}-${index}`}>
                      <td className="px-4 py-3 text-sm text-[var(--bk-color-text-primary)]">{line.title}</td>
                      <td className="px-4 py-3 text-sm text-[var(--bk-color-text-muted)]">
                        {line.sku ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--bk-color-text-muted)]">{line.quantity}</td>
                      <td className="px-4 py-3 text-sm text-[var(--bk-color-text-muted)]">
                        {formatCurrency(line.unitPrice, detailOrder.totals.currencyCode)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--bk-color-text-primary)]">
                        {formatCurrency(line.lineTotal, detailOrder.totals.currencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-subtle)] p-4">
              <h3 className="text-sm font-semibold text-[var(--bk-color-text-strong)]">Leveringsadresse</h3>
              <div className="mt-2">{renderAddress(detailOrder.shippingAddress)}</div>
            </div>
            <div className="rounded-[6px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-subtle)] p-4">
              <h3 className="text-sm font-semibold text-[var(--bk-color-text-strong)]">Fakturaadresse</h3>
              <div className="mt-2">{renderAddress(detailOrder.billingAddress)}</div>
            </div>
          </section>

          <section className="rounded-[6px] border border-[var(--bk-color-border-default)] p-4">
            <h3 className="text-sm font-semibold text-[var(--bk-color-text-strong)]">Totalsummer</h3>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <dt className="text-[var(--bk-color-text-muted)]">Delsum</dt>
                <dd className="font-medium">{formatCurrency(detailOrder.totals.subtotal, detailOrder.totals.currencyCode)}</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <dt className="text-[var(--bk-color-text-muted)]">Frakt</dt>
                <dd className="font-medium">{formatCurrency(detailOrder.totals.shipping, detailOrder.totals.currencyCode)}</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <dt className="text-[var(--bk-color-text-muted)]">MVA</dt>
                <dd className="font-medium">{formatCurrency(detailOrder.totals.tax, detailOrder.totals.currencyCode)}</dd>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <dt className="text-[var(--bk-color-text-muted)]">Rabatt</dt>
                <dd className="font-medium">{formatCurrency(detailOrder.totals.discounts, detailOrder.totals.currencyCode)}</dd>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 border-t border-[var(--bk-color-border-default)] pt-2">
                <dt className="text-[var(--bk-color-text-strong)] font-semibold">Totalt</dt>
                <dd className="font-semibold">{formatCurrency(detailOrder.totals.total, detailOrder.totals.currencyCode)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>
    );
  }

  return (
    <>
      <DashboardTable
        title="Ordrer"
        description="Firmaordrer hentet direkte fra Shopify."
        embedded
        rows={rows}
        columns={[
          {
            key: "order",
            header: "Ordre",
            renderCell: (row: DashboardOrderRow) => (
              <p className="font-medium text-[var(--bk-color-text-primary)]">{row.id}</p>
            ),
          },
          {
            key: "placed_on",
            header: "Bestilt dato",
            renderCell: (row: DashboardOrderRow) => row.placedOn,
          },
          {
            key: "placed_by",
            header: "Bestilt av",
            renderCell: (row: DashboardOrderRow) => row.placedBy,
          },
          {
            key: "payment_status",
            header: "Betalingsstatus",
            renderCell: (row: DashboardOrderRow) => (
              <DashboardBadge variant={PAYMENT_STATUS_VARIANT[row.paymentStatus]}>
                {row.paymentStatus}
              </DashboardBadge>
            ),
          },
          {
            key: "fulfillment_status",
            header: "Oppfyllelsesstatus",
            renderCell: (row: DashboardOrderRow) => (
              <DashboardBadge variant={FULFILLMENT_STATUS_VARIANT[row.fulfillmentStatus]}>
                {row.fulfillmentStatus}
              </DashboardBadge>
            ),
          },
          {
            key: "total",
            header: "Totalt",
            renderCell: (row: DashboardOrderRow) => row.total,
          },
        ]}
        getRowKey={(row) => row.id}
        rowAction={{
          label: "Vis",
          onClick: onViewOrder,
          srLabel: (row) => `Vis ${row.id}`,
        }}
        emptyStateText="Ingen firmaordrer er tilgjengelige."
      />
      {detailLoading ? (
        <p className="mt-4 text-sm text-[var(--bk-color-text-muted)]">Laster ordredetaljer...</p>
      ) : null}
    </>
  );
}
