export default function CreatePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow md:p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Create</p>
        <h1 className="mt-3 text-3xl font-semibold">Create a bounty</h1>
        <p className="mt-2 text-sm text-muted">
          This form is wired for the chain flow: creator auth, escrow transfer, and event publishing.
        </p>

        <form className="mt-8 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm text-muted">Title</span>
            <input
              className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 outline-none ring-0 placeholder:text-muted/60"
              placeholder="Design landing page"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-muted">Reward</span>
            <input
              className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 outline-none ring-0 placeholder:text-muted/60"
              placeholder="250"
              type="number"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-muted">Description</span>
            <textarea
              className="min-h-40 rounded-2xl border border-white/10 bg-background/80 px-4 py-3 outline-none ring-0 placeholder:text-muted/60"
              placeholder="Describe the bounty clearly."
            />
          </label>
          <button className="mt-2 rounded-full bg-accent px-5 py-3 font-medium text-background">
            Publish bounty
          </button>
        </form>
      </section>
    </main>
  );
}

