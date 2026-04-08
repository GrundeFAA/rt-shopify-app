import { useState } from "react";
import { DashboardBadge, DashboardRowActionsMenu, DashboardTable } from "../components";
import { SKELETON_USER_ROWS } from "../dashboard.constants";
import type { DashboardUserRow } from "../dashboard.types";

const USER_STATUS_VARIANT: Record<DashboardUserRow["status"], "success" | "warning" | "neutral"> = {
  Aktiv: "success",
  "Invitasjon sendt": "warning",
  Inaktiv: "neutral",
};

type UsersInvitesSectionProps = {
  isAdministrator: boolean;
};

export function UsersInvitesSection({ isAdministrator }: UsersInvitesSectionProps) {
  const [rows, setRows] = useState<DashboardUserRow[]>(SKELETON_USER_ROWS);

  const updateStatus = (userId: string, status: "Aktiv" | "Inaktiv") => {
    setRows((previous) =>
      previous.map((row) => (row.id === userId ? { ...row, status } : row)),
    );
  };

  const columns = [
    {
      key: "name",
      header: "Navn",
      renderCell: (row: DashboardUserRow) => (
        <p className="font-medium text-[var(--bk-color-text-primary)]">{row.name}</p>
      ),
    },
    {
      key: "email",
      header: "E-post",
      renderCell: (row: DashboardUserRow) => row.email,
    },
    {
      key: "role",
      header: "Rolle",
      renderCell: (row: DashboardUserRow) => row.role,
    },
    {
      key: "status",
      header: "Status",
      renderCell: (row: DashboardUserRow) => (
        <DashboardBadge variant={USER_STATUS_VARIANT[row.status]}>{row.status}</DashboardBadge>
      ),
    },
    ...(isAdministrator
      ? [
          {
            key: "actions",
            header: "",
            className: "w-12 text-right",
            renderCell: (row: DashboardUserRow) => (
              <div className="flex justify-end">
                <DashboardRowActionsMenu
                  srLabel={`Åpne handlinger for ${row.name}`}
                  items={[
                    {
                      label: "Sett aktiv",
                      onClick: () => updateStatus(row.id, "Aktiv"),
                      disabled: row.status === "Aktiv",
                    },
                    {
                      label: "Sett inaktiv",
                      onClick: () => updateStatus(row.id, "Inaktiv"),
                      disabled: row.status === "Inaktiv",
                    },
                  ]}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <DashboardTable
      title="Brukere"
      description="Foreløpig struktur for firmabrukere og invitasjonshåndtering."
      embedded
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      primaryActionLabel="Inviter bruker"
      emptyStateText="Ingen brukere eller invitasjoner er tilgjengelige ennå."
    />
  );
}
