import Link from "next/link";

const highlights = [
  {
    title: "Open marketplace",
    description: "Browse live bounties that are still available to accept.",
  },
  {
    title: "Clear lifecycle",
    description: "Track accepted, completed, and paid work from dedicated pages.",
  },
  {
    title: "Wallet-first",
    description: "Freighter integration keeps the whole flow on-chain and testnet-ready.",
  },
];

const steps = [
  "Post a bounty in XLM with one wallet.",
  "Let a worker accept and complete the task.",
  "Approve payout and settle automatically on chain.",
];

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 px-6 py-12 shadow-glow md:px-10 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(82,215,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(0,255,170,0.10),transparent_30%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.45em] text-accent2">BountyChain on Stellar</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
              Launch and manage bounties with a clean on-chain workflow.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted md:text-lg">
              BountyChain is a Stellar Soroban bounty marketplace for posting tasks, accepting work,
              and paying out XLM from a professional wallet-first interface.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
              >
                Explore Marketplace
              </Link>
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-text transition hover:bg-white/5"
              >
                Create Bounty
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => (
                <article key={item.title} className="rounded-2xl border border-white/10 bg-background/50 p-4">
                  <h2 className="text-sm font-semibold text-text">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.description}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-background/60 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.35em] text-accent2">How it works</p>
            <div className="mt-5 space-y-4">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-muted">{step}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/10 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-accent2">Testnet ready</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Connect Freighter, browse open bounties, and move through active and completed work
                without leaving the app.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <Link href="/marketplace" className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:bg-white/10">
          <p className="text-xs uppercase tracking-[0.35em] text-accent2">Marketplace</p>
          <h2 className="mt-3 text-xl font-semibold text-text">Browse open bounties</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            See only the bounties that are ready to accept. Great for workers looking for new tasks.
          </p>
        </Link>

        <Link href="/active" className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:bg-white/10">
          <p className="text-xs uppercase tracking-[0.35em] text-accent2">Active</p>
          <h2 className="mt-3 text-xl font-semibold text-text">Track accepted work</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Follow bounties in progress, submit work, and keep the creator and worker roles clear.
          </p>
        </Link>

        <Link href="/completed" className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:bg-white/10">
          <p className="text-xs uppercase tracking-[0.35em] text-accent2">Completed</p>
          <h2 className="mt-3 text-xl font-semibold text-text">Review finished payouts</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Keep a clean audit trail of submitted and paid bounties for demos and presentation flow.
          </p>
        </Link>
      </section>
    </main>
  );
}
