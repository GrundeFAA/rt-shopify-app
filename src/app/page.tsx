import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">RT Shopify B2B App</h1>
        <p className="text-sm text-neutral-700">
          Proof-of-concept foundation for company memberships and B2B dashboard
          access on top of Shopify customer accounts.
        </p>
      </header>

      <section className="rounded border border-neutral-200 p-4">
        <h2 className="font-medium">Available POC routes</h2>
        <ul className="mt-2 space-y-2 text-sm">
          <li>
            <Link href="/b2b-dashboard" className="underline">
              /b2b-dashboard
            </Link>
          </li>
          <li>
            <code>/api/webhooks/shopify/customers/create</code>
          </li>
          <li>
            <code>/api/webhooks/shopify/customers/update</code>
          </li>
          <li>
            <code>/api/trpc/b2b.getDashboard</code>
          </li>
        </ul>
      </section>
    </main>
  );
}
