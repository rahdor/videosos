"use client";

import {
  queryKeys,
  useProjectMediaItems,
} from "@/data/queries";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { useToast } from "@/hooks/use-toast";
import { useKorWallet, useKorParentTracking } from "@/hooks/use-kor";
import { getKorSDK, uploadToIPFS, getIpfsCredentials } from "@/lib/kor";
import { KOR_CONTRACTS } from "@/lib/contracts";
import { useWalletClient } from "wagmi";
import { ethers } from "ethers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CoinsIcon,
  SettingsIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { LoadingIcon } from "./ui/icons";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type MintDialogProps = {} & Parameters<typeof Dialog>[0];

export function MintDialog({ onOpenChange, open, ...props }: MintDialogProps) {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mintDialogData = useVideoProjectStore((s) => s.mintDialogData);
  const setMintDialogOpen = useVideoProjectStore((s) => s.setMintDialogOpen);
  const hasIpfsCredentials = useVideoProjectStore((s) => s.hasIpfsCredentials);
  const { walletAddress, openConnectModal } = useKorWallet();
  const { data: walletClient } = useWalletClient();

  const { data: mediaItems = [] } = useProjectMediaItems(projectId);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Get parent token IDs from Kor hook
  const { parentTokenIds } = useKorParentTracking();

  const mintMutation = useMutation({
    mutationFn: async () => {
      if (!walletAddress || !walletClient) {
        throw new Error("Wallet not connected");
      }

      const credentials = getIpfsCredentials();
      if (!credentials) {
        throw new Error("IPFS credentials not configured");
      }

      // Get file to mint
      let fileToMint: Blob;
      if (mintDialogData?.exportedBlob) {
        fileToMint = mintDialogData.exportedBlob;
      } else if (mintDialogData?.mediaId) {
        const media = mediaItems.find((m) => m.id === mintDialogData.mediaId);
        if (!media?.blob) throw new Error("Media blob not available");
        fileToMint = media.blob;
      } else {
        throw new Error("No file to mint");
      }

      // 1. Upload to IPFS
      const metadataUri = await uploadToIPFS(
        fileToMint,
        { name, description },
        credentials
      );

      // 2. Mint NFT from protocol collection
      const kor = getKorSDK();
      const mintSig = await kor.mintFromProtocolCollection({
        recipientAddress: walletAddress,
        metadataURI: metadataUri,
      });

      // Create ethers signer from wallet client
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();

      const { tokenId } = await kor.submitMintFromCollection(mintSig, signer);

      // 3. Register as IP (or derivative if has parents)
      let ipId: string;
      if (parentTokenIds.length > 0) {
        const derivSig = await kor.registerDerivative({
          tokenContract: KOR_CONTRACTS.protocolCollection,
          tokenId: parseInt(tokenId),
          parentIP: parentTokenIds[0],
        });
        const result = await kor.submitRegisterIP(derivSig, signer);
        ipId = result.ipId;
      } else {
        const regSig = await kor.registerIP({
          tokenContract: KOR_CONTRACTS.protocolCollection,
          tokenId: parseInt(tokenId),
        });
        const result = await kor.submitRegisterIP(regSig, signer);
        ipId = result.ipId;
      }

      return { tokenId, ipId };
    },
    onSuccess: ({ tokenId, ipId }) => {
      toast({
        title: "IP NFT Minted",
        description: `Token ID: ${tokenId}, IP ID: ${ipId}`,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectMediaItems(projectId),
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Minting Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setMintDialogOpen(false);
    // Reset form
    setName("");
    setDescription("");
  };

  const handleOnOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
    onOpenChange?.(isOpen);
  };

  const canMint =
    name.trim() &&
    walletAddress &&
    hasIpfsCredentials &&
    (mintDialogData?.exportedBlob || mintDialogData?.mediaId);

  return (
    <Dialog {...props} open={open} onOpenChange={handleOnOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CoinsIcon className="w-5 h-5" />
            Mint as IP NFT
          </DialogTitle>
          <DialogDescription>
            Register this content on Kor Protocol with IP rights.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {!walletAddress && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
              <span className="text-sm">
                Please{" "}
                <button
                  type="button"
                  className="underline hover:text-yellow-400"
                  onClick={() => openConnectModal()}
                >
                  connect your wallet
                </button>{" "}
                to mint.
              </span>
            </div>
          )}

          {walletAddress && !hasIpfsCredentials && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">
                  IPFS credentials required for minting
                </span>
                <span className="text-sm text-muted-foreground">
                  Configure your IPFS pinning service (Pinata, Infura, or
                  web3.storage) in Settings{" "}
                  <SettingsIcon className="w-3 h-3 inline" /> to enable minting.
                </span>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2">
            <Label htmlFor="mint-name">Name *</Label>
            <Input
              id="mint-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Creative Work"
              disabled={mintMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mint-description">Description</Label>
            <Textarea
              id="mint-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your work..."
              rows={3}
              disabled={mintMutation.isPending}
            />
          </div>

          {/* Parent IPs notice */}
          {parentTokenIds.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-400">
                This derivative references {parentTokenIds.length} parent IP(s).
                Royalties will be automatically attributed to the original
                creators.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={mintMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mintMutation.mutate()}
            disabled={mintMutation.isPending || !canMint}
          >
            {mintMutation.isPending && <LoadingIcon className="w-4 h-4 mr-2" />}
            Mint IP NFT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
