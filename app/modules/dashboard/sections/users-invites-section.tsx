import { useState } from "react";
import { DashboardBadge, DashboardRowActionsMenu, DashboardTable } from "../components";
import {
  activateCompanyMember,
  deactivateCompanyMember,
  parseJsonResponse,
  readErrorContract,
} from "../dashboard-api";
import { toDashboardFrontendState } from "../error-state";
import type { ApiErrorContract, DashboardErrorState } from "../error-state";
import type {
  ActivateCompanyMemberResponse,
  CompanyMembersResponse,
  DashboardUserRow,
  DeactivateCompanyMemberResponse,
} from "../dashboard.types";

const USER_STATUS_VARIANT: Record<DashboardUserRow["status"], "success" | "warning" | "neutral"> = {
  Aktiv: "success",
  "Invitasjon sendt": "warning",
  Inaktiv: "neutral",
};

type UsersInvitesSectionProps = {
  isAdministrator: boolean;
  initialMembers: CompanyMembersResponse;
  authToken: string | null;
  onRuntimeError: (payload: { state: DashboardErrorState; error: ApiErrorContract }) => void;
};

function toUserRow(member: CompanyMembersResponse["members"][number]): DashboardUserRow {
  const statusLabel =
    member.status === "active" ? "Aktiv" : member.status === "inactive" ? "Inaktiv" : "Invitasjon sendt";
  return {
    id: member.id,
    name: `Kunde ${member.customerId}`,
    email: `customer:${member.customerId}`,
    role: member.role === "administrator" ? "administrator" : "bruker",
    status: statusLabel,
  };
}

export function UsersInvitesSection({
  isAdministrator,
  initialMembers,
  authToken,
  onRuntimeError,
}: UsersInvitesSectionProps) {
  const [rows, setRows] = useState<DashboardUserRow[]>(initialMembers.members.map(toUserRow));
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const handleApiError = async (response: Response) => {
    const error = await readErrorContract(response);
    onRuntimeError({ state: toDashboardFrontendState(error), error });
  };

  const activateMember = async (memberId: string) => {
    setUpdatingMemberId(memberId);
    const response = await activateCompanyMember(memberId, authToken);
    if (!response.ok) {
      await handleApiError(response);
      setUpdatingMemberId(null);
      return;
    }
    await parseJsonResponse<ActivateCompanyMemberResponse>(response);
    setRows((previous) => previous.map((row) => (row.id === memberId ? { ...row, status: "Aktiv" } : row)));
    setUpdatingMemberId(null);
  };

  const deactivateMember = async (memberId: string) => {
    setUpdatingMemberId(memberId);
    const response = await deactivateCompanyMember(memberId, authToken);
    if (!response.ok) {
      await handleApiError(response);
      setUpdatingMemberId(null);
      return;
    }
    await parseJsonResponse<DeactivateCompanyMemberResponse>(response);
    setRows((previous) =>
      previous.map((row) => (row.id === memberId ? { ...row, status: "Inaktiv" } : row)),
    );
    setUpdatingMemberId(null);
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
                      onClick: () => void activateMember(row.id),
                      disabled: row.status === "Aktiv" || updatingMemberId === row.id,
                    },
                    {
                      label: "Sett inaktiv",
                      onClick: () => void deactivateMember(row.id),
                      disabled: row.status === "Inaktiv" || updatingMemberId === row.id,
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
      description="Administrer status for firmabrukere."
      embedded
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      primaryActionLabel="Inviter bruker"
      emptyStateText="Ingen brukere eller invitasjoner er tilgjengelige ennå."
    />
  );
}
