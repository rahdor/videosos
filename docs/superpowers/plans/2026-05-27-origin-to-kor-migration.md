# Origin to Kor Protocol Migration + VRSNS Rebrand

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate VideoSOS from Origin Protocol to Kor Protocol for IP NFT minting, and rebrand to VRSNS.

**Architecture:** Replace @campnetwork/origin with wagmi + RainbowKit for wallet connectivity and @kor-protocol/sdk for blockchain operations. Keep existing IPFS credential system. All mints go to Kor's protocol collection on Base Sepolia.

**Tech Stack:** Next.js 14, wagmi v2, viem, RainbowKit, @kor-protocol/sdk (local copy), ethers.js v5

---

## Task 1: Create Branch and Install Dependencies

**Files:**
- Modify: `package.json`
- Create: `.env.example` updates

- [ ] **Step 1: Create kor-migration branch**

```bash
git checkout -b kor-migration
```

- [ ] **Step 2: Install wagmi, viem, and RainbowKit**

```bash
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
```

Note: @tanstack/react-query is already installed but wagmi needs a specific version.

- [ ] **Step 3: Remove @campnetwork/origin**

```bash
npm uninstall @campnetwork/origin
```

- [ ] **Step 4: Update .env.example with new variables**

Add to `.env.example`:
```
# Kor Protocol
NEXT_PUBLIC_KOR_API_KEY=your-kor-api-key
NEXT_PUBLIC_KOR_NETWORK=base-sepolia

# WalletConnect (get from cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

- [ ] **Step 5: Update .env.local with actual values**

```
NEXT_PUBLIC_KOR_API_KEY=7bbf8d00-8b88-4706-ac88-90a7de09cf99
NEXT_PUBLIC_KOR_NETWORK=base-sepolia
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your-walletconnect-project-id>
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: swap origin deps for wagmi/rainbowkit"
```

---

## Task 2: Copy Kor SDK and Create Contracts Config

**Files:**
- Create: `src/lib/kor-sdk/index.ts`
- Create: `src/lib/kor-sdk/client.ts`
- Create: `src/lib/kor-sdk/types.ts`
- Create: `src/lib/kor-sdk/constants.ts`
- Create: `src/lib/contracts.ts`

- [ ] **Step 1: Create kor-sdk directory**

```bash
mkdir -p src/lib/kor-sdk
```

- [ ] **Step 2: Copy SDK files from local kor-sdk**

Copy the following files from `/Users/rahuldoraiswami/workspace/kor/kor-sdk/src/` to `src/lib/kor-sdk/`:
- `index.ts`
- `client.ts`
- `types.ts`
- `constants.ts`

- [ ] **Step 3: Create contracts.ts with ABIs for on-chain reads**

Create `src/lib/contracts.ts`:

```typescript
// Contract addresses for Base Sepolia
export const KOR_CONTRACTS = {
  protocolCollection: "0x6F38e277DE29220B79dBA6789548e88f983c0d2d",
  nftModule: "0x7797A484C7a9aAa238D40476A022E5C5e3e2e0e3",
  ipModule: "0xd97fEB28aD630A3f8561a0decee0fed26842b718",
} as const;

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

// Minimal ERC721 ABI for reading token data
export const ERC721_READ_ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/kor-sdk src/lib/contracts.ts
git commit -m "feat: add kor-sdk and contracts config"
```

---

## Task 3: Update Data Schema

**Files:**
- Modify: `src/data/schema.ts`

- [ ] **Step 1: Read current schema.ts**

Review `src/data/schema.ts` to understand current structure.

- [ ] **Step 2: Update MediaItem type - replace origin with kor**

In `src/data/schema.ts`, update the import and types:

Replace:
```typescript
import type { OriginMetadata } from "@/lib/origin";
```

With:
```typescript
// Kor metadata stored with imported/minted media items
export type KorMetadata = {
  name: string;
  description: string;
  image?: string;
  animation_url?: string;
  owner: string;
  parentIpIds?: string[];
};
```

- [ ] **Step 3: Update MediaItem kind union**

Replace all instances of `"origin"` with `"kor"` in the kind type:

```typescript
kind: "generated" | "uploaded" | "kor";
```

- [ ] **Step 4: Update Origin-specific fields to Kor**

Replace:
```typescript
originTokenId?: string;
originMetadata?: OriginMetadata;
```

With:
```typescript
korTokenId?: string;
korIpId?: string;
korMetadata?: KorMetadata;
```

- [ ] **Step 5: Update the discriminated union for kind: "kor"**

Replace the `kind: "origin"` union member:
```typescript
| {
    kind: "kor";
    korTokenId: string;
    url: string;
    blob?: Blob;
    korMetadata: KorMetadata;
  }
