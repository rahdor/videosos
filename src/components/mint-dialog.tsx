"use client";

import {
  queryKeys,
  useProjectMediaItems,
  useVideoComposition,
} from "@/data/queries";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_LICENSE_TERMS,
  type SimpleLicenseTerms,
  ethToWei,
  mintOriginFile,
  percentToBps,
} from "@/lib/origin";
import { useModal } from "@campnetwork/origin/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircleIcon, CoinsIcon, ShieldCheckIcon } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Slider } from "./ui/slider";
import { Textarea } from "./ui/textarea";

type MintDialogProps = {} & Parameters<typeof Dialog>[0];

export function MintDialog({ onOpenChange, open, ...props }: MintDialogProps) {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const mintDialogData = useVideoProjectStore((s) => s.mintDialogData);
  const setMintDialogOpen = useVideoProjectStore((s) => s.setMintDialogOpen);
  const walletAddress = useVideoProjectStore((s) => s.walletAddress);
  const { openModal } = useModal();

  const { data: mediaItems = [] } = useProjectMediaItems(projectId);
  const { data: composition } = useVideoComposition(projectId);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceEth, setPriceEth] = useState("0.001"); // Minimum 0.001 CAMP
  const [durationDays, setDurationDays] = useState(7); // 1-30 days
  const [royaltyPercent, setRoyaltyPercent] = useState(10);
  const [commercialUse, setCommercialUse] = useState(true);
  const [derivativesAllowed, setDerivativesAllowed] = useState(true);

  // Collect parent Origin token IDs from media items used in timeline
  const parentTokenIds = useMemo(() => {
    if (!composition || !mintDialogData?.exportedBlob) {
      // If minting a single media item, check if it has Origin parents
      if (mintDialogData?.mediaId) {
        const media = mediaItems.find((m) => m.id === mintDialogData.mediaId);
        if (media?.kind === "origin" && media.originTokenId) {
          return [media.originTokenId];
        }
      }
      return [];
    }

    // For exported videos, scan all media items used in keyframes
    const usedMediaIds = new Set<string>();
    for (const frame of Object.values(composition.frames).flat()) {
      if (frame.data.mediaId) {
        usedMediaIds.add(frame.data.mediaId);
      }
    }

    const parentIds: string[] = [];
    for (const mediaId of Array.from(usedMediaIds)) {
      const media = composition.mediaItems[mediaId];
      if (media?.kind === "origin" && media.originTokenId) {
        parentIds.push(media.originTokenId);
      }
    }

    return parentIds.slice(0, 8); // Max 8 parents
  }, [composition, mintDialogData, mediaItems]);

  const mintMutation = useMutation({
    mutationFn: async () => {
      if (!walletAddress) {
        throw new Error("Wallet not connected");
      }

      let fileToMint: Blob;

      if (mintDialogData?.exportedBlob) {
        fileToMint = mintDialogData.exportedBlob;
      } else if (mintDialogData?.mediaId) {
        const media = mediaItems.find((m) => m.id === mintDialogData.mediaId);
        if (!media?.blob) {
          throw new Error("Media blob not available");
        }
        fileToMint = media.blob;
      } else {
        throw new Error("No file to mint");
      }

      const license: SimpleLicenseTerms = {
        price: ethToWei(Number.parseFloat(priceEth) || 0.001),
        duration: durationDays * 86400, // Convert days to seconds (1 day = 86400s)
        royaltyBps: percentToBps(royaltyPercent),
        paymentToken: "0x0000000000000000000000000000000000000000",
      };

      const tokenId = await mintOriginFile(
        fileToMint,
        {
          name,
          description,
          attributes: {
            commercialUse: commercialUse.toString(),
            derivativesAllowed: derivativesAllowed.toString(),
          },
        },
        license,
        parentTokenIds.length > 0 ? parentTokenIds : undefined,
      );

      return tokenId;
    },
    onSuccess: (tokenId) => {
      toast({
        title: "IP NFT Minted",
        description: `Your content has been registered on Origin Protocol. Token ID: ${tokenId}`,
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
    setPriceEth("0.001");
    setDurationDays(7);
    setRoyaltyPercent(10);
    setCommercialUse(true);
    setDerivativesAllowed(true);
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
            Register this content on Origin Protocol with IP rights.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {!walletAddress && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertCircleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <span className="text-sm">
                Please{" "}
                <button
                  type="button"
                  className="underline hover:text-yellow-400"
                  onClick={() => openModal()}
                >
                  connect your wallet
                </button>{" "}
                to mint.
              </span>
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

          {/* License Terms */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4" />
              License Terms
            </h4>

            <div className="space-y-2">
              <Label htmlFor="mint-price">Price (CAMP)</Label>
              <Input
                id="mint-price"
                type="number"
                step="0.001"
                min="0.001"
                value={priceEth}
                onChange={(e) => setPriceEth(e.target.value)}
                disabled={mintMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 0.001 CAMP
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                License Duration: {durationDays} day
                {durationDays !== 1 ? "s" : ""}
              </Label>
              <Slider
                value={[durationDays]}
                onValueChange={([val]) => setDurationDays(val)}
                min={1}
                max={30}
                step={1}
                disabled={mintMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                How long buyers have access (1-30 days)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Royalty: {royaltyPercent}%</Label>
              <Slider
                value={[royaltyPercent]}
                onValueChange={([val]) => setRoyaltyPercent(val)}
                min={1}
                max={50}
                step={1}
                disabled={mintMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Percentage you receive from secondary sales (min 1%)
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={commercialUse}
                  onChange={(e) => setCommercialUse(e.target.checked)}
                  disabled={mintMutation.isPending}
                  className="rounded"
                />
                <span className="text-sm">Allow Commercial Use</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={derivativesAllowed}
                  onChange={(e) => setDerivativesAllowed(e.target.checked)}
                  disabled={mintMutation.isPending}
                  className="rounded"
                />
                <span className="text-sm">Allow Derivatives</span>
              </label>
            </div>
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
