"use client";

import Header from "@/components/header";
import { OriginProvider, useAuthState } from "@/components/origin-provider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useVideoProjectStore } from "@/data/store";
import { weiToEth } from "@/lib/origin";
import { CampModal, useModal } from "@campnetwork/origin/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  CoinsIcon,
  ExternalLinkIcon,
  ImageIcon,
  Loader2,
  PlusIcon,
  RefreshCwIcon,
  WalletIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const queryClient = new QueryClient();
const ORIGIN_CLIENT_ID = process.env.NEXT_PUBLIC_ORIGIN_CLIENT_ID || "";

// Origin marketplace URL - configurable for testnet/mainnet (defaults to testnet)
const ORIGIN_MARKETPLACE_URL =
  process.env.NEXT_PUBLIC_ORIGIN_URL || "https://origin-ui-dev.vercel.app";

// Subgraph URL for querying user's IPs - configurable for testnet/mainnet (defaults to testnet)
const SUBGRAPH_URL =
  process.env.NEXT_PUBLIC_ORIGIN_SUBGRAPH_URL ||
  "https://api.goldsky.com/api/public/project_clu8sr03ji34301z2b4xte1g5/subgraphs/camp-origin-testnet-upgradable/4.0.0/gn";

interface IpNFT {
  id: string;
  tokenId: string;
  name: string | null;
  image: string | null;
  price: string;
  duration: string;
  creator: { id: string };
}

async function fetchUserIPs(walletAddress: string): Promise<IpNFT[]> {
  const query = `
    query GetUserIPs($owner: String!) {
      ipNFTs(where: { owner: $owner }, orderBy: tokenId, orderDirection: desc, first: 100) {
        id
        tokenId
        name
        image
        price
        duration
        creator { id }
      }
    }
  `;

  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { owner: walletAddress.toLowerCase() },
    }),
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0]?.message || "Failed to fetch IPs");
  }

  return result.data?.ipNFTs || [];
}

function formatPrice(priceWei: string): string {
  try {
    return `${weiToEth(BigInt(priceWei))} CAMP`;
  } catch {
    return "Free";
  }
}

function IpCard({ ip, locale }: { ip: IpNFT; locale: string }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group rounded-lg border bg-card overflow-hidden hover:border-primary/50 transition-colors">
      {/* Image */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        {ip.image && !imageError ? (
          <img
            src={ip.image}
            alt={ip.name || "IP Asset"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <h3 className="font-medium truncate" title={ip.name || "Untitled"}>
          {ip.name || "Untitled"}
        </h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{formatPrice(ip.price)}</span>
          <Button size="sm" variant="ghost" asChild className="h-7 px-2">
            <a
              href={`${ORIGIN_MARKETPLACE_URL}/asset/${ip.tokenId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MyIPsPageInner() {
  const locale = useLocale();
  const { authenticated } = useAuthState();
  const { openModal } = useModal();
  const walletAddress = useVideoProjectStore((s) => s.walletAddress);

  const [ips, setIps] = useState<IpNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIPs = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchUserIPs(walletAddress);
      setIps(data);
    } catch (err) {
      console.error("Failed to fetch IPs:", err);
      setError(err instanceof Error ? err.message : "Failed to load IPs");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  // Load IPs when wallet connects
  useEffect(() => {
    if (authenticated && walletAddress) {
      loadIPs();
    } else {
      setIps([]);
    }
  }, [authenticated, walletAddress, loadIPs]);

  // Truncate wallet address for display
  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">My IPs</h1>
              {authenticated && truncatedAddress && (
                <p className="text-sm text-muted-foreground mt-1">
                  Connected as{" "}
                  <span className="font-mono">{truncatedAddress}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {authenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadIPs}
                  disabled={loading}
                >
                  <RefreshCwIcon
                    className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              )}
              <Button asChild size="sm">
                <Link href={`/${locale}/create`}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create New
                </Link>
              </Button>
            </div>
          </div>

          {/* Content */}
          {!authenticated ? (
            // Not connected state
            <div className="flex flex-col items-center justify-center py-20">
              <WalletIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Connect your wallet to view your minted intellectual property
                assets.
              </p>
              <Button onClick={() => openModal()}>
                <WalletIcon className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            </div>
          ) : loading ? (
            // Loading state
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading your IPs...</p>
            </div>
          ) : error ? (
            // Error state
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadIPs} variant="outline">
                Try Again
              </Button>
            </div>
          ) : ips.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-20">
              <CoinsIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No IPs Yet</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                You haven't minted any intellectual property yet. Create your
                first IP to get started!
              </p>
              <Button asChild>
                <Link href={`/${locale}/create`}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First IP
                </Link>
              </Button>
            </div>
          ) : (
            // Gallery grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {ips.map((ip) => (
                <IpCard key={ip.id} ip={ip} locale={locale} />
              ))}
            </div>
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
