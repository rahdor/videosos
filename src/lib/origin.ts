"use client";

import {
  type Auth,
  LicenseType,
  createLicenseTerms,
} from "@campnetwork/origin";

// IPFS types (match SDK internal types)
export type IpfsPinningProvider = "pinata" | "infura" | "web3storage";

export type IpfsCredentials = {
  provider: IpfsPinningProvider;
  apiKey?: string;
  apiSecret?: string;
  jwt?: string;
  token?: string;
  projectId?: string;
  projectSecret?: string;
};

// Store auth instance globally for access outside React context
let authInstance: Auth | null = null;

export function getOriginAuth(): Auth | null {
  return authInstance;
}

export function setOriginAuth(auth: Auth): void {
  authInstance = auth;
}

export function clearOriginAuth(): void {
  authInstance = null;
}

// Simplified license terms for our UI
export type SimpleLicenseTerms = {
  price: bigint;
  duration: number; // In seconds (0 for single payment)
  royaltyBps: number; // Basis points (0-10000, e.g., 1000 = 10%)
  paymentToken: `0x${string}`; // Address
};

export const DEFAULT_LICENSE_TERMS: SimpleLicenseTerms = {
  price: BigInt(0),
  duration: 0,
  royaltyBps: 1000, // 10%
  paymentToken: "0x0000000000000000000000000000000000000000",
};

// Origin metadata stored with imported media items
export type OriginMetadata = {
  name: string;
  description: string;
  license: SimpleLicenseTerms;
  mintedBy: string;
  parentIds?: string[];
};

// Helper to mint a file as an IpNFT
export async function mintOriginFile(
  file: File | Blob,
  metadata: {
    name: string;
    description: string;
    attributes?: Record<string, string>;
  },
  license: SimpleLicenseTerms,
  parentIds?: string[],
  options?: {
    previewImage?: Blob | null;
    onProgress?: (percent: number) => void;
  },
): Promise<string> {
  const auth = getOriginAuth();
  if (!auth) {
    throw new Error(
      "Origin authentication required. Please connect your wallet.",
    );
  }

  if (!auth.origin) {
    throw new Error("Origin not initialized. Please reconnect your wallet.");
  }

  // Convert Blob to File if needed
  const fileToMint =
    file instanceof File
      ? file
      : new File([file], "video.mp4", { type: "video/mp4" });

  // Prepare metadata object
  const metadataObj: Record<string, unknown> = {
    name: metadata.name,
    description: metadata.description,
  };
  if (metadata.attributes) {
    metadataObj.attributes = metadata.attributes;
  }

  // Create license terms using SDK helper
  const licenseTerms = createLicenseTerms(
    license.price,
    license.duration,
    license.royaltyBps,
    license.paymentToken,
    LicenseType.DURATION_BASED,
  );

  // Convert parent IDs to bigint array (max 8 parents supported)
  const parents =
    parentIds && parentIds.length > 0
      ? parentIds.slice(0, 8).map((id) => BigInt(id))
      : undefined;

  // Convert preview blob to File if provided
  let previewFile: File | null = null;
  if (options?.previewImage) {
    previewFile = new File([options.previewImage], "thumbnail.jpg", {
      type: "image/jpeg",
    });
  }

  console.log(
    "[Origin] Minting file:",
    fileToMint.name,
    "License:",
    licenseTerms,
    "Preview:",
    previewFile ? "yes" : "no",
  );

  const result = await auth.origin.mintFile(
    fileToMint,
    metadataObj,
    licenseTerms,
    parents,
    {
      forceIpfs: true,
      previewImage: previewFile,
    },
  );

  console.log("[Origin] Mint result:", result);

  if (!result) {
    throw new Error("Minting failed - no token ID returned");
  }

  return result;
}

