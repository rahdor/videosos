"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useVideoProjectStore } from "@/data/store";

type WalletDialogProps = {} & Parameters<typeof Dialog>[0];

export function WalletDialog({ open, onOpenChange, ...props }: WalletDialogProps) {
  const setWalletDialogOpen = useVideoProjectStore((s) => s.setWalletDialogOpen);

  const handleOpenChange = (isOpen: boolean) => {
    setWalletDialogOpen(isOpen);
    onOpenChange?.(isOpen);
  };

  return (
    <Dialog {...props} open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <ConnectButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}
