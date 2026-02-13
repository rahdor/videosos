"use client";

import Header from "@/components/header";
import { OriginProvider } from "@/components/origin-provider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { CampModal } from "@campnetwork/origin/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CoinsIcon } from "lucide-react";
import { useLocale } from "next-intl";
import Link from "next/link";

const queryClient = new QueryClient();
const ORIGIN_CLIENT_ID = process.env.NEXT_PUBLIC_ORIGIN_CLIENT_ID || "";

function MyIPsPageInner() {
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <CoinsIcon className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <h1 className="text-2xl font-bold">My IPs</h1>
          <p className="text-muted-foreground">
            View and manage your minted intellectual property. This feature is
            coming soon!
          </p>
          <div className="pt-4">
            <Button asChild>
              <Link href={`/${locale}/create`}>Create New IP</Link>
            </Button>
          </div>
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
