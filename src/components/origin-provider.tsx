"use client";

import { useVideoProjectStore } from "@/data/store";
import {
  checkHasIpfsCredentials,
  clearOriginAuth,
  setOriginAuth,
} from "@/lib/origin";
import { CampProvider, useAuth, useAuthState } from "@campnetwork/origin/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

const queryClient = new QueryClient();

type OriginProviderProps = {
  children: React.ReactNode;
  clientId: string;
};

// Syncs Origin auth state with Zustand store and lib/origin
function AuthSync() {
  const auth = useAuth();
  const { authenticated, loading } = useAuthState();
  const setWalletAddress = useVideoProjectStore((s) => s.setWalletAddress);
  const setHasIpfsCredentials = useVideoProjectStore(
    (s) => s.setHasIpfsCredentials,
  );

  useEffect(() => {
    if (authenticated && auth) {
      // Sync to lib/origin for mint/import functions
      setOriginAuth(auth as any);
      // Sync wallet address to Zustand store
      if (auth.walletAddress) {
        setWalletAddress(auth.walletAddress);
      }
      // Check if user has IPFS credentials configured
      checkHasIpfsCredentials().then(setHasIpfsCredentials);
    } else if (!loading) {
      clearOriginAuth();
      setWalletAddress(null);
      setHasIpfsCredentials(false);
    }
  }, [authenticated, auth, loading, setWalletAddress, setHasIpfsCredentials]);

  return null;
}

export function OriginProvider({ children, clientId }: OriginProviderProps) {
  if (!clientId) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CampProvider clientId={clientId} appId={clientId}>
        <AuthSync />
        {children}
      </CampProvider>
    </QueryClientProvider>
  );
}

// Re-export hooks for convenience
export { useAuth, useAuthState } from "@campnetwork/origin/react";
