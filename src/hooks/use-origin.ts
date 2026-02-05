"use client";

import { useVideoComposition } from "@/data/queries";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { useCallback, useMemo } from "react";

/**
 * Hook for accessing wallet state and triggering wallet dialog
 */
export function useOriginWallet() {
  const walletAddress = useVideoProjectStore((s) => s.walletAddress);
  const setWalletDialogOpen = useVideoProjectStore(
    (s) => s.setWalletDialogOpen,
  );

  const openWalletDialog = useCallback(() => {
    setWalletDialogOpen(true);
  }, [setWalletDialogOpen]);

  return {
    walletAddress,
    isConnected: !!walletAddress,
    openWalletDialog,
  };
}

/**
 * Hook that requires wallet connection before executing a callback
 */
export function useRequireWallet() {
  const { walletAddress, openWalletDialog } = useOriginWallet();

  const requireWallet = useCallback(
    (callback: () => void): boolean => {
      if (!walletAddress) {
        openWalletDialog();
        return false;
      }
      callback();
      return true;
    },
    [walletAddress, openWalletDialog],
  );

  return {
    requireWallet,
    isConnected: !!walletAddress,
  };
}

/**
 * Hook for tracking parent Origin IPs used in the current project
 * Used when minting derivative works to attribute royalties
 */
export function useOriginParentTracking() {
  const projectId = useProjectId();
  const { data: composition } = useVideoComposition(projectId);

  const parentTokenIds = useMemo((): string[] => {
    if (!composition) return [];

    const parentIds: string[] = [];
    const usedMediaIds = new Set<string>();

    // Collect all media IDs used in keyframes
    for (const frame of Object.values(composition.frames).flat()) {
      if (frame.data.mediaId) {
        usedMediaIds.add(frame.data.mediaId);
      }
    }

    // Filter for Origin media items and extract their token IDs
    for (const mediaId of Array.from(usedMediaIds)) {
      const media = composition.mediaItems[mediaId];
      if (media?.kind === "origin" && media.originTokenId) {
        parentIds.push(media.originTokenId);
      }
    }

    // Origin protocol supports max 8 parents
    return parentIds.slice(0, 8);
  }, [composition]);

  const hasOriginParents = parentTokenIds.length > 0;

  return {
    parentTokenIds,
    hasOriginParents,
    parentCount: parentTokenIds.length,
  };
}

/**
 * Hook for opening mint dialog with data
 */
export function useMintDialog() {
  const setMintDialogOpen = useVideoProjectStore((s) => s.setMintDialogOpen);
  const { requireWallet } = useRequireWallet();

  const openMintDialog = useCallback(
    (data?: { mediaId?: string; exportedBlob?: Blob }) => {
      requireWallet(() => {
        setMintDialogOpen(true, data);
      });
    },
    [requireWallet, setMintDialogOpen],
  );

  const closeMintDialog = useCallback(() => {
    setMintDialogOpen(false);
  }, [setMintDialogOpen]);

  return {
    openMintDialog,
    closeMintDialog,
  };
}

/**
 * Hook for opening import dialog
 */
export function useImportDialog() {
  const setImportOriginDialogOpen = useVideoProjectStore(
    (s) => s.setImportOriginDialogOpen,
  );

  const openImportDialog = useCallback(() => {
    setImportOriginDialogOpen(true);
  }, [setImportOriginDialogOpen]);

  const closeImportDialog = useCallback(() => {
    setImportOriginDialogOpen(false);
  }, [setImportOriginDialogOpen]);

  return {
    openImportDialog,
    closeImportDialog,
  };
}
