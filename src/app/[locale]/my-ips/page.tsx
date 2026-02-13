"use client";

import Header from "@/components/header";
import { OriginProvider, useAuthState } from "@/components/origin-provider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useVideoProjectStore } from "@/data/store";
import { CampModal, useModal } from "@campnetwork/origin/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CoinsIcon,
  ExternalLinkIcon,
  PlusIcon,
  WalletIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";

const queryClient = new QueryClient();
const ORIGIN_CLIENT_ID = process.env.NEXT_PUBLIC_ORIGIN_CLIENT_ID || "";

// Origin marketplace URL - update this when available
const ORIGIN_MARKETPLACE_URL = "https://origin.campnetwork.xyz";

function MyIPsPageInner() {
  const locale = useLocale();
  const { authenticated } = useAuthState();
  const { openModal } = useModal();
  const walletAddress = useVideoProjectStore((s) => s.walletAddress);

  // Truncate wallet address for display
  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-lg">
          <CoinsIcon className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <h1 className="text-2xl font-bold">My IPs</h1>

          {authenticated && walletAddress ? (
            <>
              <p className="text-muted-foreground">
                Connected as{" "}
                <span className="font-mono text-foreground">
                  {truncatedAddress}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                View your minted IPs on the Origin marketplace. Full gallery
                integration coming soon!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button asChild variant="outline">
                  <a
                    href={`${ORIGIN_MARKETPLACE_URL}/profile/${walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    View on Origin
                  </a>
                </Button>
                <Button asChild>
                  <Link href={`/${locale}/create`}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create New IP
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Connect your wallet to view your minted intellectual property.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button onClick={() => openModal()}>
                  <WalletIcon className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/create`}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create New IP
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyIPsPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <OriginProvider clientId={ORIGIN_CLIENT_ID}>
        <MyIPsPageInner />
        <CampModal injectButton={false} />
        <Toaster />
      </OriginProvider>
    </QueryClientProvider>
  );
}
