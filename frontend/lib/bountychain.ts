"use client";

import {
  BASE_FEE,
  Networks,
  Operation,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import {
  addToken,
  getAddress,
  getNetworkDetails,
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

export const DEFAULT_NETWORK_PASSPHRASE = Networks.TESTNET;
export const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";

export const TOKEN_CONTRACT_ID =
  process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ID ??
  "CBKIG4GDF32HPDT33JW5IVXLP474VOCGSSQFVD4GYTH4QA4UDD2U5NOK";

export const BOUNTY_CONTRACT_ID =
  process.env.NEXT_PUBLIC_BOUNTY_CONTRACT_ID ??
  "CB2SSVQVWBEHPEMDERFIEBD654ARF3ADFMQGHPJRXZCII3VYJ6KKG3RE";

export type BountyStatus = "OPEN" | "ACCEPTED" | "COMPLETED" | "PAID";

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
  tokenBalance: string;
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

async function signAndSubmit(tx: any, sourceAddress: string) {
  const server = createServer();
  const prepared = await server.prepareTransaction(tx);
  const signed = await signTransaction(prepared.toEnvelope().toXDR("base64"), {
    networkPassphrase: DEFAULT_NETWORK_PASSPHRASE,
    address: sourceAddress,
  });

  if (signed.error) {
    throw new Error(signed.error);
  }

  const signedTx = TransactionBuilder.fromXDR(
    signed.signedTxXdr,
    DEFAULT_NETWORK_PASSPHRASE,
  ) as any;

  const response = await server.sendTransaction(signedTx);
  if (response.status === "ERROR") {
    throw new Error(String(response.errorResult ?? "Transaction failed"));
  }

  return response;
}

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

    return account.address;
  }

  const access = await requestAccess();
  if (access.error) {
    throw new Error(access.error);
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

export async function addTokenToFreighterWallet() {
  const connected = await isConnected();
  if (!connected.isConnected) {
    throw new Error("Connect Freighter first");
  }

  const result = await addToken({
    contractId: TOKEN_CONTRACT_ID,
    networkPassphrase: DEFAULT_NETWORK_PASSPHRASE,
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return result.contractId;
}

export async function readTokenBalance(address: string) {
  const value = await simulateRead<unknown>({
    contractId: TOKEN_CONTRACT_ID,
    functionName: "balance_of",
    args: [toAddressValue(address)],
    sourceAddress: address,
  });

  return asString(value);
}

export async function readBountyCount(address: string) {
  const ids = await simulateRead<unknown[]>({
    contractId: BOUNTY_CONTRACT_ID,
    functionName: "list_bounties",
    args: [],
    sourceAddress: address,
  });

  return Array.isArray(ids) ? ids.length : 0;
}

export async function readBounties(address: string) {
  const ids = await simulateRead<unknown[]>({
    contractId: BOUNTY_CONTRACT_ID,
    functionName: "list_bounties",
    args: [],
    sourceAddress: address,
  });

  if (!Array.isArray(ids) || ids.length === 0) {
    return [] as BountyRecord[];
  }

  const bountyIds = ids.map((id) => Number(id));
  const records = await Promise.all(
    bountyIds.map(async (id) => {
      const bounty = await simulateRead<unknown>({
        contractId: BOUNTY_CONTRACT_ID,
        functionName: "get_bounty",
        args: [toU64Value(id)],
        sourceAddress: address,
      });

      return normalizeBounty(bounty);
    }),
  );

  return records;
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

export async function createBounty(sourceAddress: string, reward: string | number) {
  return signAndSubmit(
    await buildInvocationTx({
      contractId: BOUNTY_CONTRACT_ID,
      functionName: "create_bounty",
      args: [toAddressValue(sourceAddress), toI128Value(reward)],
      sourceAddress,
    }),
    sourceAddress,
  );
}

export async function acceptBounty(
  sourceAddress: string,
  bountyId: number,
  workerAddress?: string,
) {
  const worker = workerAddress ?? sourceAddress;

  return signAndSubmit(
    await buildInvocationTx({
      contractId: BOUNTY_CONTRACT_ID,
      functionName: "accept_bounty",
      args: [toU64Value(bountyId), toAddressValue(worker)],
      sourceAddress,
    }),
    sourceAddress,
  );
}

export async function submitBounty(
  sourceAddress: string,
  bountyId: number,
  workerAddress?: string,
) {
  const worker = workerAddress ?? sourceAddress;

  return signAndSubmit(
    await buildInvocationTx({
      contractId: BOUNTY_CONTRACT_ID,
      functionName: "submit_bounty",
      args: [toU64Value(bountyId), toAddressValue(worker)],
      sourceAddress,
    }),
    sourceAddress,
  );
}

export async function approveBounty(
  sourceAddress: string,
  bountyId: number,
  creatorAddress?: string,
) {
  const creator = creatorAddress ?? sourceAddress;

  return signAndSubmit(
    await buildInvocationTx({
      contractId: BOUNTY_CONTRACT_ID,
      functionName: "approve_bounty",
      args: [toU64Value(bountyId), toAddressValue(creator)],
      sourceAddress,
    }),
    sourceAddress,
  );
}

export async function mintToken(
  sourceAddress: string,
  recipientAddress: string,
  amount: string | number,
) {
  return signAndSubmit(
    await buildInvocationTx({
      contractId: TOKEN_CONTRACT_ID,
      functionName: "mint",
      args: [toAddressValue(recipientAddress), toI128Value(amount)],
      sourceAddress,
    }),
    sourceAddress,
  );
}
