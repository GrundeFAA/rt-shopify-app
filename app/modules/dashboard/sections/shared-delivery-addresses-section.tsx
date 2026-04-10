import { useMemo, useState, type FormEvent } from "react";
import { DashboardModal, DashboardTable } from "../components";
import {
  createCompanyAddress,
  deleteCompanyAddress,
  parseJsonResponse,
  readErrorContract,
  updateCompanyAddress,
} from "../dashboard-api";
import { toDashboardFrontendState } from "../error-state";
import type {
  CompanyAddressesResponse,
  CompanySharedAddress,
  CreateCompanyAddressResponse,
  DeleteCompanyAddressResponse,
  UpdateCompanyAddressResponse,
} from "../dashboard.types";
import type { ApiErrorContract, DashboardErrorState } from "../error-state";

type SharedDeliveryAddressesSectionProps = {
  initialData: CompanyAddressesResponse;
  authToken: string | null;
  canMutate: boolean;
  onRuntimeError: (payload: { state: DashboardErrorState; error: ApiErrorContract }) => void;
};

type AddressFormState = {
  label: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
  country: string;
};

const EMPTY_FORM: AddressFormState = {
  label: "",
  line1: "",
  line2: "",
  postalCode: "",
  city: "",
  country: "NO",
};

function toEditableForm(address: CompanySharedAddress): AddressFormState {
  return {
    label: address.label ?? "",
    line1: address.line1,
    line2: address.line2 ?? "",
    postalCode: address.postalCode,
    city: address.city,
    country: address.country,
  };
}

function buildAddressPayload(form: AddressFormState) {
  return {
    label: form.label.trim() || undefined,
    line1: form.line1.trim(),
    line2: form.line2.trim() || undefined,
    postalCode: form.postalCode.trim(),
    city: form.city.trim(),
    country: form.country.trim().toUpperCase(),
  };
}

function isValidForm(form: AddressFormState): boolean {
  return (
    form.line1.trim().length > 0 &&
    form.postalCode.trim().length > 0 &&
    form.city.trim().length > 0 &&
    form.country.trim().length >= 2
  );
}

