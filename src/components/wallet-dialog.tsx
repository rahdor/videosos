"use client";

import { useVideoProjectStore } from "@/data/store";
import { CampModal, useAuthState, useConnect } from "@campnetwork/origin/react";
import { CheckCircle2, LogOutIcon, WalletIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type WalletDialogProps = {} & Parameters<typeof Dialog>[0];

export function WalletDialog({
  onOpenChange,
  open,
  ...props
}: WalletDialogProps) {
  const { authenticated, loading } = useAuthState();
  const { disconnect } = useConnect();
  const walletAddress = useVideoProjectStore((s) => s.walletAddress);

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const handleOnOpenChange = (isOpen: boolean) => {
    onOpenChange?.(isOpen);
  };

  return (
    <Dialog {...props} open={open} onOpenChange={handleOnOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="w-5 h-5" />
            {authenticated ? "Wallet Connected" : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription>
            {authenticated
              ? "Your wallet is connected for Origin Protocol integration."
              : "Connect your wallet to mint IP NFTs and access the Origin marketplace."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {authenticated && walletAddress ? (
            <div className="flex flex-col gap-4">
              <div className="bg-accent/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Connected Address
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <code className="text-foreground font-mono text-sm">
                    {truncateAddress(walletAddress)}
                  </code>
                </div>
              </div>
              <Button variant="destructive" onClick={handleDisconnect}>
                <LogOutIcon className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Use the Camp Modal to connect your wallet and link social
                accounts.
              </p>
              {/* CampModal provides the wallet connection UI */}
              <CampModal />
            </div>
          )}
        </div>

        <DialogFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            Origin Protocol enables IP rights management and monetization on
            blockchain.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
