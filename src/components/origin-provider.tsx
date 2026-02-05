"use client";

import { useVideoProjectStore } from "@/data/store";
import { clearOriginAuth, setOriginAuth } from "@/lib/origin";
import type { Auth } from "@campnetwork/origin";
import { CampProvider, useAuth, useAuthState } from "@campnetwork/origin/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

// Create a separate query client for Origin to avoid conflicts
const originQueryClient = new QueryClient();

type OriginProviderProps = {
  children: React.ReactNode;
  clientId: string;
  appId: string;
};

// Inner component that syncs Origin auth state with Zustand store
function OriginAuthSync() {
  const auth = useAuth() as unknown as Auth | null;
  const { authenticated, loading } = useAuthState();
  const setWalletAddress = useVideoProjectStore((s) => s.setWalletAddress);

  useEffect(() => {
    if (authenticated && auth) {
      setOriginAuth(auth);
      // Get wallet address from auth instance
      const address = auth.walletAddress || null;
      setWalletAddress(address);
    } else if (!loading) {
      clearOriginAuth();
      setWalletAddress(null);
    }
  }, [authenticated, auth, loading, setWalletAddress]);

  return null;
}

export function OriginProvider({
  children,
  clientId,
  appId,
}: OriginProviderProps) {
  // If no clientId or appId provided, render children without Origin features
  if (!clientId || !appId) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={originQueryClient}>
      <CampProvider clientId={clientId} appId={appId}>
        <OriginAuthSync />
        {children}
      </CampProvider>
    </QueryClientProvider>
  );
}

// Re-export hooks for convenience
export { useAuth, useAuthState } from "@campnetwork/origin/react";
