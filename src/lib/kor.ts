"use client";

import type { KorMetadata } from "@/data/schema";
import { ethers } from "ethers";
import { BASE_SEPOLIA_RPC, ERC721_READ_ABI, KOR_CONTRACTS } from "./contracts";
import { KorSDK } from "./kor-sdk";

// Re-export IPFS types from old system (keeping existing credential management)
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

// Singleton SDK instance
let korSDK: KorSDK | null = null;

export function getKorSDK(): KorSDK {
  if (!korSDK) {
    const apiKey = process.env.NEXT_PUBLIC_KOR_API_KEY;
    if (!apiKey) {
      throw new Error("NEXT_PUBLIC_KOR_API_KEY not configured");
    }
    korSDK = new KorSDK({
      apiKey,
      network:
        (process.env.NEXT_PUBLIC_KOR_NETWORK as "base-sepolia" | "base") ||
        "base-sepolia",
    });
  }
  return korSDK;
}

// Upload file to IPFS and return metadata URI
export async function uploadToIPFS(
  file: File | Blob,
  metadata: {
    name: string;
    description: string;
    attributes?: Record<string, string>;
  },
  credentials: IpfsCredentials,
): Promise<string> {
  // Upload file first
  const fileUri = await uploadFileToIPFS(file, credentials);

  // Create metadata JSON
  const metadataJson = {
    name: metadata.name,
    description: metadata.description,
    image: fileUri,
    animation_url: file.type.startsWith("video/") ? fileUri : undefined,
    attributes: metadata.attributes,
  };

  // Upload metadata
  const metadataBlob = new Blob([JSON.stringify(metadataJson)], {
    type: "application/json",
  });
  const metadataUri = await uploadFileToIPFS(metadataBlob, credentials);

  return metadataUri;
}

async function uploadFileToIPFS(
  file: File | Blob,
  credentials: IpfsCredentials,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  switch (credentials.provider) {
    case "pinata": {
      const res = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials.jwt}`,
          },
          body: formData,
        },
      );
      if (!res.ok) throw new Error("Pinata upload failed");
      const data = await res.json();
      return `ipfs://${data.IpfsHash}`;
    }
    case "infura": {
      const auth = btoa(
        `${credentials.projectId}:${credentials.projectSecret}`,
      );
      const res = await fetch("https://ipfs.infura.io:5001/api/v0/add", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Infura upload failed");
      const data = await res.json();
      return `ipfs://${data.Hash}`;
    }
    case "web3storage": {
      const res = await fetch("https://api.web3.storage/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.token}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Web3.storage upload failed");
      const data = await res.json();
      return `ipfs://${data.cid}`;
    }
    default:
      throw new Error(`Unknown IPFS provider: ${credentials.provider}`);
  }
}

// Query on-chain for token data (for imports)
export async function getKorAsset(tokenId: string): Promise<{
  metadataUri: string;
  owner: string;
  metadata: KorMetadata;
}> {
  const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
  const contract = new ethers.Contract(
    KOR_CONTRACTS.protocolCollection,
    ERC721_READ_ABI,
    provider,
  );

  const [tokenUri, owner] = await Promise.all([
    contract.tokenURI(tokenId),
    contract.ownerOf(tokenId),
  ]);

  // Fetch metadata from IPFS
  const metadataUrl = ipfsToHttp(tokenUri);
  const res = await fetch(metadataUrl);
  if (!res.ok) throw new Error("Failed to fetch metadata");
  const metadata = await res.json();

  return {
    metadataUri: tokenUri,
    owner,
    metadata: {
      name: metadata.name || `Kor Asset #${tokenId}`,
      description: metadata.description || "",
      image: metadata.image,
      animation_url: metadata.animation_url,
      owner,
    },
  };
}

// Convert IPFS URI to HTTP gateway URL
export function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  }
  return uri;
}

// IPFS Credentials Management (localStorage-based, same as before)
const IPFS_CREDENTIALS_KEY = "vrsns-ipfs-credentials";

export function saveIpfsCredentials(credentials: IpfsCredentials): void {
  localStorage.setItem(IPFS_CREDENTIALS_KEY, JSON.stringify(credentials));
}

export function getIpfsCredentials(): IpfsCredentials | null {
  const stored = localStorage.getItem(IPFS_CREDENTIALS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function deleteIpfsCredentials(): void {
  localStorage.removeItem(IPFS_CREDENTIALS_KEY);
}

export function hasIpfsCredentials(): boolean {
  return getIpfsCredentials() !== null;
}
