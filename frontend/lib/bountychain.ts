"use client";

import {
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import { Client } from "@stellar/stellar-sdk/contract";
import { Server } from "@stellar/stellar-sdk/rpc";
import {
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

export const DEFAULT_NETWORK_PASSPHRASE = Networks.TESTNET;
export const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
export const NATIVE_ASSET_CONTRACT_ID =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

export const BOUNTY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ID ??
  "CDYAO7KYUBMTCBZSSVT5ZHPFYNJ7GYTX4HTSD44CKCAYWW25BSPYGVVU";

export type BountyStatus = "OPEN" | "ACCEPTED" | "SUBMITTED" | "PAID";

export type BountyRecord = {
  id: number;
  creator: string;
  worker: string | null;
  reward: string;
  status: BountyStatus | string;
};

export type ChainSummary = {
  address: string;
  network: string;
  balance: string;
  xlmBalance: string;
  bountyCount: number;
};

type InvokeArgs = {
  contractId: string;
  functionName: string;
  args: any[];
  sourceAddress: string;
};

function createServer() {
  return new Server(DEFAULT_RPC_URL);
}

function toBigIntLike(value: string | number | bigint) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  return BigInt(value);
}

function toAddressValue(value: string) {
  return nativeToScVal(value, { type: "address" });
}

function toI128Value(value: string | number | bigint) {
  return nativeToScVal(toBigIntLike(value), { type: "i128" });
}

function toU64Value(value: string | number | bigint) {
  return nativeToScVal(toBigIntLike(value), { type: "u64" });
}

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (value && typeof value === "object" && "toString" in value) {
    return String(value);
  }
  return "";
}

function normalizeBounty(native: any): BountyRecord {
  const source = native ?? {};
  return {
    id: Number(source.id ?? 0),
    creator: asString(source.creator),
    worker: source.worker ? asString(source.worker) : null,
    reward: asString(source.reward ?? 0),
    status: asString(source.status ?? "OPEN"),
  };
}

async function buildInvocationTx({
  contractId,
  functionName,
  args,
  sourceAddress,
}: InvokeArgs) {
  const server = createServer();
  const account = await server.getAccount(sourceAddress);

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: DEFAULT_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.invokeContractFunction({
        contract: contractId,
        function: functionName,
        args: args as any,
      }),
    )
    .setTimeout(30)
    .build();
}

async function getBountyClient(sourceAddress: string) {
  return Client.from({
    contractId: BOUNTY_CONTRACT_ID,
    rpcUrl: DEFAULT_RPC_URL,
    networkPassphrase: DEFAULT_NETWORK_PASSPHRASE,
    publicKey: sourceAddress,
    signTransaction,
  });
}

type BountyContractClient = {
  create_bounty: (args: { creator: string; reward: bigint }) => Promise<any>;
  accept_bounty: (args: { id: bigint; worker: string }) => Promise<any>;
  submit_bounty: (args: { id: bigint; worker: string }) => Promise<any>;
  approve_bounty: (args: { id: bigint; creator: string }) => Promise<any>;
};

async function simulateRead<T>({
  contractId,
  functionName,
  args,
  sourceAddress,
}: InvokeArgs): Promise<T> {
  const tx = await buildInvocationTx({
    contractId,
    functionName,
    args,
    sourceAddress,
  });

  const server = createServer();
  const simulation = await server.simulateTransaction(tx);
  if ("error" in simulation && simulation.error) {
    throw new Error(String(simulation.error));
  }

  if (!("result" in simulation) || !simulation.result) {
    throw new Error("Simulation did not return a result");
  }

  return scValToNative(simulation.result.retval) as T;
}

export async function connectWallet() {
  const connected = await isConnected();
  if (connected.error) {
    throw new Error(connected.error);
  }

  if (connected.isConnected) {
    const account = await getAddress();
    if (account.error) {
      throw new Error(account.error);
    }
    if (!account.address) {
      throw new Error(
        "Freighter is installed, but this Vercel domain is not connected yet. Open Freighter and approve this site in Connected Apps, then try again.",
      );
    }

    return account.address;
  }

  const access = await requestAccess();
  if (access.error) {
    throw new Error(access.error);
  }
  if (!access.address) {
    throw new Error(
      "Freighter did not return an address. Please approve this Vercel domain in Freighter and reconnect.",
    );
  }

  return access.address;
}

