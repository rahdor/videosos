"use client";

import { db } from "@/data/db";
import { queryKeys } from "@/data/queries";
import type { MediaItem } from "@/data/schema";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { useToast } from "@/hooks/use-toast";
import { buyOriginAccess, getOriginAsset, weiToEth } from "@/lib/origin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ExternalLinkIcon,
  SearchIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { LoadingIcon } from "./ui/icons";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type ImportOriginDialogProps = {} & Parameters<typeof Dialog>[0];

export function ImportOriginDialog({
  onOpenChange,
  open,
  ...props
}: ImportOriginDialogProps) {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const walletAddress = useVideoProjectStore((s) => s.walletAddress);
  const setImportOriginDialogOpen = useVideoProjectStore(
    (s) => s.setImportOriginDialogOpen,
  );
  const setWalletDialogOpen = useVideoProjectStore(
    (s) => s.setWalletDialogOpen,
  );

  const [tokenIdInput, setTokenIdInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch asset details when token ID is entered and user is connected
  const assetQuery = useQuery({
    queryKey: ["origin-asset", tokenIdInput],
    queryFn: () => getOriginAsset(tokenIdInput),
    enabled: tokenIdInput.length > 0 && !!walletAddress,
    retry: false,
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const assetData = await getOriginAsset(tokenId);

      if (!assetData.hasAccess) {
        throw new Error("ACCESS_REQUIRED");
      }

      // Download the file as blob
      const response = await fetch(assetData.url);
      if (!response.ok) {
        throw new Error("Failed to download asset");
      }
      const blob = await response.blob();

      // Determine media type from URL or content type
      const mediaType = determineMediaType(assetData.url, blob.type);

      // Create media item
      const mediaData: Omit<MediaItem, "id"> = {
        projectId,
        kind: "origin",
        createdAt: Date.now(),
        mediaType,
        status: "completed",
        url: assetData.url,
        blob,
        originTokenId: tokenId,
        originMetadata: {
          name:
            (assetData.metadata.name as string) || `Origin Asset #${tokenId}`,
          description: (assetData.metadata.description as string) || "",
          license: assetData.license,
          mintedBy: assetData.owner,
          parentIds: (assetData.metadata.parentIds as string[]) || undefined,
        },
      } as MediaItem;

      await db.media.create(mediaData);
      return tokenId;
    },
    onSuccess: (tokenId) => {
      toast({
        title: "Asset Imported",
        description: `Origin asset #${tokenId} has been added to your media library.`,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectMediaItems(projectId),
      });
      handleClose();
    },
    onError: (error: Error) => {
      if (error.message === "ACCESS_REQUIRED") {
        toast({
          title: "Access Required",
          description: "You need to purchase access to import this asset.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  // Buy access mutation
  const buyAccessMutation = useMutation({
    mutationFn: (tokenId: string) => buyOriginAccess(tokenId),
    onSuccess: () => {
      toast({
        title: "Access Purchased",
        description:
          "You now have access to this asset. Click Import to add it to your library.",
      });
      queryClient.invalidateQueries({
        queryKey: ["origin-asset", tokenIdInput],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setImportOriginDialogOpen(false);
    setTokenIdInput("");
    setSearchQuery("");
  };

  const handleOnOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      handleClose();
    }
    onOpenChange?.(isOpen);
  };

  const handleImport = () => {
    if (tokenIdInput) {
      importMutation.mutate(tokenIdInput);
    }
  };

  const handleBuyAccess = () => {
    if (tokenIdInput) {
      buyAccessMutation.mutate(tokenIdInput);
    }
  };

  return (
    <Dialog {...props} open={open} onOpenChange={handleOnOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Import from Origin Protocol</DialogTitle>
          <DialogDescription>
            Browse the marketplace or enter a token ID to import licensed media.
          </DialogDescription>
        </DialogHeader>

        {!walletAddress && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <span className="text-sm">
              Please{" "}
              <button
                type="button"
                className="underline hover:text-yellow-400"
                onClick={() => setWalletDialogOpen(true)}
              >
                connect your wallet
              </button>{" "}
              to import assets.
            </span>
          </div>
        )}

        <Tabs
          defaultValue="tokenId"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tokenId">Token ID</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          </TabsList>

          <TabsContent value="tokenId" className="flex flex-col gap-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Origin Token ID..."
                value={tokenIdInput}
                onChange={(e) => setTokenIdInput(e.target.value)}
                disabled={!walletAddress || importMutation.isPending}
              />
              <Button
                onClick={handleImport}
                disabled={
                  !tokenIdInput ||
                  !walletAddress ||
                  importMutation.isPending ||
                  (assetQuery.data && !assetQuery.data.hasAccess)
                }
              >
                {importMutation.isPending ? (
                  <LoadingIcon className="w-4 h-4" />
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
                <span className="ml-2">Import</span>
              </Button>
            </div>

            {/* Loading state */}
            {assetQuery.isLoading && tokenIdInput && (
              <div className="flex items-center justify-center py-8">
                <LoadingIcon className="w-6 h-6" />
                <span className="ml-2 text-muted-foreground">
                  Loading asset details...
                </span>
              </div>
            )}

            {/* Error state */}
            {assetQuery.isError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-sm text-red-400">
                  Failed to fetch asset. Please check the token ID and try
                  again.
                </p>
              </div>
            )}

            {/* Asset preview */}
            {assetQuery.data && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">
                      {(assetQuery.data.metadata.name as string) ||
                        `Origin Asset #${tokenIdInput}`}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {(assetQuery.data.metadata.description as string) ||
                        "No description"}
                    </p>
                  </div>
                  {assetQuery.data.hasAccess ? (
                    <CheckCircle2Icon className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Price:</span>{" "}
                    <span className="font-mono">
                      {weiToEth(assetQuery.data.license.price)} ETH
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Royalty:</span>{" "}
                    <span>{assetQuery.data.license.royaltyBps / 100}%</span>
                  </div>
                </div>

                {!assetQuery.data.hasAccess && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 flex items-center justify-between">
                    <span className="text-sm">Access required to import</span>
                    <Button
                      size="sm"
                      onClick={handleBuyAccess}
                      disabled={buyAccessMutation.isPending}
                    >
                      {buyAccessMutation.isPending ? (
                        <LoadingIcon className="w-4 h-4" />
                      ) : (
                        <ShoppingCartIcon className="w-4 h-4 mr-1" />
                      )}
                      Buy Access
                    </Button>
                  </div>
                )}

                {assetQuery.data.hasAccess && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
                    <p className="text-sm text-green-400">
                      You have access to this asset. Click Import to add it to
                      your library.
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="marketplace"
            className="flex-1 overflow-y-auto py-4"
          >
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={!walletAddress}
              />
              <Button variant="secondary" disabled={!walletAddress}>
                <SearchIcon className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-center text-muted-foreground py-8">
              <p className="mb-2">Marketplace browser coming soon.</p>
              <p className="text-sm">
                Use the Token ID tab to import specific assets, or visit the{" "}
                <a
                  href="https://camp.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline inline-flex items-center gap-1"
                >
                  Origin marketplace
                  <ExternalLinkIcon className="w-3 h-3" />
                </a>
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function determineMediaType(
  url: string,
  contentType: string,
): "image" | "video" | "music" | "voiceover" {
  // Check content type first
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "music";
  if (contentType.startsWith("image/")) return "image";

  // Fallback to URL extension
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0];
  if (["mp4", "webm", "mov", "avi"].includes(ext || "")) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext || "")) return "music";
  return "image";
}
