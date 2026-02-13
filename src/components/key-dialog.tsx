"use client";

import { useVideoProjectStore } from "@/data/store";
import { useToast } from "@/hooks/use-toast";
import { fal } from "@/lib/fal";
import {
  type IpfsPinningProvider,
  checkHasIpfsCredentials,
  deleteUserIpfsCredentials,
  saveUserIpfsCredentials,
  verifyUserIpfsCredentials,
} from "@/lib/origin";
import { getRunwareClient, resetRunwareClient } from "@/lib/runware";
import { useTranslations } from "next-intl";

import { CheckCircle2, Loader, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type KeyDialogProps = {} & Parameters<typeof Dialog>[0];

export function KeyDialog({ onOpenChange, open, ...props }: KeyDialogProps) {
  const t = useTranslations("app.keyDialog");
  const [falKey, setFalKey] = useState("");
  const [runwareKey, setRunwareKey] = useState("");
  const [falTestStatus, setFalTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [runwareTestStatus, setRunwareTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const { toast } = useToast();

  // IPFS credentials state
  const walletAddress = useVideoProjectStore((s) => s.walletAddress);
  const hasIpfsCredentials = useVideoProjectStore((s) => s.hasIpfsCredentials);
  const setHasIpfsCredentials = useVideoProjectStore(
    (s) => s.setHasIpfsCredentials,
  );
  const [ipfsProvider, setIpfsProvider] =
    useState<IpfsPinningProvider>("pinata");
  const [ipfsJwt, setIpfsJwt] = useState("");
  const [ipfsProjectId, setIpfsProjectId] = useState("");
  const [ipfsProjectSecret, setIpfsProjectSecret] = useState("");
  const [ipfsToken, setIpfsToken] = useState("");
  const [ipfsTestStatus, setIpfsTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");

  const notifyApiKeysUpdated = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("apiKeysUpdated"));
    }
  };

  const testFalKey = async () => {
    if (!falKey) return;
    setFalTestStatus("testing");
    try {
      localStorage.setItem("falKey", falKey);
      notifyApiKeysUpdated();
      await fal.queue.submit("fal-ai/flux/schnell", {
        input: { prompt: "test", image_size: "square_hd", num_images: 1 },
      });
      setFalTestStatus("success");
      toast({
        title: "FAL API Key Valid",
        description: "Your key is working correctly",
      });
    } catch (error) {
      setFalTestStatus("error");
      toast({
        title: "FAL API Key Invalid",
        description: "Please check your key",
        variant: "destructive",
      });
    }
  };

  const testRunwareKey = async () => {
    if (!runwareKey) return;
    setRunwareTestStatus("testing");
    try {
      localStorage.setItem("runwareKey", runwareKey);
      notifyApiKeysUpdated();
      resetRunwareClient();
      const client = await getRunwareClient();
      if (!client) throw new Error("Failed to initialize");
      setRunwareTestStatus("success");
      toast({
        title: "Runware API Key Valid",
        description: "Your key is working correctly",
      });
    } catch (error) {
      setRunwareTestStatus("error");
      toast({
        title: "Runware API Key Invalid",
        description: "Please check your key",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (open) {
      setFalTestStatus("idle");
      setRunwareTestStatus("idle");
      setIpfsTestStatus("idle");
      // Check IPFS credentials status when dialog opens
      if (walletAddress) {
        checkHasIpfsCredentials().then(setHasIpfsCredentials);
      }
    }
  }, [open, walletAddress, setHasIpfsCredentials]);

  const verifyIpfsCredentials = async () => {
    setIpfsTestStatus("testing");
    try {
      // Build credentials based on provider
      const credentials = {
        provider: ipfsProvider,
        ...(ipfsProvider === "pinata" && { jwt: ipfsJwt }),
        ...(ipfsProvider === "infura" && {
          projectId: ipfsProjectId,
          projectSecret: ipfsProjectSecret,
        }),
        ...(ipfsProvider === "web3storage" && { token: ipfsToken }),
      };

      // Save first, then verify
      await saveUserIpfsCredentials(credentials);
      const result = await verifyUserIpfsCredentials();

      if (result.valid) {
        setIpfsTestStatus("success");
        setHasIpfsCredentials(true);
        toast({
          title: "IPFS Credentials Valid",
          description: "Your credentials are working correctly",
        });
      } else {
        setIpfsTestStatus("error");
        toast({
          title: "IPFS Credentials Invalid",
          description: result.error || "Please check your credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      setIpfsTestStatus("error");
      toast({
        title: "IPFS Verification Failed",
        description:
          error instanceof Error
            ? error.message
            : "Please check your credentials",
        variant: "destructive",
      });
    }
  };

  const deleteIpfsCredentials = async () => {
    try {
      await deleteUserIpfsCredentials();
      setHasIpfsCredentials(false);
      setIpfsJwt("");
      setIpfsProjectId("");
      setIpfsProjectSecret("");
      setIpfsToken("");
      setIpfsTestStatus("idle");
      toast({
        title: "IPFS Credentials Removed",
        description: "Your IPFS credentials have been deleted",
      });
    } catch (error) {
      toast({
        title: "Failed to Remove Credentials",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const isIpfsFieldValid = () => {
    if (ipfsProvider === "pinata") return ipfsJwt.length > 0;
    if (ipfsProvider === "infura")
      return ipfsProjectId.length > 0 && ipfsProjectSecret.length > 0;
    if (ipfsProvider === "web3storage") return ipfsToken.length > 0;
    return false;
  };

  useEffect(() => {
    if (open) {
      const savedFalKey = localStorage.getItem("falKey") || "";
      const savedRunwareKey = localStorage.getItem("runwareKey") || "";
      setFalKey(savedFalKey);
      setRunwareKey(savedRunwareKey);
    }
  }, [open]);

  const handleOnOpenChange = (isOpen: boolean) => {
    onOpenChange?.(isOpen);
  };

  const handleSave = () => {
    localStorage.setItem("falKey", falKey);
    localStorage.setItem("runwareKey", runwareKey);
    notifyApiKeysUpdated();
    handleOnOpenChange(false);
    setFalKey("");
    setRunwareKey("");
  };

  return (
    <Dialog {...props} onOpenChange={handleOnOpenChange} open={open}>
      <DialogContent className="flex flex-col max-w-lg h-fit">
        <DialogHeader>
          <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col flex-1 gap-8">
          <h2 className="text-lg font-semibold flex flex-row gap-2">
            {t("saveKey")}
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="fal-api-key"
                className="text-sm font-medium text-muted-foreground"
              >
                FAL API Key
              </label>
              <div className="flex gap-2">
                <Input
                  id="fal-api-key"
                  type="password"
                  placeholder={t("placeholder")}
                  value={falKey}
                  onChange={(e) => setFalKey(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={testFalKey}
                  disabled={!falKey || falTestStatus === "testing"}
                >
                  {falTestStatus === "testing" ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : falTestStatus === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
            </div>
            <div>
              <label
                htmlFor="runware-api-key"
                className="text-sm font-medium text-muted-foreground"
              >
                Runware API Key
              </label>
              <div className="flex gap-2">
                <Input
                  id="runware-api-key"
                  type="password"
                  placeholder={t("runwarePlaceholder")}
                  value={runwareKey}
                  onChange={(e) => setRunwareKey(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={testRunwareKey}
                  disabled={!runwareKey || runwareTestStatus === "testing"}
                >
                  {runwareTestStatus === "testing" ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : runwareTestStatus === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-sm">
              {t("privacyNotice")}
            </p>
          </div>

          {/* IPFS Storage Section */}
          <div className="border-t pt-6 mt-2">
            <h3 className="text-md font-medium mb-2">
              IPFS Storage (for large files)
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Configure your own IPFS pinning service for minting large video
              files. This allows you to upload files directly to your IPFS
              provider.
            </p>

            {!walletAddress ? (
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                Connect your wallet to configure IPFS credentials
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="ipfs-provider"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    IPFS Provider
                  </label>
                  <Select
                    value={ipfsProvider}
                    onValueChange={(v) =>
                      setIpfsProvider(v as IpfsPinningProvider)
                    }
                  >
                    <SelectTrigger id="ipfs-provider" className="mt-1">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pinata">
                        Pinata (Recommended)
                      </SelectItem>
                      <SelectItem value="infura">Infura</SelectItem>
                      <SelectItem value="web3storage">web3.storage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ipfsProvider === "pinata" && (
                  <div>
                    <label
                      htmlFor="pinata-jwt"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Pinata JWT Token
                    </label>
                    <Input
                      id="pinata-jwt"
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIs..."
                      value={ipfsJwt}
                      onChange={(e) => setIpfsJwt(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get your JWT from{" "}
                      <a
                        href="https://app.pinata.cloud/developers/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        Pinata API Keys
                      </a>
                    </p>
                  </div>
                )}

                {ipfsProvider === "infura" && (
                  <>
                    <div>
                      <label
                        htmlFor="infura-project-id"
                        className="text-sm font-medium text-muted-foreground"
                      >
                        Project ID
                      </label>
                      <Input
                        id="infura-project-id"
                        type="text"
                        placeholder="Your Infura Project ID"
                        value={ipfsProjectId}
                        onChange={(e) => setIpfsProjectId(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="infura-project-secret"
                        className="text-sm font-medium text-muted-foreground"
                      >
                        Project Secret
                      </label>
                      <Input
                        id="infura-project-secret"
                        type="password"
                        placeholder="Your Infura Project Secret"
                        value={ipfsProjectSecret}
                        onChange={(e) => setIpfsProjectSecret(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Create an IPFS project at{" "}
                      <a
                        href="https://infura.io/dashboard"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        Infura Dashboard
                      </a>
                    </p>
                  </>
                )}

                {ipfsProvider === "web3storage" && (
                  <div>
                    <label
                      htmlFor="web3storage-token"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      API Token
                    </label>
                    <Input
                      id="web3storage-token"
                      type="password"
                      placeholder="Your web3.storage API token"
                      value={ipfsToken}
                      onChange={(e) => setIpfsToken(e.target.value)}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get your token from{" "}
                      <a
                        href="https://web3.storage/tokens/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        web3.storage
                      </a>
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={verifyIpfsCredentials}
                    disabled={
                      !isIpfsFieldValid() || ipfsTestStatus === "testing"
                    }
                  >
                    {ipfsTestStatus === "testing" ? (
                      <Loader className="h-4 w-4 animate-spin mr-2" />
                    ) : ipfsTestStatus === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    ) : null}
                    {hasIpfsCredentials ? "Update & Verify" : "Save & Verify"}
                  </Button>
                  {hasIpfsCredentials && (
                    <Button
                      variant="outline"
                      onClick={deleteIpfsCredentials}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>

                {hasIpfsCredentials && ipfsTestStatus !== "success" && (
                  <p className="text-sm text-green-600 dark:text-green-500 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    IPFS credentials configured
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-row items-end justify-center gap-2">
            <Button onClick={handleSave}>{t("save")}</Button>
          </div>
        </div>

        <DialogFooter>
          <p className="text-muted-foreground text-sm mt-4 w-full text-center">
            {t.rich("footerText", {
              falLink: (chunks) => (
                <a
                  className="underline underline-offset-2 decoration-foreground/50 text-foreground"
                  href="https://fal.ai/dashboard/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {chunks}
                </a>
              ),
              runwareLink: (chunks) => (
                <a
                  className="underline underline-offset-2 decoration-foreground/50 text-foreground"
                  href="https://runware.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