export function SharedDeliveryAddressesSection({
  initialData,
  authToken,
  canMutate,
  onRuntimeError,
}: SharedDeliveryAddressesSectionProps) {
  const [rows, setRows] = useState<CompanySharedAddress[]>(initialData.addresses);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AddressFormState>(EMPTY_FORM);
  const [editAddress, setEditAddress] = useState<CompanySharedAddress | null>(null);
  const [editForm, setEditForm] = useState<AddressFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const inactiveHint = useMemo(() => {
    if (canMutate) {
      return null;
    }
    return "Du må ha aktivt medlemskap for å legge til eller endre leveringsadresser.";
  }, [canMutate]);

  const handleApiError = async (response: Response) => {
    const error = await readErrorContract(response);
    onRuntimeError({ state: toDashboardFrontendState(error), error });
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canMutate || !isValidForm(createForm)) {
      return;
    }

    setIsSaving(true);
    const response = await createCompanyAddress(
      {
        address: buildAddressPayload(createForm),
      },
      authToken,
    );
    if (!response.ok) {
      await handleApiError(response);
      setIsSaving(false);
      return;
    }

    const payload = await parseJsonResponse<CreateCompanyAddressResponse>(response);
    setRows((previous) => [payload.address, ...previous]);
    setCreateOpen(false);
    setCreateForm(EMPTY_FORM);
    setIsSaving(false);
  };

  const onSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canMutate || !editAddress || !isValidForm(editForm)) {
      return;
    }

    setIsSaving(true);
    const response = await updateCompanyAddress(
      editAddress.id,
      {
        address: buildAddressPayload(editForm),
      },
      authToken,
    );
    if (!response.ok) {
      await handleApiError(response);
      setIsSaving(false);
      return;
    }

    const payload = await parseJsonResponse<UpdateCompanyAddressResponse>(response);
    setRows((previous) => previous.map((row) => (row.id === payload.address.id ? payload.address : row)));
    setEditAddress(null);
    setEditForm(EMPTY_FORM);
    setIsSaving(false);
  };

  const onDelete = async () => {
    if (!canMutate || !editAddress) {
      return;
    }

    setIsSaving(true);
    const response = await deleteCompanyAddress(editAddress.id, authToken);
    if (!response.ok) {
      await handleApiError(response);
      setIsSaving(false);
      return;
    }

    const payload = await parseJsonResponse<DeleteCompanyAddressResponse>(response);
    setRows((previous) => previous.filter((row) => row.id !== payload.deletedAddressId));
    setEditAddress(null);
    setEditForm(EMPTY_FORM);
    setIsSaving(false);
  };

  return (
    <>
      <DashboardTable
        title="Leveringsadresser"
        description="Felles leveringsadresser for firmaet. Postadressen er alltid standardadresse i Shopify."
        embedded
        rows={rows}
        columns={[
          {
            key: "label",
            header: "Navn",
            renderCell: (row: CompanySharedAddress) => (
              <p className="font-medium text-[var(--bk-color-text-primary)]">{row.label ?? "Uten navn"}</p>
            ),
          },
          {
            key: "address",
            header: "Adresse",
            renderCell: (row: CompanySharedAddress) => (
              <div className="text-[var(--bk-color-text-muted)]">
                <p>{row.line1}</p>
                {row.line2 ? <p>{row.line2}</p> : null}
              </div>
            ),
          },
          {
            key: "postal",
            header: "Postnummer",
            renderCell: (row: CompanySharedAddress) => row.postalCode,
          },
          {
            key: "city",
            header: "Sted",
            renderCell: (row: CompanySharedAddress) => row.city,
          },
          {
            key: "country",
            header: "Land",
            renderCell: (row: CompanySharedAddress) => row.country,
          },
          {
            key: "added_by",
            header: "Lagt til av",
            renderCell: (row: CompanySharedAddress) => row.createdByMemberId,
          },
        ]}
        getRowKey={(row) => row.id}
        rowAction={
          canMutate
            ? {
                label: "Rediger",
                onClick: (row) => {
                  setEditAddress(row);
                  setEditForm(toEditableForm(row));
                },
                srLabel: (row) => `Rediger ${row.label ?? row.line1}`,
              }
            : undefined
        }
        primaryActionLabel={canMutate ? "Legg til adresse" : undefined}
        onPrimaryAction={canMutate ? () => setCreateOpen(true) : undefined}
        emptyStateText="Ingen delte leveringsadresser er tilgjengelige ennå."
      />

      {inactiveHint ? (
        <p className="mt-4 text-sm text-[var(--bk-color-text-muted)]">{inactiveHint}</p>
      ) : null}

      <DashboardModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateForm(EMPTY_FORM);
        }}
        title="Ny leveringsadresse"
        description="Opprett en ny delt leveringsadresse for firmaet."
        size="md"
      >
        <form onSubmit={(event) => void onCreate(event)}>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
              <span>Navn (valgfritt)</span>
              <input
                value={createForm.label}
                onChange={(event) =>
                  setCreateForm((previous) => ({ ...previous, label: event.target.value }))
                }
                className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
              <span>Adresse</span>
              <input
                value={createForm.line1}
                onChange={(event) =>
                  setCreateForm((previous) => ({ ...previous, line1: event.target.value }))
                }
                required
                className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
              <span>Adresselinje 2 (valgfritt)</span>
              <input
                value={createForm.line2}
                onChange={(event) =>
                  setCreateForm((previous) => ({ ...previous, line2: event.target.value }))
                }
                className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                <span>Postnummer</span>
                <input
                  value={createForm.postalCode}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, postalCode: event.target.value }))
                  }
                  required
                  className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                <span>Sted</span>
                <input
                  value={createForm.city}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, city: event.target.value }))
                  }
                  required
                  className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                <span>Land (ISO-2)</span>
                <input
                  value={createForm.country}
                  onChange={(event) =>
                    setCreateForm((previous) => ({ ...previous, country: event.target.value }))
                  }
                  required
                  minLength={2}
                  maxLength={2}
                  className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 uppercase text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                />
              </label>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--bk-color-border-default)] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setCreateForm(EMPTY_FORM);
              }}
              className="inline-flex justify-center rounded-[4px] bg-[var(--bk-color-bg-muted)] px-4 py-2 text-sm font-semibold text-[var(--bk-color-text-primary)] transition-colors duration-200 hover:bg-[#e7ebed]"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={!canMutate || isSaving || !isValidForm(createForm)}
              className="inline-flex justify-center rounded-[4px] bg-[var(--bk-color-accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--bk-color-accent-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Lagrer..." : "Opprett"}
            </button>
          </div>
        </form>
      </DashboardModal>

      <DashboardModal
        open={Boolean(editAddress)}
        onClose={() => {
          setEditAddress(null);
          setEditForm(EMPTY_FORM);
        }}
        title={editAddress ? `Rediger ${editAddress.label ?? editAddress.line1}` : "Rediger adresse"}
        description="Oppdater leveringsadresse for valgt oppføring."
        size="md"
      >
        {editAddress ? (
          <form onSubmit={(event) => void onSaveEdit(event)}>
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                <span>Navn (valgfritt)</span>
                <input
                  value={editForm.label}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, label: event.target.value }))
                  }
                  className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                <span>Adresse</span>
                <input
                  value={editForm.line1}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, line1: event.target.value }))
                  }
                  required
                  className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                <span>Adresselinje 2 (valgfritt)</span>
                <input
                  value={editForm.line2}
                  onChange={(event) =>
                    setEditForm((previous) => ({ ...previous, line2: event.target.value }))
                  }
                  className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                  <span>Postnummer</span>
                  <input
                    value={editForm.postalCode}
                    onChange={(event) =>
                      setEditForm((previous) => ({ ...previous, postalCode: event.target.value }))
                    }
                    required
                    className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                  <span>Sted</span>
                  <input
                    value={editForm.city}
                    onChange={(event) =>
                      setEditForm((previous) => ({ ...previous, city: event.target.value }))
                    }
                    required
                    className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
                  <span>Land (ISO-2)</span>
                  <input
                    value={editForm.country}
                    onChange={(event) =>
                      setEditForm((previous) => ({ ...previous, country: event.target.value }))
                    }
                    required
                    minLength={2}
                    maxLength={2}
                    className="h-10 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 uppercase text-sm text-[var(--bk-color-text-primary)] outline-none focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--bk-color-border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => void onDelete()}
                disabled={!canMutate || isSaving}
                className="inline-flex justify-center rounded-[4px] bg-[#b72c2c] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#9f2525] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Slett adresse
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setEditAddress(null);
                    setEditForm(EMPTY_FORM);
                  }}
                  className="inline-flex justify-center rounded-[4px] bg-[var(--bk-color-bg-muted)] px-4 py-2 text-sm font-semibold text-[var(--bk-color-text-primary)] transition-colors duration-200 hover:bg-[#e7ebed]"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={!canMutate || isSaving || !isValidForm(editForm)}
                  className="inline-flex justify-center rounded-[4px] bg-[var(--bk-color-accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--bk-color-accent-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Lagrer..." : "Lagre"}
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </DashboardModal>
    </>
  );
}
