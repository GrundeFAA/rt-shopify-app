import { useState } from "react";
import { DashboardBadge, DashboardModal, DashboardTable } from "../components";
import { SKELETON_ORDER_ROWS } from "../dashboard.constants";
import type { DashboardOrderRow } from "../dashboard.types";

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

export function CompanyOrdersSection() {
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrderRow | null>(null);

  return (
    <>
      <DashboardTable
        title="Ordrer"
        description="Foreløpig struktur for delte firmaordrer."
        embedded
        rows={SKELETON_ORDER_ROWS}
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
          onClick: (row) => setSelectedOrder(row),
          srLabel: (row) => `Vis ${row.id}`,
        }}
        emptyStateText="Ingen firmaordrer er tilgjengelige ennå."
      />

      <DashboardModal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Ordre ${selectedOrder.id}` : "Ordredetaljer"}
        description="Visning av detaljer for valgt firmaordre."
        size="md"
      >
        {selectedOrder ? (
          <dl className="grid gap-3 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <dt className="text-[var(--bk-color-text-subtle)]">Bestilt dato</dt>
              <dd className="font-medium text-[var(--bk-color-text-primary)]">{selectedOrder.placedOn}</dd>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <dt className="text-[var(--bk-color-text-subtle)]">Bestilt av</dt>
              <dd className="font-medium text-[var(--bk-color-text-primary)]">{selectedOrder.placedBy}</dd>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <dt className="text-[var(--bk-color-text-subtle)]">Betalingsstatus</dt>
              <dd>
                <DashboardBadge variant={PAYMENT_STATUS_VARIANT[selectedOrder.paymentStatus]}>
                  {selectedOrder.paymentStatus}
                </DashboardBadge>
              </dd>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <dt className="text-[var(--bk-color-text-subtle)]">Oppfyllelsesstatus</dt>
              <dd>
                <DashboardBadge variant={FULFILLMENT_STATUS_VARIANT[selectedOrder.fulfillmentStatus]}>
                  {selectedOrder.fulfillmentStatus}
                </DashboardBadge>
              </dd>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <dt className="text-[var(--bk-color-text-subtle)]">Totalt</dt>
              <dd className="font-medium text-[var(--bk-color-text-primary)]">{selectedOrder.total}</dd>
            </div>
          </dl>
        ) : null}
      </DashboardModal>
    </>
  );
}
