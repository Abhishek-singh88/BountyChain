const sampleBounties = [
  { id: 1, title: "Fix payment routing", reward: "250 BOUNTY", status: "OPEN" },
  { id: 2, title: "Design mobile navbar", reward: "120 BOUNTY", status: "ACCEPTED" },
  { id: 3, title: "Write event indexer", reward: "500 BOUNTY", status: "COMPLETED" },
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-accent">BountyChain</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
              Ship bounties on Stellar with automatic payouts.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted md:text-lg">
              A decentralized bounty platform with token escrow, worker assignment, event streaming,
              and a responsive dashboard built for Freighter wallets.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-muted sm:grid-cols-3 md:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">Custom token</div>
            <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">Soroban events</div>
            <div className="rounded-2xl border border-white/10 bg-surface/70 p-4">Cross-contract calls</div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-white/10 bg-surface/60 p-6 shadow-glow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Active bounties</h2>
              <p className="mt-1 text-sm text-muted">Responsive cards ready for chain data.</p>
            </div>
            <a
              href="/create"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Create bounty
            </a>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sampleBounties.map((bounty) => (
              <article
                key={bounty.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:bg-white/8"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.25em] text-accent2">#{bounty.id}</p>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted">
                    {bounty.status}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold">{bounty.title}</h3>
                <p className="mt-2 text-sm text-muted">{bounty.reward}</p>
                <a
                  href={`/bounties/${bounty.id}`}
                  className="mt-5 inline-flex text-sm font-medium text-accent"
                >
                  View details
                </a>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <h2 className="text-xl font-semibold">Wallet</h2>
            <p className="mt-2 text-sm text-muted">
              Freighter connection, token balance, and network selection will live here.
            </p>
            <button className="mt-5 rounded-full border border-accent/40 px-4 py-2 text-sm font-medium text-accent transition hover:bg-accent/10">
              Connect Freighter
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
            <h2 className="text-xl font-semibold">Live events</h2>
            <p className="mt-2 text-sm text-muted">Ready for bounty_created and bounty_paid streams.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