export async function getWalletNetwork() {
  const details = await getNetworkDetails();
  if (details.error) {
    throw new Error(details.error);
  }

  return details;
}

export async function readTokenBalance(address: string) {
  const value = await simulateRead<unknown>({
    contractId: NATIVE_ASSET_CONTRACT_ID,
    functionName: "balance",
    args: [toAddressValue(address)],
    sourceAddress: address,
  });

  return asString(value);
}

export async function readBountyCount(address: string) {
  const bounties = await simulateRead<unknown[]>({
    contractId: BOUNTY_CONTRACT_ID,
    functionName: "list_bounties",
    args: [],
    sourceAddress: address,
  });

  return Array.isArray(bounties) ? bounties.length : 0;
}

export async function readBounties(address: string) {
  const bounties = await simulateRead<unknown[]>({
    contractId: BOUNTY_CONTRACT_ID,
    functionName: "list_bounties",
    args: [],
    sourceAddress: address,
  });

  if (!Array.isArray(bounties) || bounties.length === 0) {
    return [] as BountyRecord[];
  }

  return bounties.map(normalizeBounty);
}

export async function readBounty(address: string, bountyId: number) {
  const bounty = await simulateRead<unknown>({
    contractId: BOUNTY_CONTRACT_ID,
    functionName: "get_bounty",
    args: [toU64Value(bountyId)],
    sourceAddress: address,
  });

  return normalizeBounty(bounty);
}

export async function readBountySafe(address: string, bountyId: number) {
  try {
    return await readBounty(address, bountyId);
  } catch {
    return null;
  }
}

export async function createBounty(sourceAddress: string, reward: string | number) {
  const client = (await getBountyClient(sourceAddress)) as unknown as BountyContractClient;
  const tx = await client.create_bounty({
    creator: sourceAddress,
    reward: BigInt(reward),
  });
  const sent = await tx.signAndSend({ signTransaction, force: true });

  return {
    status: sent.sendTransactionResponse?.status ?? "PENDING",
    hash: sent.sendTransactionResponse?.hash ?? "",
    errorResultXdr: "",
  };
}

export async function acceptBounty(
  sourceAddress: string,
  bountyId: number,
  workerAddress?: string,
) {
  const worker = workerAddress ?? sourceAddress;
  const client = (await getBountyClient(sourceAddress)) as unknown as BountyContractClient;
  const tx = await client.accept_bounty({
    id: BigInt(bountyId),
    worker,
  });
  const sent = await tx.signAndSend({ signTransaction, force: true });

  return {
    status: sent.sendTransactionResponse?.status ?? "PENDING",
    hash: sent.sendTransactionResponse?.hash ?? "",
    errorResultXdr: "",
  };
}

export async function submitBounty(
  sourceAddress: string,
  bountyId: number,
  workerAddress?: string,
) {
  const worker = workerAddress ?? sourceAddress;
  const client = (await getBountyClient(sourceAddress)) as unknown as BountyContractClient;
  const tx = await client.submit_bounty({
    id: BigInt(bountyId),
    worker,
  });
  const sent = await tx.signAndSend({ signTransaction, force: true });

  return {
    status: sent.sendTransactionResponse?.status ?? "PENDING",
    hash: sent.sendTransactionResponse?.hash ?? "",
    errorResultXdr: "",
  };
}

export async function approveBounty(
  sourceAddress: string,
  bountyId: number,
  creatorAddress?: string,
) {
  const creator = creatorAddress ?? sourceAddress;
  const client = (await getBountyClient(sourceAddress)) as unknown as BountyContractClient;
  const tx = await client.approve_bounty({
    id: BigInt(bountyId),
    creator,
  });
  const sent = await tx.signAndSend({ signTransaction, force: true });

  return {
    status: sent.sendTransactionResponse?.status ?? "PENDING",
    hash: sent.sendTransactionResponse?.hash ?? "",
    errorResultXdr: "",
  };
}
