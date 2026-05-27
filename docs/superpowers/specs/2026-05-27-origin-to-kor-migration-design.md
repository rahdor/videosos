# Origin to Kor Protocol Migration

**Date:** 2026-05-27
**Status:** Approved
**Branch:** `kor-migration` (to be created)
**Deployment:** Separate Vercel deployment (e.g., `videosos-kor.vercel.app`)

## Overview

Migrate VideoSOS from Origin Protocol (`@campnetwork/origin`) to Kor Protocol (`@kor-protocol/sdk`) for on-chain IP management. This enables minting video content as IP NFTs on Base chain with derivative tracking.

**Additionally:** Rebrand from "VideoSOS" to "VRSNS" (name and text only, logo TBD).

## Requirements

- **Wallet:** RainbowKit + wagmi for wallet connectivity
- **IPFS:** Keep existing credential system (Pinata/Infura/web3.storage)
- **Collections:** Use Kor protocol collection for all mints
- **Derivatives:** Preserve parent IP tracking when minting exports
- **Import:** Query on-chain directly (Kor has no read API)
- **Chain:** Base Sepolia (testnet), Base mainnet ready for later

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App Layout                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    KorProvider                         │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐ │  │
│  │  │  WagmiProvider  │  │     RainbowKitProvider      │ │  │
│  │  │  (wallet state) │  │     (connect modal UI)      │ │  │
│  │  └─────────────────┘  └─────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              KorSDK instance                     │  │  │
│  │  │  (initialized with API key, available via hook)  │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies to add:**
- `wagmi` + `viem` - Wallet state management
- `@rainbow-me/rainbowkit` - Wallet connect UI
- `@kor-protocol/sdk` - Copy SDK source from `/Users/rahuldoraiswami/workspace/kor/kor-sdk` into `src/lib/kor-sdk/` (not published to npm)

**Dependencies to remove:**
- `@campnetwork/origin`

## Files to Change

### Remove
- `src/components/origin-provider.tsx`
- `src/lib/origin.ts`
- `src/hooks/use-origin.ts`
- `src/components/import-origin-dialog.tsx`

### Create
| File | Purpose |
|------|---------|
| `src/components/kor-provider.tsx` | Wagmi + RainbowKit + KorSDK setup |
| `src/lib/kor.ts` | Mint flow, on-chain queries, IPFS upload helpers |
| `src/hooks/use-kor.ts` | `useKor()`, `useKorWallet()`, `useKorParentTracking()` |
| `src/components/import-kor-dialog.tsx` | Import by token ID with on-chain queries |
| `src/lib/contracts.ts` | ABI + addresses for on-chain reads |

### Modify
| File | Changes |
|------|---------|
| `src/components/mint-dialog.tsx` | New minting flow (IPFS → mint → register IP) |
| `src/components/wallet-dialog.tsx` | Replace Origin modal with RainbowKit ConnectButton |
| `src/components/main.tsx` | Swap OriginProvider → KorProvider |
| `src/components/left-panel.tsx` | Update import button references |
| `src/components/media-panel.tsx` | Update "origin" badge → "kor" |
| `src/components/media-gallery.tsx` | Update kind checks |
| `src/components/export-dialog.tsx` | Update mint references |
| `src/data/schema.ts` | Change `kind: "origin"` → `kind: "kor"`, update metadata type |
| `src/data/store.ts` | Rename origin-related state fields |
| `package.json` | Swap dependencies |

### Rebrand (VideoSOS → VRSNS)
| File | Changes |
|------|---------|
| `src/components/logo.tsx` | Update text from "VideoSOS" to "VRSNS" |
| `src/components/landing-hero.tsx` | Update hero text |
| `src/components/landing-header.tsx` | Update header branding |
| `src/components/landing-footer.tsx` | Update footer branding |
| `src/app/[locale]/layout.tsx` | Update page title, meta description |
| `public/manifest.json` | Update app name (if exists) |
| `README.md` | Update project name and references |
| `README.ru.md` | Update Russian README |
| `package.json` | Update `"name": "vrsns"` |

Note: Logo asset unchanged for now (no new logo provided).

## Data Flow

### Minting Flow

