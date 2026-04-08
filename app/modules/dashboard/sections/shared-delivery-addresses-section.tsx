import { useState } from "react";
import { DashboardModal, DashboardTable } from "../components";
import { SKELETON_DELIVERY_ADDRESS_ROWS } from "../dashboard.constants";
import type { DashboardDeliveryAddressRow } from "../dashboard.types";

export function SharedDeliveryAddressesSection() {
  const [rows, setRows] = useState<DashboardDeliveryAddressRow[]>(SKELETON_DELIVERY_ADDRESS_ROWS);
  const [selectedAddress, setSelectedAddress] = useState<DashboardDeliveryAddressRow | null>(null);
  const [editAddress, setEditAddress] = useState<DashboardDeliveryAddressRow | null>(null);

  const openEdit = (row: DashboardDeliveryAddressRow) => {
    setSelectedAddress(row);
    setEditAddress(row);
  };

  const saveEdit = () => {
    if (!editAddress) {
      return;
    }
    setRows((previous) => previous.map((row) => (row.id === editAddress.id ? editAddress : row)));
    setSelectedAddress(null);
    setEditAddress(null);
  };

  return (
    <>
      <DashboardTable
        title="Leveringsadresser"
        description="Adresseliste for felles leveringsdestinasjoner i firmaet."
        embedded
        rows={rows}
        columns={[
          {
            key: "label",
            header: "Navn",
            renderCell: (row: DashboardDeliveryAddressRow) => (
              <p className="font-medium text-[var(--bk-color-text-primary)]">{row.label}</p>
            ),
          },
          {
            key: "address",
            header: "Adresse",
            renderCell: (row: DashboardDeliveryAddressRow) => row.line1,
          },
          {
            key: "postal",
            header: "Postnummer",
            renderCell: (row: DashboardDeliveryAddressRow) => row.postalCode,
          },
          {
            key: "city",
            header: "Sted",
            renderCell: (row: DashboardDeliveryAddressRow) => row.city,
          },
          {
            key: "added_by",
            header: "Lagt til av",
            renderCell: (row: DashboardDeliveryAddressRow) => row.addedBy,
          },
        ]}
        getRowKey={(row) => row.id}
        rowAction={{
          label: "Rediger",
          onClick: (row) => openEdit(row),
          srLabel: (row) => `Rediger ${row.label}`,
        }}
        primaryActionLabel="Legg til adresse"
        emptyStateText="Ingen delte leveringsadresser er tilgjengelige ennå."
      />

      <DashboardModal
        open={Boolean(selectedAddress && editAddress)}
        onClose={() => {
          setSelectedAddress(null);
          setEditAddress(null);
        }}
        title={selectedAddress ? `Rediger ${selectedAddress.label}` : "Rediger adresse"}
        description="Oppdater leveringsadresse for valgt oppføring."
        size="md"
      >
        {editAddress ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveEdit();
            }}
          >
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                <span>Navn</span>
                <input
                  value={editAddress.label}
                  onChange={(event) =>
                    setEditAddress((previous) =>
                      previous ? { ...previous, label: event.target.value } : previous,
                    )
                  }
                  className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                <span>Adresse</span>
                <input
                  value={editAddress.line1}
                  onChange={(event) =>
                    setEditAddress((previous) =>
                      previous ? { ...previous, line1: event.target.value } : previous,
                    )
                  }
                  className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                  <span>Postnummer</span>
                  <input
                    value={editAddress.postalCode}
                    onChange={(event) =>
                      setEditAddress((previous) =>
                        previous ? { ...previous, postalCode: event.target.value } : previous,
                      )
                    }
                    className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                  <span>Sted</span>
                  <input
                    value={editAddress.city}
                    onChange={(event) =>
                      setEditAddress((previous) =>
                        previous ? { ...previous, city: event.target.value } : previous,
                      )
                    }
                    className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--bk-color-border-default)] pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedAddress(null);
                  setEditAddress(null);
                }}
                className="inline-flex justify-center rounded-[4px] bg-[var(--bk-color-bg-muted)] px-4 py-2 text-sm font-semibold text-[var(--bk-color-text-primary)] transition-colors duration-200 hover:bg-[#e7ebed]"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="inline-flex justify-center rounded-[4px] bg-[var(--bk-color-accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--bk-color-accent-primary-hover)]"
              >
                Lagre
              </button>
            </div>
          </form>
        ) : null}
      </DashboardModal>
    </>
  );
}
