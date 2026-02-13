"use client";

import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_ENDPOINTS, calculateModelCost, fal } from "@/lib/fal";
import { extractVideoThumbnail } from "@/lib/ffmpeg";
import {
  type SimpleLicenseTerms,
  ethToWei,
  mintOriginFile,
  percentToBps,
} from "@/lib/origin";
import { RUNWARE_ENDPOINTS } from "@/lib/runware-models";
import { CampModal, useModal } from "@campnetwork/origin/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ImageIcon,
  KeyIcon,
  Loader2,
  SparklesIcon,
  UploadIcon,
  VideoIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Header from "@/components/header";
import { KeyDialog } from "@/components/key-dialog";
import { OriginProvider, useAuthState } from "@/components/origin-provider";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Slider } from "./ui/slider";
import { Textarea } from "./ui/textarea";
import { Toaster } from "./ui/toaster";

const ALL_ENDPOINTS = [...AVAILABLE_ENDPOINTS, ...RUNWARE_ENDPOINTS];
const queryClient = new QueryClient();

// Origin client ID
const ORIGIN_CLIENT_ID = process.env.NEXT_PUBLIC_ORIGIN_CLIENT_ID || "";

type ContentType = "image" | "video";

interface GeneratedContent {
  blob: Blob;
  url: string;
  type: ContentType;
  thumbnailBlob?: Blob | null;
}