```
User clicks "Mint as IP NFT"
         │
         ▼
┌─────────────────────────┐
│  1. Upload to IPFS      │  ← Uses existing IPFS credential system
│     - file blob         │
│     - metadata JSON     │
│     Returns: metadataURI│
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  2. Mint NFT            │
│     kor.mintFromProtocol│
│     Collection(...)     │
│     Returns: tokenId    │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  3. Register as IP      │  ← Always required (creates token-bound account)
│     - No parents:       │
│       kor.registerIP()  │
│     - Has parents:      │
│       kor.registerDeriv │
│       ative()           │
│     Returns: ipId       │
└───────────┬─────────────┘
            ▼
   Save to IndexedDB with
   kind: "kor", korTokenId, korIpId
```

### Import Flow

```
User enters token ID
         │
         ▼
┌─────────────────────────┐
│  1. Query on-chain      │
│     - tokenURI(tokenId) │  ← Get metadata URI
│     - ownerOf(tokenId)  │  ← Get owner
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  2. Fetch metadata      │
│     - GET metadataURI   │
│     - Extract image/    │
│       animation_url     │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  3. Download asset      │
│     - Fetch the file    │
│     - Store as blob     │
└───────────┬─────────────┘
            ▼
   Save to IndexedDB with
   kind: "kor", korTokenId
```

Note: Import has no access control like Origin did. All NFT metadata is public on-chain.

## Schema Changes

**Before (Origin):**
```typescript
export type MediaItem = {
  // ...
  kind: "generated" | "uploaded" | "origin";
  originTokenId?: string;
  originMetadata?: OriginMetadata;
}
```

**After (Kor):**
```typescript
export type MediaItem = {
  // ...
  kind: "generated" | "uploaded" | "kor";
  korTokenId?: string;
  korIpId?: string;
  korMetadata?: KorMetadata;
}

export type KorMetadata = {
  name: string;
  description: string;
  image?: string;
  animation_url?: string;
  owner: string;
  parentIpIds?: string[];
};
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Wallet not connected | Prompt RainbowKit modal before mint/import |
| Wrong chain | Auto-prompt chain switch to Base Sepolia |
| User rejects tx | Toast: "Transaction cancelled" |
| No IPFS credentials | Show warning in mint dialog |
| IPFS upload fails | Toast with error, don't proceed to mint |
| Backend signature fails | Toast: "Failed to prepare transaction" |
| Tx reverts | Parse revert reason, show in toast |
| Invalid token ID | Toast: "Token not found" |
| Metadata fetch fails | Toast: "Could not load asset metadata" |
| IPFS gateway timeout | Retry with fallback gateway |

## Configuration

**Environment variables:**
```
NEXT_PUBLIC_KOR_API_KEY=7bbf8d00-8b88-4706-ac88-90a7de09cf99
NEXT_PUBLIC_KOR_NETWORK=base-sepolia
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<get from cloud.walletconnect.com>
```

**Setup requirement:** Create a project at [cloud.walletconnect.com](https://cloud.walletconnect.com) to get a WalletConnect Project ID. This is required for RainbowKit to work.

**Kor contract addresses (Base Sepolia):**
- Protocol Collection: `0x6F38e277DE29220B79dBA6789548e88f983c0d2d`
- NFT Module: `0x7797A484C7a9aAa238D40476A022E5C5e3e2e0e3`
- IP Module: `0xd97fEB28aD630A3f8561a0decee0fed26842b718`

## Testing

**Manual testing checklist:**
1. Wallet connection - Connect via RainbowKit, verify address shows, disconnect works
2. Chain switching - Connect on wrong chain, verify prompt to switch
3. IPFS credentials - Configure Pinata/Infura, verify upload works
4. Mint single image - Generate image, mint, verify tokenId returned
5. Mint with derivatives - Import Kor asset, use in timeline, export, mint → verify derivative registration
6. Import by token ID - Enter valid token ID, verify metadata loads, import to library
7. Import invalid token - Enter non-existent ID, verify error message

**Test environment:**
- Base Sepolia testnet
- Free testnet ETH from Base faucet

## Deployment

1. Create `kor-migration` branch from `main`
2. Set up separate Vercel deployment for branch
3. Production (`videosos.vercel.app`) stays untouched on `main`
4. Merge to `main` when ready
