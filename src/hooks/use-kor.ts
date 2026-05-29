"use client";

import { useVideoComposition } from "@/data/queries";
import { useProjectId, useVideoProjectStore } from "@/data/store";
import { useIsWalletConfigured } from "@/components/kor-provider";
import { useCallback, useMemo } from "react";
import { useAccount, useDisconnect } from "wagmi";

/**
 * Hook for accessing wallet state via wagmi
 * Returns safe defaults when wallet is not configured
 */
export function useKorWallet() {
  const isWalletConfigured = useIsWalletConfigured();

  // Wagmi hooks work because we always have WagmiProvider
  const account = useAccount();
  const { disconnect } = useDisconnect();

  return {
    walletAddress: account.address,
    isConnected: account.isConnected,
    chainId: account.chain?.id,
    // openConnectModal will be provided by a separate component that uses RainbowKit
    openConnectModal: () => {
      console.warn("Use WalletConnectButton component instead");
    },
    disconnect,
    isWalletConfigured,
  };
}

/**
 * Hook that requires wallet connection before executing a callback
 */
export function useRequireWallet() {
  const { isConnected, openConnectModal } = useKorWallet();

  const requireWallet = useCallback(
    (callback: () => void): boolean => {
      if (!isConnected) {
        openConnectModal();
        return false;
      }
      callback();
      return true;
    },
    [isConnected, openConnectModal],
  );

  return {
    requireWallet,
    isConnected,
  };
}

/**
 * Hook for tracking parent Kor IPs used in the current project
 * Used when minting derivative works to attribute royalties
 */
export function useKorParentTracking() {
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

    // Filter for Kor media items and extract their token IDs
    for (const mediaId of Array.from(usedMediaIds)) {
      const media = composition.mediaItems[mediaId];
      if (media?.kind === "kor" && media.korTokenId) {
        parentIds.push(media.korTokenId);
      }
    }

    // Kor protocol supports max 8 parents
    return parentIds.slice(0, 8);
  }, [composition]);

  const hasKorParents = parentTokenIds.length > 0;

  return {
    parentTokenIds,
    hasKorParents,
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
  const setImportKorDialogOpen = useVideoProjectStore(
    (s) => s.setImportKorDialogOpen,
  );

  const openImportDialog = useCallback(() => {
    setImportKorDialogOpen(true);
  }, [setImportKorDialogOpen]);

  const closeImportDialog = useCallback(() => {
    setImportKorDialogOpen(false);
  }, [setImportKorDialogOpen]);

  return {
    openImportDialog,
    closeImportDialog,
  };
}
