"use client";

import { db } from "@/data/db";
import { queryKeys } from "@/data/queries";
import type { MediaItem } from "@/data/schema";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { useKorWallet } from "@/hooks/use-kor";
import { useToast } from "@/hooks/use-toast";
import { getKorAsset, ipfsToHttp } from "@/lib/kor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
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

type ImportKorDialogProps = {} & Parameters<typeof Dialog>[0];

export function ImportKorDialog({
  onOpenChange,
  open,
  ...props
}: ImportKorDialogProps) {
  const projectId = useProjectId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { walletAddress, openConnectModal } = useKorWallet();
  const setImportKorDialogOpen = useVideoProjectStore(
    (s) => s.setImportKorDialogOpen,
  );

  const [tokenIdInput, setTokenIdInput] = useState("");

  // Fetch asset details when token ID is entered
  const assetQuery = useQuery({
    queryKey: ["kor-asset", tokenIdInput],
    queryFn: () => getKorAsset(tokenIdInput),
    enabled: tokenIdInput.length > 0,
    retry: false,
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const assetData = await getKorAsset(tokenId);

      // Download the file as blob
      const fileUrl = ipfsToHttp(
        assetData.metadata.animation_url || assetData.metadata.image || "",
      );
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error("Failed to download asset");
      }
      const blob = await response.blob();

      // Determine media type
      const mediaType = determineMediaType(fileUrl, blob.type);

      // Create media item
      const mediaData: Omit<MediaItem, "id"> = {
        projectId,
        kind: "kor",
        createdAt: Date.now(),
        mediaType,
        status: "completed",
        url: fileUrl,
        blob,
        korTokenId: tokenId,
        korMetadata: assetData.metadata,
      } as MediaItem;

      await db.media.create(mediaData);
      return tokenId;
    },
    onSuccess: (tokenId) => {
      toast({
        title: "Asset Imported",
        description: `Kor asset #${tokenId} has been added to your media library.`,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectMediaItems(projectId),
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setImportKorDialogOpen(false);
    setTokenIdInput("");
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

  return (
    <Dialog {...props} open={open} onOpenChange={handleOnOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Kor Protocol</DialogTitle>
          <DialogDescription>
            Enter a token ID to import media from the Kor protocol collection.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Token ID..."
              value={tokenIdInput}
              onChange={(e) => setTokenIdInput(e.target.value)}
              disabled={importMutation.isPending}
            />
            <Button
              onClick={handleImport}
              disabled={!tokenIdInput || importMutation.isPending}
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
                Token not found. Please check the ID and try again.
              </p>
            </div>
          )}

          {/* Asset preview */}
          {assetQuery.data && (
            <div className="border rounded-lg p-4 space-y-3">
              <div>
                <h4 className="font-medium">{assetQuery.data.metadata.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {assetQuery.data.metadata.description || "No description"}
                </p>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Owner:</span>{" "}
                <span className="font-mono text-xs">
                  {assetQuery.data.owner.slice(0, 6)}...
                  {assetQuery.data.owner.slice(-4)}
                </span>
              </div>
              {assetQuery.data.metadata.image && (
                <img
                  src={ipfsToHttp(assetQuery.data.metadata.image)}
                  alt={assetQuery.data.metadata.name}
                  className="w-full h-32 object-cover rounded"
                />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function determineMediaType(
  url: string,
  contentType: string,
): "image" | "video" | "music" | "voiceover" {
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "music";
  if (contentType.startsWith("image/")) return "image";

  const ext = url.split(".").pop()?.toLowerCase().split("?")[0];
  if (["mp4", "webm", "mov", "avi"].includes(ext || "")) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac"].includes(ext || "")) return "music";
  return "image";
}