function CreatePageInner() {
  const { toast } = useToast();
  const { authenticated } = useAuthState();
  const { openModal } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Key dialog state
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check for API key on mount and when dialog closes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-check when dialog closes
  useEffect(() => {
    const falKey = localStorage.getItem("falKey");
    setHasApiKey(!!falKey);
  }, [keyDialogOpen]);

  // Model & Generation State
  const [generationMode, setGenerationMode] = useState<"image" | "video">(
    "image",
  );
  const [endpointId, setEndpointId] = useState(ALL_ENDPOINTS[0].endpointId);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  // Filter endpoints by mode
  const imageEndpoints = useMemo(
    () =>
      ALL_ENDPOINTS.filter(
        (e) =>
          e.category === "image" ||
          (!e.category && !e.endpointId.includes("video")),
      ),
    [],
  );

  const videoEndpoints = useMemo(
    () =>
      ALL_ENDPOINTS.filter(
        (e) =>
          e.category === "video" ||
          e.endpointId.includes("video") ||
          e.endpointId.includes("kling") ||
          e.endpointId.includes("runway") ||
          e.endpointId.includes("luma"),
      ),
    [],
  );

  const currentEndpoints =
    generationMode === "image" ? imageEndpoints : videoEndpoints;

  // Switch to first endpoint of new mode when mode changes
  const handleModeChange = (mode: "image" | "video") => {
    setGenerationMode(mode);
    const endpoints = mode === "image" ? imageEndpoints : videoEndpoints;
    if (endpoints.length > 0) {
      setEndpointId(endpoints[0].endpointId);
    }
  };

  // Advanced params
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">(
    "16:9",
  );
  const [duration, setDuration] = useState(5);

  // Content State
  const [content, setContent] = useState<GeneratedContent | null>(null);

  // Mint Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0.001");
  const [durationDays, setDurationDays] = useState(7);
  const [royaltyPercent, setRoyaltyPercent] = useState(10);
  const [minting, setMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);

  const selectedEndpoint = useMemo(
    () => ALL_ENDPOINTS.find((e) => e.endpointId === endpointId),
    [endpointId],
  );

  const isVideoEndpoint = useMemo(() => {
    const ep = selectedEndpoint;
    if (!ep) return false;
    return (
      ep.category === "video" ||
      ep.endpointId.includes("video") ||
      ep.endpointId.includes("kling") ||
      ep.endpointId.includes("runway") ||
      ep.endpointId.includes("luma")
    );
  }, [selectedEndpoint]);

  const estimatedCost = useMemo(() => {
    if (
      !endpointId ||
      !AVAILABLE_ENDPOINTS.some((e) => e.endpointId === endpointId)
    )
      return null;
    return calculateModelCost(endpointId, { duration });
  }, [endpointId, duration]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt to generate content",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    setContent(null);

    try {
      // Build input based on endpoint configuration
      const input: Record<string, unknown> = {
        prompt: prompt.trim(),
        ...(selectedEndpoint?.initialInput || {}),
      };

      // Handle aspect ratio / dimensions based on endpoint
      if (!isVideoEndpoint) {
        // For image models
        if (selectedEndpoint?.availableDimensions) {
          // Use specific dimensions from endpoint config
          const dims =
            selectedEndpoint.availableDimensions.find((d) => {
              if (aspectRatio === "16:9") return d.width > d.height;
              if (aspectRatio === "9:16") return d.height > d.width;
              return d.width === d.height;
            }) || selectedEndpoint.availableDimensions[0];
          input.width = dims.width;
          input.height = dims.height;
        } else if (selectedEndpoint?.supportedAspectRatios) {
          // Use aspect ratio string
          input.aspect_ratio = aspectRatio;
        } else {
          // Default fallback - use aspect_ratio
          input.aspect_ratio = aspectRatio;
        }
      } else {
        // For video models
        if (selectedEndpoint?.availableDimensions) {
          const dims =
            selectedEndpoint.availableDimensions.find((d) => {
              if (aspectRatio === "16:9") return d.width > d.height;
              if (aspectRatio === "9:16") return d.height > d.width;
              return d.width === d.height;
            }) || selectedEndpoint.availableDimensions[0];
          input.width = dims.width;
          input.height = dims.height;
        }

        // Use valid duration from endpoint config
        if (selectedEndpoint?.availableDurations) {
          const validDuration = selectedEndpoint.availableDurations.includes(
            duration,
          )
            ? duration
            : selectedEndpoint.defaultDuration ||
              selectedEndpoint.availableDurations[0];
          input.duration = validDuration;
        } else if (selectedEndpoint?.defaultDuration) {
          input.duration = selectedEndpoint.defaultDuration;
        } else {
          input.duration = duration;
        }
      }

      console.log("[Create] Generating with endpoint:", endpointId);
      console.log("[Create] Input:", JSON.stringify(input, null, 2));

      const result = await fal.subscribe(endpointId, {
        input,
        logs: true,
      });

      // Extract URL from result
      let contentUrl: string | null = null;
      const data = result.data as {
        video?: { url?: string } | string;
        images?: Array<{ url?: string }>;
        image?: { url?: string };
      };

      if (typeof data.video === "object" && data.video?.url) {
        contentUrl = data.video.url;
      } else if (typeof data.video === "string") {
        contentUrl = data.video;
      } else if (data.images?.[0]?.url) {
        contentUrl = data.images[0].url;
      } else if (data.image?.url) {
        contentUrl = data.image.url;
      }

      if (!contentUrl) {
        throw new Error("No content URL in response");
      }

      // Fetch the content
      const response = await fetch(contentUrl);
      const blob = await response.blob();
      const type: ContentType = blob.type.startsWith("video/")
        ? "video"
        : "image";

      // Generate thumbnail for videos
      let thumbnailBlob: Blob | null = null;
      if (type === "video") {
        const blobUrl = URL.createObjectURL(blob);
        thumbnailBlob = await extractVideoThumbnail(blobUrl);
      }

      setContent({
        blob,
        url: URL.createObjectURL(blob),
        type,
        thumbnailBlob,
      });

      toast({
        title: "Content generated!",
        description: "Your content is ready to mint",
      });
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: selectedEndpoint is derived from endpointId
  }, [
    prompt,
    endpointId,
    aspectRatio,
    duration,
    isVideoEndpoint,
    selectedEndpoint,
    toast,
  ]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const type: ContentType = file.type.startsWith("video/")
        ? "video"
        : "image";
      const url = URL.createObjectURL(file);

      let thumbnailBlob: Blob | null = null;
      if (type === "video") {
        thumbnailBlob = await extractVideoThumbnail(url);
      }

      setContent({
        blob: file,
        url,
        type,
        thumbnailBlob,
      });

      toast({
        title: "File uploaded",
        description: "Your content is ready to mint",
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [toast],
  );

  const handleMint = useCallback(async () => {
    if (!authenticated) {
      openModal();
      return;
    }

    if (!content) {
      toast({
        title: "No content",
        description: "Please generate or upload content first",
        variant: "destructive",
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your IP",
        variant: "destructive",
      });
      return;
    }

    setMinting(true);

    try {
      const license: SimpleLicenseTerms = {
        price: ethToWei(Number.parseFloat(price) || 0.001),
        duration: durationDays * 86400,
        royaltyBps: percentToBps(royaltyPercent),
        paymentToken: "0x0000000000000000000000000000000000000000",
      };

      const tokenId = await mintOriginFile(
        content.blob,
        {
          name: name.trim(),
          description: prompt || "Created with Campfire",
        },
        license,
        undefined,
        {
          previewImage: content.thumbnailBlob,
        },
      );

      setMintSuccess(true);
      toast({
        title: "IP Minted!",
        description: `Your IP has been minted. Token ID: ${tokenId}`,
      });
    } catch (error) {
      console.error("Mint error:", error);
      toast({
        title: "Minting failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setMinting(false);
    }
  }, [
    authenticated,
    content,
    name,
    price,
    durationDays,
    royaltyPercent,
    prompt,
    openModal,
    toast,
  ]);

  const handleReset = () => {
    setContent(null);
    setName("");
    setMintSuccess(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header openKeyDialog={() => setKeyDialogOpen(true)} />
      <div className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
        {/* Page Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Create & Mint IP</h1>
          <p className="text-muted-foreground">
            Generate or upload content, then mint it as intellectual property
          </p>
        </div>

        {/* API Key Warning */}
        {!hasApiKey && (
          <div className="rounded-lg border-2 border-orange-500/50 bg-orange-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-200">
                  API Key Required
                </h3>
                <p className="text-sm text-orange-200/80 mt-1">
                  You need a FAL API key to generate images and videos. Get one
                  free at{" "}
                  <a
                    href="https://fal.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-orange-100"
                  >
                    fal.ai
                  </a>
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => setKeyDialogOpen(true)}
                >
                  <KeyIcon className="h-4 w-4 mr-2" />
                  Add API Key
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Generation Mode Tabs */}
        <div className="space-y-3">
          <div className="flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => handleModeChange("image")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                generationMode === "image"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              Image
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("video")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                generationMode === "video"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <VideoIcon className="h-4 w-4" />
              Video
            </button>
          </div>

          {/* Model Selector */}
          <Popover open={modelPickerOpen} onOpenChange={setModelPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-10">
                <span className="truncate">
                  {selectedEndpoint?.label || "Select a model"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search models..." />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty>No models found.</CommandEmpty>
                  <CommandGroup>
                    {currentEndpoints.map((endpoint) => (
                      <CommandItem
                        key={endpoint.endpointId}
                        value={endpoint.label}
                        onSelect={() => {
                          setEndpointId(endpoint.endpointId);
                          setModelPickerOpen(false);
                        }}
                      >
                        {generationMode === "video" ? (
                          <VideoIcon className="mr-2 h-4 w-4" />
                        ) : (
                          <ImageIcon className="mr-2 h-4 w-4" />
                        )}
                        {endpoint.label}
                        {endpoint.provider && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            {endpoint.provider}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Preview Area */}
        <div
          className={`relative rounded-lg border-2 border-dashed overflow-hidden bg-muted/30 ${
            aspectRatio === "16:9"
              ? "aspect-video"
              : aspectRatio === "9:16"
                ? "aspect-[9/16] max-h-[500px]"
                : "aspect-square"
          }`}
        >
          {content ? (
            content.type === "video" ? (
              // biome-ignore lint/a11y/useMediaCaption: user-generated content without captions
              <video
                src={content.url}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={content.url}
                alt="Generated content"
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              {generating ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin mb-4" />
                  <p>Generating...</p>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-12 w-12 mb-4 opacity-50" />
                  <p>Generate or upload content</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Prompt & Controls */}
        <div className="space-y-4">
          <Textarea
            placeholder="Describe what you want to create..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />

          {/* Advanced Parameters */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                Advanced Parameters
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <div className="flex gap-2">
                  {(["16:9", "9:16", "1:1"] as const).map((ar) => (
                    <Button
                      key={ar}
                      variant={aspectRatio === ar ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAspectRatio(ar)}
                    >
                      {ar}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Duration (for video) */}
              {isVideoEndpoint && (
                <div className="space-y-2">
                  <Label>Duration: {duration}s</Label>
                  <Slider
                    value={[duration]}
                    onValueChange={([v]) => setDuration(v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4 mr-2" />
              )}
              Generate
              {estimatedCost !== null && ` (~$${estimatedCost.toFixed(3)})`}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Mint Section */}
        {content && !mintSuccess && (
          <div className="rounded-lg p-6 border-2 border-primary/50 bg-primary/5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Ready to Mint
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mint-name">Name *</Label>
                <Input
                  id="mint-name"
                  placeholder="Name your creation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mint-price">Price (CAMP)</Label>
                  <Input
                    id="mint-price"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration: {durationDays} days</Label>
                  <Slider
                    value={[durationDays]}
                    onValueChange={([v]) => setDurationDays(v)}
                    min={1}
                    max={30}
                    step={1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Royalty: {royaltyPercent}%</Label>
                <Slider
                  value={[royaltyPercent]}
                  onValueChange={([v]) => setRoyaltyPercent(v)}
                  min={1}
                  max={50}
                  step={1}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleMint}
                disabled={minting || !name.trim()}
              >
                {minting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {authenticated ? "Mint as IP" : "Connect Wallet to Mint"}
              </Button>
            </div>
          </div>
        )}

        {/* Success State */}
        {mintSuccess && (
          <div className="rounded-lg p-6 border-2 border-green-500/50 bg-green-500/5 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              IP Minted Successfully!
            </h3>
            <p className="text-muted-foreground mb-4">
              Your content has been registered on Origin Protocol.
            </p>
            <Button onClick={handleReset}>Create Another</Button>
          </div>
        )}
      </div>

      {/* Key Dialog */}
      <KeyDialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen} />
    </div>
  );
}

export function CreatePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <OriginProvider clientId={ORIGIN_CLIENT_ID}>
        <CreatePageInner />
        <CampModal injectButton={false} />
        <Toaster />
      </OriginProvider>
    </QueryClientProvider>
  );
}
