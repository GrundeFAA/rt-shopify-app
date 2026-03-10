import Link from "next/link";

import { api } from "#/trpc/server";

type B2BDashboardPageProps = {
  searchParams: Promise<{
    customerId?: string;
  }>;
};

export default async function B2BDashboardPage({
  searchParams,
}: B2BDashboardPageProps) {
  const params = await searchParams;
  const customerId = params.customerId;

  if (!customerId) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-6 py-12">
        <h1 className="text-2xl font-semibold">B2B Dashboard (POC)</h1>
        <p className="text-sm text-neutral-600">
          Add a `customerId` query parameter to load a Shopify customer context.
        </p>
        <p className="text-sm text-neutral-600">
          Example: <code>/b2b-dashboard?customerId=123456789</code>
        </p>
        <Link href="/" className="text-sm underline">
          Back to home
        </Link>
      </main>
    );
  }

  const dashboard = await api.b2b.getDashboard({ shopifyCustomerId: customerId });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">B2B Dashboard (POC)</h1>
      <p className="text-sm text-neutral-600">Shopify customer: {customerId}</p>

      {dashboard.state === "PENDING_OR_MISSING" ? (
        <section className="rounded border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-medium">Membership pending</h2>
          <p className="text-sm">
            This customer does not have an approved company membership yet.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Company</h2>
            <p className="text-sm">Name: {dashboard.company.name}</p>
            <p className="text-sm">
              Org number: {dashboard.company.orgNumber ?? "Not provided"}
            </p>
          </section>

          <section className="rounded border border-neutral-200 p-4">
            <h2 className="font-medium">Members</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {dashboard.members.map((member) => (
                <li key={member.id} className="rounded bg-neutral-100 p-2">
                  {member.shopifyCustomerId} - {member.role} ({member.status})
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
