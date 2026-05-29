"use client";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useRef } from "react";
import { http, WagmiProvider, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import "@rainbow-me/rainbowkit/styles.css";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Create config - use getDefaultConfig if projectId available, otherwise minimal config
const config = projectId
  ? getDefaultConfig({
      appName: "VRSNS",
      projectId,
      chains: [baseSepolia, base],
      ssr: true,
    })
  : createConfig({
      chains: [baseSepolia, base],
      transports: {
        [baseSepolia.id]: http(),
        [base.id]: http(),
      },
      ssr: true,
    });

// Context to track if wallet is configured
const WalletConfiguredContext = createContext(!!projectId);

export function useIsWalletConfigured() {
  return useContext(WalletConfiguredContext);
}

type KorProviderProps = {
  children: React.ReactNode;
};

export function KorProvider({ children }: KorProviderProps) {
  const queryClient = useRef(new QueryClient()).current;
  const isConfigured = !!projectId;

  // Always wrap with WagmiProvider so hooks work, but only add RainbowKit if configured
  return (
    <WalletConfiguredContext.Provider value={isConfigured}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {isConfigured ? (
            <RainbowKitProvider>{children}</RainbowKitProvider>
          ) : (
            children
          )}
        </QueryClientProvider>
      </WagmiProvider>
    </WalletConfiguredContext.Provider>
  );
}