```

- [ ] **Step 6: Commit**

```bash
git add src/data/schema.ts
git commit -m "feat: update schema from origin to kor"
```

---

## Task 4: Create Kor Library

**Files:**
- Create: `src/lib/kor.ts`

- [ ] **Step 1: Create src/lib/kor.ts with IPFS and minting helpers**

```typescript
"use client";

import { KorSDK } from "./kor-sdk";
import { KOR_CONTRACTS, ERC721_READ_ABI, BASE_SEPOLIA_RPC } from "./contracts";
import type { KorMetadata } from "@/data/schema";
import { ethers } from "ethers";

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
      network: (process.env.NEXT_PUBLIC_KOR_NETWORK as "base-sepolia" | "base") || "base-sepolia",
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
  credentials: IpfsCredentials
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
  const metadataBlob = new Blob([JSON.stringify(metadataJson)], { type: "application/json" });
  const metadataUri = await uploadFileToIPFS(metadataBlob, credentials);

  return metadataUri;
}

async function uploadFileToIPFS(file: File | Blob, credentials: IpfsCredentials): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  switch (credentials.provider) {
    case "pinata": {
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credentials.jwt}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error("Pinata upload failed");
      const data = await res.json();
      return `ipfs://${data.IpfsHash}`;
    }
    case "infura": {
      const auth = btoa(`${credentials.projectId}:${credentials.projectSecret}`);
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
  const provider = new ethers.providers.JsonRpcProvider(BASE_SEPOLIA_RPC);
  const contract = new ethers.Contract(
    KOR_CONTRACTS.protocolCollection,
    ERC721_READ_ABI,
    provider
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/kor.ts
git commit -m "feat: add kor library with IPFS and on-chain helpers"
```

---

## Task 5: Create KorProvider with Wagmi and RainbowKit

**Files:**
- Create: `src/components/kor-provider.tsx`

- [ ] **Step 1: Create kor-provider.tsx**

```typescript
"use client";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { baseSepolia, base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "VRSNS",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [baseSepolia, base],
  ssr: true,
});

const queryClient = new QueryClient();

type KorProviderProps = {
  children: React.ReactNode;
};

export function KorProvider({ children }: KorProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/kor-provider.tsx
git commit -m "feat: add KorProvider with wagmi and RainbowKit"
```

---

## Task 6: Create Kor Hooks

**Files:**
- Create: `src/hooks/use-kor.ts`

- [ ] **Step 1: Create use-kor.ts**

```typescript
"use client";

import { useVideoComposition } from "@/data/queries";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { useCallback, useMemo } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

/**
 * Hook for accessing wallet state via wagmi
 */
export function useKorWallet() {
  const { address, isConnected, chain } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();

  return {
    walletAddress: address,
    isConnected,
    chainId: chain?.id,
    openConnectModal: openConnectModal || (() => {}),
    disconnect,
  };
}

/**
 * Hook that requires wallet connection before executing a callback
 */
export function useRequireWallet() {
  const { isConnected, openConnectModal } = useKorWallet();

  const requireWallet = useCallback(
    (callback: () => void): boolean => {
      if (!isConnected) {
        openConnectModal();
        return false;
      }
      callback();
      return true;
    },
    [isConnected, openConnectModal]
  );

  return {
    requireWallet,
    isConnected,
  };
}

/**
 * Hook for tracking parent Kor IPs used in the current project
 * Used when minting derivative works to attribute royalties
 */
export function useKorParentTracking() {
  const projectId = useProjectId();
  const { data: composition } = useVideoComposition(projectId);

  const parentTokenIds = useMemo((): string[] => {
    if (!composition) return [];

    const parentIds: string[] = [];
    const usedMediaIds = new Set<string>();

    // Collect all media IDs used in keyframes
    for (const frame of Object.values(composition.frames).flat()) {
      if (frame.data.mediaId) {
        usedMediaIds.add(frame.data.mediaId);
      }
    }

    // Filter for Kor media items and extract their token IDs
    for (const mediaId of Array.from(usedMediaIds)) {
      const media = composition.mediaItems[mediaId];
      if (media?.kind === "kor" && media.korTokenId) {
        parentIds.push(media.korTokenId);
      }
    }

    // Kor protocol supports max 8 parents
    return parentIds.slice(0, 8);
  }, [composition]);

  const hasKorParents = parentTokenIds.length > 0;

  return {
    parentTokenIds,
    hasKorParents,
    parentCount: parentTokenIds.length,
  };
}

/**
 * Hook for opening mint dialog with data
 */
export function useMintDialog() {
  const setMintDialogOpen = useVideoProjectStore((s) => s.setMintDialogOpen);
  const { requireWallet } = useRequireWallet();

  const openMintDialog = useCallback(
    (data?: { mediaId?: string; exportedBlob?: Blob }) => {
      requireWallet(() => {
        setMintDialogOpen(true, data);
      });
    },
    [requireWallet, setMintDialogOpen]
  );

  const closeMintDialog = useCallback(() => {
    setMintDialogOpen(false);
  }, [setMintDialogOpen]);

  return {
    openMintDialog,
    closeMintDialog,
  };
}

/**
 * Hook for opening import dialog
 */
export function useImportDialog() {
  const setImportKorDialogOpen = useVideoProjectStore(
    (s) => s.setImportKorDialogOpen
  );

  const openImportDialog = useCallback(() => {
    setImportKorDialogOpen(true);
  }, [setImportKorDialogOpen]);

  const closeImportDialog = useCallback(() => {
    setImportKorDialogOpen(false);
  }, [setImportKorDialogOpen]);

  return {
    openImportDialog,
    closeImportDialog,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-kor.ts
git commit -m "feat: add kor hooks for wallet and parent tracking"
```

---

## Task 7: Update Store State

**Files:**
- Modify: `src/data/store.ts`

- [ ] **Step 1: Read current store.ts**

Review `src/data/store.ts` to find origin-related state fields.

- [ ] **Step 2: Rename importOriginDialogOpen to importKorDialogOpen**

Find and replace:
- `importOriginDialogOpen` → `importKorDialogOpen`
- `setImportOriginDialogOpen` → `setImportKorDialogOpen`

- [ ] **Step 3: Remove walletAddress state (now managed by wagmi)**

Remove the `walletAddress` and `setWalletAddress` fields from the store since wagmi manages this now.

- [ ] **Step 4: Update hasIpfsCredentials to use localStorage directly**

Keep `hasIpfsCredentials` but update initialization to check localStorage.

- [ ] **Step 5: Commit**

```bash
git add src/data/store.ts
git commit -m "refactor: update store for kor, remove wallet state"
```

---

## Task 8: Update Main Component

**Files:**
- Modify: `src/components/main.tsx`

- [ ] **Step 1: Replace OriginProvider with KorProvider**

Change import:
```typescript
import { KorProvider } from "./kor-provider";
```

Replace `<OriginProvider>` wrapper with `<KorProvider>`.

- [ ] **Step 2: Remove Origin-specific props**

Remove `clientId` prop if it was being passed to OriginProvider.

- [ ] **Step 3: Commit**

```bash
git add src/components/main.tsx
git commit -m "refactor: swap OriginProvider for KorProvider"
```

---

## Task 9: Update Wallet Dialog

**Files:**
- Modify: `src/components/wallet-dialog.tsx`

- [ ] **Step 1: Replace with RainbowKit ConnectButton**

Rewrite `wallet-dialog.tsx` to use RainbowKit:

```typescript
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useVideoProjectStore } from "@/data/store";

type WalletDialogProps = {} & Parameters<typeof Dialog>[0];

export function WalletDialog({ open, onOpenChange, ...props }: WalletDialogProps) {
  const setWalletDialogOpen = useVideoProjectStore((s) => s.setWalletDialogOpen);

  const handleOpenChange = (isOpen: boolean) => {
    setWalletDialogOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  return (
    <Dialog {...props} open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <ConnectButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/wallet-dialog.tsx
git commit -m "refactor: use RainbowKit ConnectButton in wallet dialog"
```

---

## Task 10: Rewrite Mint Dialog for Kor

**Files:**
- Modify: `src/components/mint-dialog.tsx`

- [ ] **Step 1: Update imports**

Replace Origin imports with Kor imports:
```typescript
import { useKorWallet, useKorParentTracking } from "@/hooks/use-kor";
import { getKorSDK, uploadToIPFS, getIpfsCredentials, hasIpfsCredentials } from "@/lib/kor";
import { useWalletClient } from "wagmi";
```

- [ ] **Step 2: Update hooks usage**

Replace:
```typescript
const { openModal } = useModal();
const walletAddress = useVideoProjectStore((s) => s.walletAddress);
```

With:
```typescript
const { walletAddress, openConnectModal } = useKorWallet();
const { data: walletClient } = useWalletClient();
```

- [ ] **Step 3: Update parent tracking**

Replace `useOriginParentTracking()` with `useKorParentTracking()`.

- [ ] **Step 4: Rewrite mint mutation**

Update the `mintMutation` to use Kor flow:

```typescript
const mintMutation = useMutation({
  mutationFn: async () => {
    if (!walletAddress || !walletClient) {
      throw new Error("Wallet not connected");
    }

    const credentials = getIpfsCredentials();
    if (!credentials) {
      throw new Error("IPFS credentials not configured");
    }

    // Get file to mint
    let fileToMint: Blob;
    if (mintDialogData?.exportedBlob) {
      fileToMint = mintDialogData.exportedBlob;
    } else if (mintDialogData?.mediaId) {
      const media = mediaItems.find((m) => m.id === mintDialogData.mediaId);
      if (!media?.blob) throw new Error("Media blob not available");
      fileToMint = media.blob;
    } else {
      throw new Error("No file to mint");
    }

    // 1. Upload to IPFS
    const metadataUri = await uploadToIPFS(
      fileToMint,
      { name, description },
      credentials
    );

    // 2. Mint NFT from protocol collection
    const kor = getKorSDK();
    const mintSig = await kor.mintFromProtocolCollection({
      recipientAddress: walletAddress,
      metadataURI: metadataUri,
    });

    // Create ethers signer from wallet client
    const provider = new ethers.providers.Web3Provider(walletClient as any);
    const signer = provider.getSigner();

    const { tokenId } = await kor.submitMintFromCollection(mintSig, signer);

    // 3. Register as IP (or derivative if has parents)
    let ipId: string;
    if (parentTokenIds.length > 0) {
      const derivSig = await kor.registerDerivative({
        tokenContract: KOR_CONTRACTS.protocolCollection,
        tokenId: parseInt(tokenId),
        parentIP: parentTokenIds[0], // Use first parent
      });
      const result = await kor.submitRegisterIP(derivSig, signer);
      ipId = result.ipId;
    } else {
      const regSig = await kor.registerIP({
        tokenContract: KOR_CONTRACTS.protocolCollection,
        tokenId: parseInt(tokenId),
      });
      const result = await kor.submitRegisterIP(regSig, signer);
      ipId = result.ipId;
    }

    return { tokenId, ipId };
  },
  onSuccess: ({ tokenId, ipId }) => {
    toast({
      title: "IP NFT Minted",
      description: `Token ID: ${tokenId}, IP ID: ${ipId}`,
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.projectMediaItems(projectId),
    });
    handleClose();
  },
  onError: (error: Error) => {
    toast({
      title: "Minting Failed",
      description: error.message,
      variant: "destructive",
    });
  },
});
```

- [ ] **Step 5: Update UI text**

Replace "Origin Protocol" references with "Kor Protocol".

- [ ] **Step 6: Remove license terms UI**

Remove the license terms section (price, duration, royalty sliders) since Kor uses a different licensing model.

- [ ] **Step 7: Commit**

```bash
git add src/components/mint-dialog.tsx
git commit -m "refactor: rewrite mint dialog for Kor protocol"
```

---

## Task 11: Create Import Kor Dialog

**Files:**
- Create: `src/components/import-kor-dialog.tsx`

- [ ] **Step 1: Create import-kor-dialog.tsx**

```typescript
"use client";

import { db } from "@/data/db";
import { queryKeys } from "@/data/queries";
import type { MediaItem } from "@/data/schema";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { useToast } from "@/hooks/use-toast";
import { useKorWallet } from "@/hooks/use-kor";
import { getKorAsset, ipfsToHttp } from "@/lib/kor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { LoadingIcon } from "./ui/icons";
import { Input } from "./ui/input";

type ImportKorDialogProps = {} & Parameters<typeof Dialog>[0];

export function ImportKorDialog({
  onOpenChange,
  open,
  ...props
}: ImportKorDialogProps) {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { walletAddress, openConnectModal } = useKorWallet();
  const setImportKorDialogOpen = useVideoProjectStore(
    (s) => s.setImportKorDialogOpen
  );

  const [tokenIdInput, setTokenIdInput] = useState("");

  // Fetch asset details when token ID is entered
  const assetQuery = useQuery({
    queryKey: ["kor-asset", tokenIdInput],
    queryFn: () => getKorAsset(tokenIdInput),
    enabled: tokenIdInput.length > 0,
    retry: false,
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const assetData = await getKorAsset(tokenId);

      // Download the file as blob
      const fileUrl = ipfsToHttp(assetData.metadata.animation_url || assetData.metadata.image || "");
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error("Failed to download asset");
      }
      const blob = await response.blob();

      // Determine media type
      const mediaType = determineMediaType(fileUrl, blob.type);

      // Create media item
      const mediaData: Omit<MediaItem, "id"> = {
        projectId,
        kind: "kor",
        createdAt: Date.now(),
        mediaType,
        status: "completed",
        url: fileUrl,
        blob,
        korTokenId: tokenId,
        korMetadata: assetData.metadata,
      } as MediaItem;

      await db.media.create(mediaData);
      return tokenId;
    },
    onSuccess: (tokenId) => {
      toast({
        title: "Asset Imported",
        description: `Kor asset #${tokenId} has been added to your media library.`,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectMediaItems(projectId),
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setImportKorDialogOpen(false);
    setTokenIdInput("");
  };

  const handleOnOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
    onOpenChange?.(isOpen);
  };

  const handleImport = () => {
    if (tokenIdInput) {
      importMutation.mutate(tokenIdInput);
    }
  };

  return (
    <Dialog {...props} open={open} onOpenChange={handleOnOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Kor Protocol</DialogTitle>
          <DialogDescription>
            Enter a token ID to import media from the Kor protocol collection.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Token ID..."
              value={tokenIdInput}
              onChange={(e) => setTokenIdInput(e.target.value)}
              disabled={importMutation.isPending}
            />
            <Button
              onClick={handleImport}
              disabled={!tokenIdInput || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <LoadingIcon className="w-4 h-4" />
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
              <span className="ml-2">Import</span>
            </Button>
          </div>

          {/* Loading state */}
          {assetQuery.isLoading && tokenIdInput && (
            <div className="flex items-center justify-center py-8">
              <LoadingIcon className="w-6 h-6" />
              <span className="ml-2 text-muted-foreground">
                Loading asset details...
              </span>
            </div>
          )}

          {/* Error state */}
          {assetQuery.isError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-red-400">
                Token not found. Please check the ID and try again.
              </p>
            </div>
          )}

          {/* Asset preview */}
          {assetQuery.data && (
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-medium">{assetQuery.data.metadata.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {assetQuery.data.metadata.description || "No description"}
                </p>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Owner:</span>{" "}
                <span className="font-mono text-xs">
                  {assetQuery.data.owner.slice(0, 6)}...{assetQuery.data.owner.slice(-4)}
                </span>
              </div>
              {assetQuery.data.metadata.image && (
                <img
                  src={ipfsToHttp(assetQuery.data.metadata.image)}
                  alt={assetQuery.data.metadata.name}
                  className="w-full h-32 object-cover rounded"
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function determineMediaType(
  url: string,
  contentType: string
): "image" | "video" | "music" | "voiceover" {
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "music";
  if (contentType.startsWith("image/")) return "image";

  const ext = url.split(".").pop()?.toLowerCase().split("?")[0];
  if (["mp4", "webm", "mov", "avi"].includes(ext || "")) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext || "")) return "music";
  return "image";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/import-kor-dialog.tsx
git commit -m "feat: add import-kor-dialog for importing assets"
```

---

## Task 12: Update Media Components

**Files:**
- Modify: `src/components/media-panel.tsx`
- Modify: `src/components/media-gallery.tsx`
- Modify: `src/components/left-panel.tsx`
- Modify: `src/components/export-dialog.tsx`

- [ ] **Step 1: Update media-panel.tsx**

Replace `"origin"` badge with `"kor"`:
- Find instances of `kind === "origin"` and replace with `kind === "kor"`
- Update badge text from "Origin" to "Kor"

- [ ] **Step 2: Update media-gallery.tsx**

Replace origin references:
- `kind === "origin"` → `kind === "kor"`
- `originTokenId` → `korTokenId`
- `originMetadata` → `korMetadata`

- [ ] **Step 3: Update left-panel.tsx**

Update import button:
- Change import dialog reference from Origin to Kor
- Update import function name if needed

- [ ] **Step 4: Update export-dialog.tsx**

Update mint references:
- Replace Origin terminology with Kor
- Update any `useOrigin` hooks to `useKor` hooks

- [ ] **Step 5: Commit**

```bash
git add src/components/media-panel.tsx src/components/media-gallery.tsx src/components/left-panel.tsx src/components/export-dialog.tsx
git commit -m "refactor: update media components for kor"
```

---

## Task 13: VRSNS Rebrand

**Files:**
- Modify: `src/components/logo.tsx`
- Modify: `src/components/landing-hero.tsx`
- Modify: `src/components/landing-header.tsx`
- Modify: `src/components/landing-footer.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Modify: `README.md`
- Modify: `README.ru.md`
- Modify: `package.json`

- [ ] **Step 1: Update logo.tsx**

Replace "VideoSOS" text with "VRSNS".

- [ ] **Step 2: Update landing-hero.tsx**

Replace all "VideoSOS" occurrences with "VRSNS".

- [ ] **Step 3: Update landing-header.tsx**

Replace "VideoSOS" with "VRSNS".

- [ ] **Step 4: Update landing-footer.tsx**

Replace "VideoSOS" with "VRSNS".

- [ ] **Step 5: Update layout.tsx metadata**

Update page title and description:
```typescript
export const metadata = {
  title: "VRSNS - AI Video Editor",
  description: "Create professional videos with AI. Open-source video editor with 100+ AI models.",
};
```

- [ ] **Step 6: Update package.json name**

Change `"name": "videosos"` to `"name": "vrsns"`.

- [ ] **Step 7: Update README.md**

Replace all "VideoSOS" occurrences with "VRSNS". Update:
- Title
- Description
- Any internal references

- [ ] **Step 8: Update README.ru.md**

Same changes as README.md for Russian version.

- [ ] **Step 9: Commit**

```bash
git add src/components/logo.tsx src/components/landing-hero.tsx src/components/landing-header.tsx src/components/landing-footer.tsx src/app/[locale]/layout.tsx README.md README.ru.md package.json
git commit -m "chore: rebrand VideoSOS to VRSNS"
```

---

## Task 14: Cleanup Old Origin Files

**Files:**
- Delete: `src/components/origin-provider.tsx`
- Delete: `src/lib/origin.ts`
- Delete: `src/hooks/use-origin.ts`
- Delete: `src/components/import-origin-dialog.tsx`

- [ ] **Step 1: Delete old Origin files**

```bash
rm src/components/origin-provider.tsx
rm src/lib/origin.ts
rm src/hooks/use-origin.ts
rm src/components/import-origin-dialog.tsx
```

- [ ] **Step 2: Search for any remaining origin imports**

```bash
grep -r "origin" src/ --include="*.ts" --include="*.tsx" | grep -v "kor"
```

Fix any remaining references.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old origin protocol files"
```

---

## Task 15: Verify Build and Test

- [ ] **Step 1: Install dependencies**

```bash
npm install
```

- [ ] **Step 2: Run type check**

```bash
npm run type-check
```

Fix any type errors.

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Fix any lint errors.

- [ ] **Step 4: Run build**

```bash
npm run build
```

- [ ] **Step 5: Start dev server and test manually**

```bash
npm run dev
```

Test:
1. Wallet connection via RainbowKit
2. IPFS credential setup
3. Generate an image and try minting
4. Import by token ID (if you have a test token)

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: fix build issues and verify migration"
```

- [ ] **Step 7: Push branch**

```bash
git push -u origin kor-migration
```
