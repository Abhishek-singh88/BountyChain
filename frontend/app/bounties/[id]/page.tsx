type PageProps = {
  params: { id: string };
};

export default async function BountyDetailsPage({ params }: PageProps) {
  const { id } = params;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow md:p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-accent2">Bounty #{id}</p>
        <h1 className="mt-3 text-3xl font-semibold">Review, accept, submit, approve</h1>
        <p className="mt-2 text-sm text-muted">
          This detail view will drive the full bounty lifecycle once the contract endpoints are wired up.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <button className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 text-sm font-medium">
            Accept bounty
          </button>
          <button className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 text-sm font-medium">
            Submit work
          </button>
          <button className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium text-background">
            Approve and pay
          </button>
        </div>
      </section>
    </main>
  );
}
