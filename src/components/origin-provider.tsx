"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CampProvider, useAuth, useAuthState } from "@campnetwork/origin/react";
import { useVideoProjectStore } from "@/data/store";
import { setOriginAuth, clearOriginAuth } from "@/lib/origin";

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

  useEffect(() => {
    if (authenticated && auth) {
      // Sync to lib/origin for mint/import functions
      setOriginAuth(auth as any);
      // Sync wallet address to Zustand store
      if (auth.walletAddress) {
        setWalletAddress(auth.walletAddress);
      }
    } else if (!loading) {
      clearOriginAuth();
      setWalletAddress(null);
    }
  }, [authenticated, auth, loading, setWalletAddress]);

  return null;
}

export function OriginProvider({ children, clientId }: OriginProviderProps) {
  if (!clientId) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CampProvider clientId={clientId}>
        <AuthSync />
        {children}
      </CampProvider>
    </QueryClientProvider>
  );
}

// Re-export hooks for convenience
export { useAuth, useAuthState } from "@campnetwork/origin/react";
