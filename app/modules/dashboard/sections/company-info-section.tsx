import { useEffect, useState, type FormEvent } from "react";
import {
  DashboardAlert,
  DashboardFormLayout,
  DashboardFormRow,
  DashboardFormSection,
  DashboardModal,
} from "../components";
import type { CompanyAddress, DriftReport } from "../dashboard.types";

type CompanyInfoSectionProps = {
  address: CompanyAddress;
  setAddress: (updater: (previous: CompanyAddress) => CompanyAddress) => void;
  saveState: "idle" | "saving" | "success";
  saveMessage: string | null;
  syncMessage: string | null;
  syncReport: DriftReport | null;
  onAddressSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function CompanyInfoSection({
  address,
  setAddress,
  saveState,
  saveMessage,
  syncMessage,
  syncReport,
  onAddressSubmit,
}: CompanyInfoSectionProps) {
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [useEhfAsPrimary, setUseEhfAsPrimary] = useState(false);

  useEffect(() => {
    if (saveState === "success") {
      setIsEditAddressOpen(false);
    }
  }, [saveState]);

  return (
    <div className="grid gap-6">
      <DashboardFormLayout>
        <DashboardFormSection
          title="Postadresse"
          description="Adresse som brukes for firmaprofil og logistikk."
        >
          <DashboardFormRow label="Adresse">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--bk-color-text-strong)]">{address.line1 || "Ikke satt"}</p>
                <p className="text-sm text-[var(--bk-color-text-primary)]">
                  {address.line2 || "Adresselinje 2 (valgfri)"}
                </p>
                <p className="text-sm text-[var(--bk-color-text-primary)]">
                  {`${address.postalCode || ""} ${address.city || ""}`.trim() || "Postnummer og sted"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditAddressOpen(true)}
                className="inline-flex h-8 items-center justify-center rounded-[4px] bg-[var(--bk-color-accent-secondary)] px-3 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#243f6d] active:bg-[#1f355b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--bk-color-accent-secondary)]"
              >
                Rediger
              </button>
            </div>
          </DashboardFormRow>
        </DashboardFormSection>

        <DashboardFormSection
          title="Fakturainnstillinger"
          description={
            useEhfAsPrimary
              ? "EHF er satt som primær levering. Faktura-e-post er fortsatt påkrevd for kontokommunikasjon."
              : "Faktura-e-post er påkrevd og brukes til fakturalevering. Du kan valgfritt aktivere EHF som primær levering."
          }
        >
          <DashboardFormRow
            label="Faktura-epost"
            helpText={
              useEhfAsPrimary
                ? "Brukes til kontooppdateringer og fakturakommunikasjon."
                : "Fakturaer og kontooppdateringer sendes til denne e-posten."
            }
          >
            <input
              type="email"
              value={invoiceEmail}
              onChange={(event) => setInvoiceEmail(event.target.value)}
              placeholder="faktura@firma.no"
              className="block w-full max-w-md rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 py-2 text-sm text-[var(--bk-color-text-primary)] outline-none transition focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
            />
          </DashboardFormRow>

          <DashboardFormRow
            label="Primær levering"
            helpText="Når dette er aktivert leveres fakturaer via EHF basert på firmaets organisasjonsnummer."
          >
            <label className="flex items-center gap-2 text-sm text-[var(--bk-color-text-primary)]">
              <input
                type="checkbox"
                checked={useEhfAsPrimary}
                onChange={(event) => setUseEhfAsPrimary(event.target.checked)}
                className="h-4 w-4 rounded border-[var(--bk-color-border-default)] text-[var(--bk-color-accent-secondary)] focus:ring-[var(--bk-color-accent-secondary)]"
              />
              <span>Bruk EHF som primær fakturalevering (valgfritt)</span>
            </label>
          </DashboardFormRow>
        </DashboardFormSection>
      </DashboardFormLayout>

      {saveMessage || syncMessage || (syncReport && !syncReport.inSync) ? (
        <div className="border-t border-[var(--bk-color-border-default)] pt-6">
          <h3 className="text-lg font-semibold text-[var(--bk-color-text-strong)]">Synkstatus</h3>
          <div className="mt-3 grid gap-3">
            {saveMessage ? (
              <DashboardAlert variant="success" title="Adresse oppdatert">
                <p>{saveMessage}</p>
              </DashboardAlert>
            ) : null}
            {syncMessage ? <p className="text-sm text-[var(--bk-color-text-muted)]">{syncMessage}</p> : null}
            {syncReport && !syncReport.inSync ? (
              <div className="rounded-[4px] border border-[var(--bk-color-border-default)] bg-[var(--bk-color-bg-subtle)] p-3">
                <p className="text-sm font-semibold text-[var(--bk-color-text-strong)]">Avvikssammendrag</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-[var(--bk-color-text-primary)]">
                  {syncReport.mismatches.map((mismatch, index) => (
                    <li key={`${mismatch.key}-${index}`}>
                      <p className="font-medium">{mismatch.key}</p>
                      <p className="font-mono text-xs text-[var(--bk-color-text-muted)]">
                        Kilde: {JSON.stringify(mismatch.sourceValue)}
                      </p>
                      <p className="font-mono text-xs text-[var(--bk-color-text-muted)]">
                        Speilet: {JSON.stringify(mismatch.mirroredValue)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <DashboardModal
        open={isEditAddressOpen}
        onClose={setIsEditAddressOpen}
        title="Rediger firmaadresse"
        description="Oppdater primar firmaadresse. Endringer synkroniseres til firmaprofilen."
        size="lg"
        showCloseButton
      >
        <form onSubmit={onAddressSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
              <span>Adresselinje 1</span>
              <input
                className="h-12 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-base text-[var(--bk-color-text-primary)] outline-none transition focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                value={address.line1}
                onChange={(event) => setAddress((prev) => ({ ...prev, line1: event.target.value }))}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
              <span>Adresselinje 2 (valgfri)</span>
              <input
                className="h-12 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-base text-[var(--bk-color-text-primary)] outline-none transition focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                value={address.line2 ?? ""}
                onChange={(event) =>
                  setAddress((prev) => ({
                    ...prev,
                    line2: event.target.value || undefined,
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
              <span>Postnummer</span>
              <input
                className="h-12 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-base text-[var(--bk-color-text-primary)] outline-none transition focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                value={address.postalCode}
                onChange={(event) => setAddress((prev) => ({ ...prev, postalCode: event.target.value }))}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)]">
              <span>Sted</span>
              <input
                className="h-12 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-base text-[var(--bk-color-text-primary)] outline-none transition focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                value={address.city}
                onChange={(event) => setAddress((prev) => ({ ...prev, city: event.target.value }))}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[var(--bk-color-text-primary)] sm:max-w-[220px]">
              <span>Land (2-bokstavskode)</span>
              <input
                className="h-12 rounded-[4px] border border-[var(--bk-color-border-default)] bg-white px-3 text-base uppercase text-[var(--bk-color-text-primary)] outline-none transition focus:border-[var(--bk-color-accent-secondary)] focus:ring-2 focus:ring-[var(--bk-color-accent-secondary)]/20"
                value={address.country}
                maxLength={2}
                onChange={(event) =>
                  setAddress((prev) => ({ ...prev, country: event.target.value.toUpperCase() }))
                }
                required
              />
            </label>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[var(--bk-color-border-default)] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsEditAddressOpen(false)}
              className="inline-flex justify-center rounded-[4px] bg-[var(--bk-color-bg-muted)] px-4 py-2 text-sm font-semibold text-[var(--bk-color-text-primary)] transition-colors duration-200 hover:bg-[#e7ebed]"
            >
              Avbryt
            </button>
            <button
              className="inline-flex justify-center rounded-[4px] bg-[var(--bk-color-accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[var(--bk-color-accent-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={saveState === "saving"}
            >
              {saveState === "saving" ? "Lagrer..." : "Lagre adresse"}
            </button>
          </div>
        </form>
      </DashboardModal>
    </div>
  );
}
