import { Prisma } from "@prisma/client";

const DEFAULT_TRONGRID_BASE_URL = "https://api.trongrid.io";
const DEFAULT_USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const USDT_DECIMALS = 6;

type TronGridTrc20Response = {
  data?: TronGridTrc20Transfer[];
};

type TronGridTrc20Transfer = {
  transaction_id?: string;
  to?: string;
  from?: string;
  value?: string;
  block_timestamp?: number;
  token_info?: {
    address?: string;
    decimals?: number;
    symbol?: string;
  };
};

type VerifiedTronTransfer = {
  amountUsdt: Prisma.Decimal;
  contractAddress: string;
  toAddress: string;
  transactionId: string;
};

export type TronVerificationResult =
  | { status: "configured"; verified: true; transfer: VerifiedTronTransfer }
  | { status: "unconfigured"; verified: false }
  | { status: "not_found"; verified: false }
  | { status: "mismatch"; verified: false; reason: "amount" | "contract" | "recipient"; transfer: VerifiedTronTransfer }
  | { status: "network_error"; verified: false };

function configuredValue(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned && !cleaned.toLowerCase().includes("replace-with") ? cleaned : "";
}

export function getTronPaymentConfig() {
  const walletAddress = configuredValue(process.env.QIDRA_TRON_WALLET_ADDRESS);
  const apiKey = configuredValue(process.env.TRONGRID_API_KEY);
  const baseUrl = configuredValue(process.env.TRONGRID_API_BASE_URL) || DEFAULT_TRONGRID_BASE_URL;
  const usdtContractAddress = configuredValue(process.env.QIDRA_USDT_TRC20_CONTRACT) || DEFAULT_USDT_TRC20_CONTRACT;

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ""),
    enabled: Boolean(walletAddress && apiKey),
    usdtContractAddress,
    walletAddress,
    walletConfigured: Boolean(walletAddress)
  };
}

export function getPublicTronPaymentConfig() {
  const config = getTronPaymentConfig();

  return {
    network: "TRC20",
    usdtContractAddress: config.usdtContractAddress,
    walletAddress: config.walletAddress,
    walletConfigured: config.walletConfigured
  };
}

export async function verifyTrc20Deposit(txHash: string, expectedAmount: Prisma.Decimal): Promise<TronVerificationResult> {
  const config = getTronPaymentConfig();

  if (!config.enabled) {
    return { status: "unconfigured", verified: false };
  }

  try {
    const transfer = await findTrc20Transfer(txHash);

    if (!transfer) {
      return { status: "not_found", verified: false };
    }

    if (transfer.contractAddress !== config.usdtContractAddress) {
      return { status: "mismatch", verified: false, reason: "contract", transfer };
    }

    if (transfer.toAddress !== config.walletAddress) {
      return { status: "mismatch", verified: false, reason: "recipient", transfer };
    }

    if (!transfer.amountUsdt.equals(expectedAmount)) {
      return { status: "mismatch", verified: false, reason: "amount", transfer };
    }

    return { status: "configured", verified: true, transfer };
  } catch {
    return { status: "network_error", verified: false };
  }
}

async function findTrc20Transfer(txHash: string) {
  const config = getTronPaymentConfig();
  const params = new URLSearchParams({
    only_confirmed: "true",
    only_to: "true",
    limit: "200",
    contract_address: config.usdtContractAddress
  });
  const response = await fetchTronGrid<TronGridTrc20Response>(`/v1/accounts/${encodeURIComponent(config.walletAddress)}/transactions/trc20?${params}`);
  const normalizedHash = txHash.trim().toLowerCase();
  const transfer = response.data?.find((item) => item.transaction_id?.toLowerCase() === normalizedHash);

  if (!transfer?.transaction_id || !transfer.to || !transfer.value) {
    return null;
  }

  const decimals = transfer.token_info?.decimals ?? USDT_DECIMALS;

  return {
    amountUsdt: new Prisma.Decimal(transfer.value).div(new Prisma.Decimal(10).pow(decimals)),
    contractAddress: transfer.token_info?.address ?? config.usdtContractAddress,
    toAddress: transfer.to,
    transactionId: transfer.transaction_id
  };
}

async function fetchTronGrid<T>(path: string) {
  const config = getTronPaymentConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "TRON-PRO-API-KEY": config.apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`TronGrid request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}
