"use client";

import { Button } from "@/components/ui/button";
import { useIsWalletConfigured } from "@/components/kor-provider";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { CheckCircle2, LogOutIcon, WalletIcon } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";

/**
 * Wallet connect button that only renders when wallet is configured
 */
export function WalletButton() {
  const isWalletConfigured = useIsWalletConfigured();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Don't render anything if wallet is not configured
  if (!isWalletConfigured) {
    return null;
  }

  return <WalletButtonInner isConnected={isConnected} disconnect={disconnect} />;
}

/**
 * Inner component that can safely use RainbowKit hooks
 */
function WalletButtonInner({
  isConnected,
  disconnect,
}: {
  isConnected: boolean;
  disconnect: () => void;
}) {
  const { openConnectModal } = useConnectModal();

  if (isConnected) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="text-green-600 border-green-600/30"
          onClick={openConnectModal}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Connected
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => disconnect()}
          title="Disconnect wallet"
        >
          <LogOutIcon className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={openConnectModal}
      className="bg-camp-orange hover:bg-camp-orange-light"
    >
      <WalletIcon className="w-4 h-4 mr-2" />
      Connect Wallet
    </Button>
  );
}
