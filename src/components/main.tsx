"use client";

import BottomBar from "@/components/bottom-bar";
import Header from "@/components/header";
import RightPanel from "@/components/right-panel";
import VideoPreview from "@/components/video-preview";
import {
  VideoProjectStoreContext,
  createVideoProjectStore,
} from "@/data/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useStore } from "zustand";
import { ExportDialog } from "./export-dialog";
import { ImportOriginDialog } from "./import-origin-dialog";
import { KeyDialog } from "./key-dialog";
import LeftPanel from "./left-panel";
import { MediaGallerySheet } from "./media-gallery";
import { MintDialog } from "./mint-dialog";
import { OriginProvider } from "./origin-provider";
import { ProjectDialog } from "./project-dialog";
import { ToastProvider } from "./ui/toast";
import { Toaster } from "./ui/toaster";
import { CampModal } from "@campnetwork/origin/react";

// Origin client ID - get from https://camp.network
const ORIGIN_CLIENT_ID = process.env.NEXT_PUBLIC_ORIGIN_CLIENT_ID || "";

type AppProps = {
  projectId: string;
};

export function App({ projectId }: AppProps) {
  const [keyDialog, setKeyDialog] = useState(false);

  const queryClient = useRef(new QueryClient()).current;
  const projectStore = useRef(
    createVideoProjectStore({
      projectId,
    }),
  ).current;
  const projectDialogOpen = useStore(projectStore, (s) => s.projectDialogOpen);
  const selectedMediaId = useStore(projectStore, (s) => s.selectedMediaId);
  const setSelectedMediaId = useStore(
    projectStore,
    (s) => s.setSelectedMediaId,
  );
  const handleOnSheetOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedMediaId(null);
    }
  };
  const isExportDialogOpen = useStore(projectStore, (s) => s.exportDialogOpen);
  const setExportDialogOpen = useStore(
    projectStore,
    (s) => s.setExportDialogOpen,
  );
  // Origin dialog states
  const mintDialogOpen = useStore(projectStore, (s) => s.mintDialogOpen);
  const setMintDialogOpen = useStore(projectStore, (s) => s.setMintDialogOpen);
  const importOriginDialogOpen = useStore(
    projectStore,
    (s) => s.importOriginDialogOpen,
  );
  const setImportOriginDialogOpen = useStore(
    projectStore,
    (s) => s.setImportOriginDialogOpen,
  );
  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <VideoProjectStoreContext.Provider value={projectStore}>
          <OriginProvider clientId={ORIGIN_CLIENT_ID}>
            <div className="flex flex-col relative overflow-x-hidden h-screen bg-background">
              <Header openKeyDialog={() => setKeyDialog(true)} />
              <main className="flex overflow-hidden h-full w-screen">
                <LeftPanel />
                <div className="flex flex-col flex-1 min-w-0">
                  <VideoPreview />
                  <BottomBar />
                </div>
              </main>
              <RightPanel />
            </div>
            <Toaster />
            <ProjectDialog open={projectDialogOpen} />
            <ExportDialog
              open={isExportDialogOpen}
              onOpenChange={setExportDialogOpen}
            />
            <KeyDialog
              open={keyDialog}
              onOpenChange={(open) => setKeyDialog(open)}
            />
            <MediaGallerySheet
              open={selectedMediaId !== null}
              onOpenChange={handleOnSheetOpenChange}
              selectedMediaId={selectedMediaId ?? ""}
            />
            {/* Origin Protocol - CampModal handles wallet connection */}
            <CampModal injectButton={false} />
            <MintDialog
              open={mintDialogOpen}
              onOpenChange={(open) => setMintDialogOpen(open)}
            />
            <ImportOriginDialog
              open={importOriginDialogOpen}
              onOpenChange={setImportOriginDialogOpen}
            />
          </OriginProvider>
        </VideoProjectStoreContext.Provider>
      </QueryClientProvider>
    </ToastProvider>
  );
}
