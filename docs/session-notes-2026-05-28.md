# Session Notes - May 28, 2026

## Summary
Completed migration from Origin Protocol (Camp Network) to Kor Protocol (Base) and deployed to production.

## Major Changes

### 1. Protocol Migration
- Replaced `@campnetwork/origin` SDK with custom Kor SDK (`src/lib/kor-sdk/`)
- Switched from Camp Network to Base Sepolia testnet
- Updated wallet integration to use wagmi/viem/RainbowKit

### 2. Branding Updates
- Renamed "Origin Studio" → "VRSNS"
- Updated "Powered by Origin Protocol" → "Powered by Kor Protocol"
- Changed "Camp Network" references → "Base"
- Updated all landing page copy for IP licensing focus
- Changed "Price (CAMP)" → "Price (USDC)"
- Updated default description "Created with Origin Studio" → "Created with VRSNS"

### 3. Feature Changes
- Removed My IPs page (`/[locale]/my-ips/`)
- Removed Russian translation (English only now)
- Disabled language switcher
- Made wallet connection optional (app works without WalletConnect projectId)

### 4. Minting Implementation
- Implemented actual minting in Create page (was previously a TODO stub)
- Flow: Upload to IPFS → Mint NFT → Register as IP
- Requires IPFS credentials (Pinata/Infura/web3.storage) configured in Settings

### 5. Bug Fixes
- Fixed wagmi/viem peer dependency conflicts with `.npmrc` (legacy-peer-deps=true)
- Fixed TypeScript error in ffmpeg.ts (BlobPart cast)
- Fixed WalletConnect error when projectId not configured
- Created WalletButton component that gracefully handles missing wallet config

## Files Changed (Key)
- `src/lib/kor-sdk/*` - New Kor Protocol SDK
- `src/lib/kor.ts` - Kor helper functions (IPFS, SDK singleton)
- `src/components/kor-provider.tsx` - Wallet providers (replaces origin-provider)
- `src/components/wallet-button.tsx` - New wallet button component
- `src/components/create-page.tsx` - Implemented minting
- `src/hooks/use-kor.ts` - Wallet hooks (renamed from use-origin.ts)
- `messages/en.json` - Updated all landing page text
- `i18n.ts` - Removed Russian locale

## Environment Variables (Vercel)
- `FAL_KEY` - FAL API key for AI generation
- `NEXT_PUBLIC_KOR_API_KEY` - Kor Protocol API key
- `NEXT_PUBLIC_KOR_NETWORK` - Network (base-sepolia)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Optional, enables wallet connect

## Deployment
- Production: https://videosos-origin.vercel.app
- Branch: `main` (merged from `kor-migration`)
- Hosting: Vercel

## TODO / Future Work
- Add WalletConnect project ID for full wallet functionality
- Test minting flow end-to-end with real IPFS credentials
- Consider adding license terms selection to Create page mint form
