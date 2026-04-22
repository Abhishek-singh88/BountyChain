"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  acceptBounty,
  addTokenToFreighterWallet,
  approveBounty,
  BOUNTY_CONTRACT_ID,
  connectWallet,
  createBounty,
  getWalletNetwork,
  mintToken,
  readBounties,
  readBounty,
  readBountyCount,
  readTokenBalance,
  submitBounty,
  TOKEN_CONTRACT_ID,
  type BountyRecord,
} from "@/lib/bountychain";

type Props = {
  bountyId?: string;
  focus?: "home" | "create" | "detail";
};

type Toast = {
  kind: "idle" | "success" | "error";
  message: string;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function statusClass(status: string) {
  if (status === "OPEN") return "border-accent/30 bg-accent/10 text-accent";
  if (status === "ACCEPTED") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  if (status === "COMPLETED") return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  if (status === "PAID") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  return "border-white/10 bg-white/5 text-muted";
}

function Card({
  title,
  children,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text md:text-xl">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function BountyChainApp({ bountyId, focus = "home" }: Props) {
  const [walletAddress, setWalletAddress] = useState("");
  const [networkName, setNetworkName] = useState("TESTNET");
  const [networkPassphrase, setNetworkPassphrase] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [bountyCount, setBountyCount] = useState(0);
  const [bounties, setBounties] = useState<BountyRecord[]>([]);
  const [selectedBounty, setSelectedBounty] = useState<BountyRecord | null>(null);
  const [reward, setReward] = useState("100");
  const [mintAmount, setMintAmount] = useState("1000");
  const [mintRecipient, setMintRecipient] = useState("");
  const [lookupId, setLookupId] = useState(bountyId ?? "");
  const [workerAddress, setWorkerAddress] = useState("");
  const [creatorAddress, setCreatorAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast>({ kind: "idle", message: "" });
  const [lastTxHash, setLastTxHash] = useState("");

  const isConnectedWallet = walletAddress.length > 0;
  async function refreshChainState(address: string) {
    const [balance, count, list, details] = await Promise.all([
      readTokenBalance(address),
      readBountyCount(address),
      readBounties(address),
      getWalletNetwork(),
    ]);

    setTokenBalance(balance);
    setBountyCount(count);
    setBounties(list);
    setNetworkName(details.network);
    setNetworkPassphrase(details.networkPassphrase);

    if (bountyId) {
      const bounty = await readBounty(address, Number(bountyId));
      setSelectedBounty(bounty);
      setLookupId(bountyId);
    } else if (lookupId) {
      const bounty = await readBounty(address, Number(lookupId));
      setSelectedBounty(bounty);
    } else {
      setSelectedBounty(list[0] ?? null);
    }
  }

  useEffect(() => {
    if (bountyId) {
      setLookupId(bountyId);
    }
  }, [bountyId]);

  useEffect(() => {
    if (walletAddress) {
      void refreshChainState(walletAddress).catch((error: unknown) => {
        setToast({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to refresh chain state",
        });
      });
    }
  }, [walletAddress, bountyId]);

  useEffect(() => {
    if (!mintRecipient && walletAddress) {
      setMintRecipient(walletAddress);
    }
    if (!workerAddress && walletAddress) {
      setWorkerAddress(walletAddress);
    }
    if (!creatorAddress && walletAddress) {
      setCreatorAddress(walletAddress);
    }
  }, [walletAddress, mintRecipient, workerAddress, creatorAddress]);

  async function handleConnect() {
    setBusy(true);
    setToast({ kind: "idle", message: "" });

    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setMintRecipient(address);
      setWorkerAddress(address);
      setCreatorAddress(address);
      await refreshChainState(address);
      setToast({
        kind: "success",
        message: `Connected ${shortAddress(address)}.`,
      });
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to connect wallet",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddToken() {
    if (!walletAddress) {
      setToast({ kind: "error", message: "Connect Freighter first." });
      return;
    }

    setBusy(true);
    try {
      await addTokenToFreighterWallet();
      setToast({
        kind: "success",
        message: "BOUNTY token was added to Freighter.",
      });
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to add token",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleMint() {
    if (!walletAddress) {
      setToast({ kind: "error", message: "Connect your admin wallet first." });
      return;
    }

    setBusy(true);
    try {
      const response = await mintToken(walletAddress, mintRecipient || walletAddress, mintAmount);
      setLastTxHash(response.hash);
      setToast({
        kind: "success",
        message: "BOUNTY tokens minted successfully.",
      });
      await refreshChainState(walletAddress);
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Mint failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateBounty() {
    if (!walletAddress) {
      setToast({ kind: "error", message: "Connect your creator wallet first." });
      return;
    }

    setBusy(true);
    try {
      const response = await createBounty(walletAddress, reward);
      setLastTxHash(response.hash);
      setToast({
        kind: "success",
        message: "Bounty created and escrowed on chain.",
      });
      await refreshChainState(walletAddress);
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Create bounty failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleLookup() {
    if (!walletAddress || !lookupId) {
      return;
    }

    setBusy(true);
    try {
      const bounty = await readBounty(walletAddress, Number(lookupId));
      setSelectedBounty(bounty);
      setToast({ kind: "success", message: `Loaded bounty #${lookupId}.` });
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not load bounty",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept(id: number) {
    if (!walletAddress) {
      setToast({ kind: "error", message: "Connect the worker wallet first." });
      return;
    }

    setBusy(true);
    try {
      const response = await acceptBounty(walletAddress, id, workerAddress || walletAddress);
      setLastTxHash(response.hash);
      setToast({ kind: "success", message: `Bounty #${id} accepted.` });
      await refreshChainState(walletAddress);
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Accept failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(id: number) {
    if (!walletAddress) {
      setToast({ kind: "error", message: "Connect the worker wallet first." });
      return;
    }

    setBusy(true);
    try {
      const response = await submitBounty(walletAddress, id, workerAddress || walletAddress);
      setLastTxHash(response.hash);
      setToast({ kind: "success", message: `Bounty #${id} marked complete.` });
      await refreshChainState(walletAddress);
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Submit failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove(id: number) {
    if (!walletAddress) {
      setToast({ kind: "error", message: "Connect the creator wallet first." });
      return;
    }

    setBusy(true);
    try {
      const response = await approveBounty(walletAddress, id, creatorAddress || walletAddress);
      setLastTxHash(response.hash);
      setToast({ kind: "success", message: `Bounty #${id} paid out.` });
      await refreshChainState(walletAddress);
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Approval failed",
      });
    } finally {
      setBusy(false);
    }
  }

  const heroTitle =
    focus === "create"
      ? "Create and fund a bounty from Freighter."
      : focus === "detail"
        ? "Review bounty status and move funds on testnet."
        : "Ship bounties on Stellar with automatic payouts.";

  const heroSubtitle =
    focus === "create"
      ? "Use your connected wallet to mint, escrow, and publish rewards on chain."
      : focus === "detail"
        ? "Open a bounty, accept it, submit the work, and approve the payout from the same app."
        : "A decentralized bounty platform with token escrow, worker assignment, and a responsive wallet-first UI.";

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.4em] text-accent2">BountyChain</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted md:text-lg">
              {heroSubtitle}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleConnect}
              disabled={busy}
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {walletAddress ? "Reconnect Freighter" : "Connect Freighter"}
            </button>
            <button
              onClick={handleAddToken}
              disabled={busy || !walletAddress}
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-text transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add BOUNTY token
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 text-sm text-muted sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-surface/60 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-accent2">Wallet</div>
            <div className="mt-2 font-medium text-text">
              {walletAddress ? shortAddress(walletAddress) : "Not connected"}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface/60 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-accent2">Network</div>
            <div className="mt-2 font-medium text-text">{networkName}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface/60 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-accent2">Token balance</div>
            <div className="mt-2 font-medium text-text">{tokenBalance} BOUNTY</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface/60 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-accent2">Bounties</div>
            <div className="mt-2 font-medium text-text">{bountyCount}</div>
          </div>
        </div>

        {toast.kind !== "idle" ? (
          <div
            className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
              toast.kind === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                : "border-rose-400/20 bg-rose-400/10 text-rose-100"
            }`}
          >
            {toast.message}
          </div>
        ) : null}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-6">
          <Card title="Create bounty" subtitle="Creator signs, tokens escrow, and the bounty appears instantly.">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-muted">Reward amount</span>
                <input
                  value={reward}
                  onChange={(event) => setReward(event.target.value)}
                  type="number"
                  min="1"
                  className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 outline-none placeholder:text-muted/60"
                  placeholder="100"
                />
              </label>
              <button
                onClick={handleCreateBounty}
                disabled={busy || !isConnectedWallet}
                className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Publish bounty
              </button>
            </div>
          </Card>

          <Card title="Mint admin tokens" subtitle="Use the admin wallet to seed BOUNTY for bounty creation.">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm text-muted">Recipient</span>
                <input
                  value={mintRecipient}
                  onChange={(event) => setMintRecipient(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 outline-none placeholder:text-muted/60"
                  placeholder="G..."
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm text-muted">Amount</span>
                <input
                  value={mintAmount}
                  onChange={(event) => setMintAmount(event.target.value)}
                  type="number"
                  min="1"
                  className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 outline-none placeholder:text-muted/60"
                  placeholder="1000"
                />
              </label>
            </div>
            <button
              onClick={handleMint}
              disabled={busy || !isConnectedWallet}
              className="mt-4 rounded-full border border-accent/30 px-5 py-3 text-sm font-semibold text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Mint BOUNTY
            </button>
          </Card>

          <Card title="Live bounties" subtitle="Chain data pulled from Soroban RPC and refreshed after every action.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {bounties.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-muted md:col-span-2 xl:col-span-3">
                  No bounties found yet. Create one to populate the dashboard.
                </div>
              ) : (
                bounties.map((bounty) => (
                  <article
                    key={bounty.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-1 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.25em] text-accent2">#{bounty.id}</p>
                      <span className={`rounded-full border px-3 py-1 text-xs ${statusClass(bounty.status)}`}>
                        {bounty.status}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted">
                      <div>Creator: {shortAddress(bounty.creator)}</div>
                      <div>Worker: {bounty.worker ? shortAddress(bounty.worker) : "Unassigned"}</div>
                      <div>Reward: {bounty.reward} BOUNTY</div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedBounty(bounty);
                          setLookupId(String(bounty.id));
                        }}
                        className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-text transition hover:bg-white/5"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleAccept(bounty.id)}
                        disabled={busy || !walletAddress}
                        className="rounded-full border border-accent/20 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Accept
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card title="Lookup bounty" subtitle="Jump straight to a bounty by ID and run the lifecycle from one panel.">
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-muted">Bounty ID</span>
                <input
                  value={lookupId}
                  onChange={(event) => setLookupId(event.target.value)}
                  type="number"
                  min="1"
                  className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 outline-none placeholder:text-muted/60"
                  placeholder="1"
                />
              </label>
              <button
                onClick={handleLookup}
                disabled={busy || !walletAddress}
                className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-text transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Load bounty
              </button>
            </div>
          </Card>

          <Card title="Bounty detail" subtitle={selectedBounty ? `Tracking bounty #${selectedBounty.id}` : "Select a bounty to inspect it here."}>
            {selectedBounty ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-accent2">Status</div>
                    <div className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs ${statusClass(selectedBounty.status)}`}>
                      {selectedBounty.status}
                    </div>
                  </div>
                  <Link
                    href={`/bounties/${selectedBounty.id}`}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-text transition hover:bg-white/5"
                  >
                    Open page
                  </Link>
                </div>

                <div className="grid gap-3 rounded-2xl border border-white/10 bg-background/40 p-4 text-sm text-muted">
                  <div>Creator: {selectedBounty.creator}</div>
                  <div>Worker: {selectedBounty.worker ?? "Unassigned"}</div>
                  <div>Reward: {selectedBounty.reward} BOUNTY</div>
                  <div>Contract: {BOUNTY_CONTRACT_ID.slice(0, 12)}...</div>
                  <div>Token: {TOKEN_CONTRACT_ID.slice(0, 12)}...</div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    onClick={() => handleAccept(selectedBounty.id)}
                    disabled={busy || !walletAddress}
                    className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 text-sm font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Accept bounty
                  </button>
                  <button
                    onClick={() => handleSubmit(selectedBounty.id)}
                    disabled={busy || !walletAddress}
                    className="rounded-2xl border border-white/10 bg-background/80 px-4 py-3 text-sm font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Submit work
                  </button>
                  <button
                    onClick={() => handleApprove(selectedBounty.id)}
                    disabled={busy || !walletAddress}
                    className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve and pay
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-muted">
                Connect Freighter and load a bounty to see the full lifecycle panel.
              </div>
            )}
          </Card>

          <Card title="Connection details" subtitle="Use this section to keep the wallet and network in sync.">
            <div className="grid gap-3 text-sm text-muted">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-background/40 px-4 py-3">
                <span>RPC URL</span>
                <span className="text-text">Soroban Testnet</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-background/40 px-4 py-3">
                <span>Token contract</span>
                <span className="text-text">{TOKEN_CONTRACT_ID.slice(0, 10)}...</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-background/40 px-4 py-3">
                <span>Bounty contract</span>
                <span className="text-text">{BOUNTY_CONTRACT_ID.slice(0, 10)}...</span>
              </div>
              {lastTxHash ? (
                <div className="rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-accent2">
                  Last transaction: {lastTxHash}
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