// Helper to fetch Origin asset data by token ID
export async function getOriginAsset(tokenId: string): Promise<{
  url: string;
  metadata: Record<string, unknown>;
  license: SimpleLicenseTerms;
  hasAccess: boolean;
  owner: string;
}> {
  const auth = getOriginAuth();
  if (!auth) {
    throw new Error(
      "Origin authentication required. Please connect your wallet.",
    );
  }

  if (!auth.origin) {
    throw new Error("Origin not initialized. Please reconnect your wallet.");
  }

  const data = await auth.origin.getData(BigInt(tokenId));
  const terms = await auth.origin.getTerms(BigInt(tokenId));
  const owner = await auth.origin.ownerOf(BigInt(tokenId));

  // Check if current user has access
  let hasAccess = false;
  try {
    const walletAddress = auth.walletAddress;
    if (walletAddress && auth.origin) {
      // hasAccess(user, tokenId)
      hasAccess = await auth.origin.hasAccess(
        walletAddress as `0x${string}`,
        BigInt(tokenId),
      );
    }
  } catch {
    hasAccess = false;
  }

  return {
    url: (data as { url?: string })?.url || "",
    metadata: data || {},
    license: {
      price: terms?.price || BigInt(0),
      duration: Number(terms?.duration || 0),
      royaltyBps: Number(terms?.royaltyBps || 0),
      paymentToken: (terms?.paymentToken ||
        "0x0000000000000000000000000000000000000000") as `0x${string}`,
    },
    hasAccess,
    owner: owner || "",
  };
}

// Helper to purchase access to an IpNFT
export async function buyOriginAccess(tokenId: string): Promise<void> {
  const auth = getOriginAuth();
  if (!auth) {
    throw new Error(
      "Origin authentication required. Please connect your wallet.",
    );
  }

  if (!auth.origin) {
    throw new Error("Origin not initialized. Please reconnect your wallet.");
  }

  await auth.origin.buyAccessSmart(BigInt(tokenId));
}

// Helper to check if user has access to an asset
export async function checkOriginAccess(
  tokenId: string,
  userAddress: string,
): Promise<boolean> {
  const auth = getOriginAuth();
  if (!auth) {
    throw new Error(
      "Origin authentication required. Please connect your wallet.",
    );
  }

  if (!auth.origin) {
    throw new Error("Origin not initialized. Please reconnect your wallet.");
  }

  // hasAccess(user, tokenId)
  return auth.origin.hasAccess(userAddress as `0x${string}`, BigInt(tokenId));
}

// Convert basis points to percentage for display
export function bpsToPercent(bps: number): number {
  return bps / 100;
}

// Convert percentage to basis points for storage
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

// Format wei to ETH for display
export function weiToEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(eth < 0.01 ? 6 : 4);
}

// Format ETH to wei for transactions
export function ethToWei(eth: number): bigint {
  return BigInt(Math.floor(eth * 1e18));
}

// IPFS Credentials Management
export async function saveUserIpfsCredentials(
  credentials: IpfsCredentials,
): Promise<void> {
  const auth = getOriginAuth();
  if (!auth?.origin) {
    throw new Error("Origin not initialized. Please connect your wallet.");
  }
  await auth.origin.saveIpfsCredentials(credentials);
}

export async function verifyUserIpfsCredentials(): Promise<{
  valid: boolean;
  error?: string;
}> {
  const auth = getOriginAuth();
  if (!auth?.origin) {
    throw new Error("Origin not initialized. Please connect your wallet.");
  }
  return auth.origin.verifyIpfsCredentials();
}

export async function deleteUserIpfsCredentials(): Promise<void> {
  const auth = getOriginAuth();
  if (!auth?.origin) {
    throw new Error("Origin not initialized. Please connect your wallet.");
  }
  await auth.origin.deleteIpfsCredentials();
}

export async function checkHasIpfsCredentials(): Promise<boolean> {
  const auth = getOriginAuth();
  if (!auth?.origin) {
    return false;
  }
  return auth.origin.hasIpfsCredentials();
}
