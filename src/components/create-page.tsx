"use client";

import { useToast } from "@/hooks/use-toast";
import {
  AVAILABLE_ENDPOINTS,
  type ApiInfo,
  calculateModelCost,
  fal,
} from "@/lib/fal";
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
  InfoIcon,
  KeyIcon,
  Loader2,
  SparklesIcon,
  TypeIcon,
  UploadIcon,
  VideoIcon,
  XIcon,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const ALL_ENDPOINTS = [...AVAILABLE_ENDPOINTS, ...RUNWARE_ENDPOINTS];
const queryClient = new QueryClient();

// Origin client ID
const ORIGIN_CLIENT_ID = process.env.NEXT_PUBLIC_ORIGIN_CLIENT_ID || "";

// Helper to determine if endpoint requires image input
function requiresImageInput(endpoint: ApiInfo): boolean {
  return (
    endpoint.inputAsset?.includes("image") ||
    (Array.isArray(endpoint.inputAsset) &&
      endpoint.inputAsset.some(
        (a) => a === "image" || (typeof a === "object" && a.type === "image"),
      )) ||
    false
  );
}

// Helper to get input type label
function getInputTypeLabel(endpoint: ApiInfo): string {
  const needsImage = requiresImageInput(endpoint);
  if (endpoint.category === "video") {
    return needsImage ? "Image → Video" : "Text → Video";
  }
  return needsImage ? "Image → Image" : "Text → Image";
}

type ContentType = "image" | "video";

interface GeneratedContent {
  blob: Blob;
  url: string;
  type: ContentType;
  thumbnailBlob?: Blob | null;
  isUploaded?: boolean; // Track if this was uploaded vs generated
}

interface ReferenceImage {
  blob: Blob;
  url: string;
}

function CreatePageInner() {
  const { toast } = useToast();
  const { authenticated } = useAuthState();
  const { openModal } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceImageRef = useRef<HTMLInputElement>(null);

  // Key dialog state
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [hasFalKey, setHasFalKey] = useState(false);
  const [hasRunwareKey, setHasRunwareKey] = useState(false);

  // Check for API keys on mount and when dialog closes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-check when dialog closes
  useEffect(() => {
    const falKey = localStorage.getItem("falKey");
    const runwareKey = localStorage.getItem("runwareKey");
    setHasFalKey(!!falKey);
    setHasRunwareKey(!!runwareKey);
  }, [keyDialogOpen]);

  // Model & Generation State
  const [generationMode, setGenerationMode] = useState<"image" | "video">(
    "image",
  );
  const [endpointId, setEndpointId] = useState(ALL_ENDPOINTS[0].endpointId);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false); // Track if user has generated before
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  // Reference image for Image→X models
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(
    null,
  );

  // Filter endpoints by mode AND available API keys
  const availableEndpoints = useMemo(() => {
    return ALL_ENDPOINTS.filter((e) => {
      // Filter by provider - only show models for providers with API keys
      if (e.provider === "fal" && !hasFalKey) return false;
      if (e.provider === "runware" && !hasRunwareKey) return false;
      return true;
    });
  }, [hasFalKey, hasRunwareKey]);

  // Group image endpoints by input type
  const imageEndpoints = useMemo(() => {
    const all = availableEndpoints.filter(
      (e) =>
        e.category === "image" ||
        (!e.category && !e.endpointId.includes("video")),
    );
    return {
      textToImage: all.filter((e) => !requiresImageInput(e)),
      imageToImage: all.filter((e) => requiresImageInput(e)),
    };
  }, [availableEndpoints]);

  // Group video endpoints by input type
  const videoEndpoints = useMemo(() => {
    const all = availableEndpoints.filter(
      (e) =>
        e.category === "video" ||
        e.endpointId.includes("video") ||
        e.endpointId.includes("kling") ||
        e.endpointId.includes("runway") ||
        e.endpointId.includes("luma"),
    );
    return {
      textToVideo: all.filter((e) => !requiresImageInput(e)),
      imageToVideo: all.filter((e) => requiresImageInput(e)),
    };
  }, [availableEndpoints]);

  // Switch to first endpoint of new mode when mode changes
  const handleModeChange = (mode: "image" | "video") => {
    setGenerationMode(mode);
    // Get first available endpoint from the appropriate group
    let firstEndpoint: ApiInfo | undefined;
    if (mode === "image") {
      firstEndpoint =
        imageEndpoints.textToImage[0] || imageEndpoints.imageToImage[0];
    } else {
      firstEndpoint =
        videoEndpoints.textToVideo[0] || videoEndpoints.imageToVideo[0];
    }
    if (firstEndpoint) {
      setEndpointId(firstEndpoint.endpointId);
    }
    // Clear reference image when switching modes
    setReferenceImage(null);
  };

  // Check if current endpoint requires image input
  const currentRequiresImage = useMemo(() => {
    const endpoint = ALL_ENDPOINTS.find((e) => e.endpointId === endpointId);
    return endpoint ? requiresImageInput(endpoint) : false;
  }, [endpointId]);

  // Advanced params
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">(
    "16:9",
  );
  const [duration, setDuration] = useState(5);

  // Content State
  const [content, setContent] = useState<GeneratedContent | null>(null);

  // Mint Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("Created with Origin Studio");
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

  // Handle reference image upload
  const handleReferenceImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      const url = URL.createObjectURL(file);
      setReferenceImage({ blob: file, url });

      // Reset input
      if (referenceImageRef.current) {
        referenceImageRef.current.value = "";
      }
    },
    [toast],
  );

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a prompt to generate content",
        variant: "destructive",
      });
      return;
    }

    // Check if image input is required but not provided
    if (currentRequiresImage && !referenceImage) {
      toast({
        title: "Reference image required",
        description: "This model requires an image as input",
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

      // Upload reference image if needed
      if (currentRequiresImage && referenceImage) {
        const imageUrl = await fal.storage.upload(referenceImage.blob);
        // Different endpoints use different parameter names
        if (selectedEndpoint?.inputMap?.image_url) {
          input[selectedEndpoint.inputMap.image_url] = imageUrl;
        } else {
          input.image_url = imageUrl;
        }
      }

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
        // Always set aspect_ratio - some models (like Sora) use this instead of width/height
        input.aspect_ratio = aspectRatio;

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
      let blob = await response.blob();
      // Use endpoint type as primary signal since fal.ai may return wrong Content-Type
      const type: ContentType =
        isVideoEndpoint || blob.type.startsWith("video/") ? "video" : "image";

      // Ensure blob has correct MIME type (fal.ai sometimes returns wrong/empty Content-Type)
      if (type === "video" && !blob.type.startsWith("video/")) {
        blob = new Blob([blob], { type: "video/mp4" });
      } else if (type === "image" && !blob.type.startsWith("image/")) {
        blob = new Blob([blob], { type: "image/png" });
      }

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
        isUploaded: false,
      });
      setHasGenerated(true);

      toast({
        title: "Content generated!",
        description: "Your content is ready to mint",
      });
    } catch (error) {
      console.error("Generation error:", error);

      // Parse fal.ai error structure
      let errorMessage = "Please try again";
      if (error && typeof error === "object") {
        const err = error as {
          detail?: Array<{ msg?: string; type?: string }>;
        };
        if (err.detail?.[0]?.msg) {
          errorMessage = err.detail[0].msg;
          if (err.detail[0].type === "content_policy_violation") {
            errorMessage = `Content policy violation: ${err.detail[0].msg}`;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
      }

      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }, [
    prompt,
    endpointId,
    aspectRatio,
    duration,
    isVideoEndpoint,
    selectedEndpoint,
    currentRequiresImage,
    referenceImage,
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
        isUploaded: true,
      });

      toast({
        title: "File uploaded",
        description:
          "Your content is ready to mint. Note: You can mint any content you have rights to.",
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
          description: description.trim() || "Created with Origin Studio",
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
    description,
    price,
    durationDays,
    royaltyPercent,
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
        {!hasFalKey && !hasRunwareKey && (
          <div className="rounded-lg border-2 border-orange-500/50 bg-orange-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-200">
                  API Key Required
                </h3>
                <p className="text-sm text-orange-200/80 mt-1">
                  You need a FAL API key to generate images and videos. One key
                  unlocks <strong>all models</strong> (Sora, Veo, Kling, FLUX,
                  etc). Get one at{" "}
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
                <div className="flex items-center gap-2 truncate">
                  {currentRequiresImage ? (
                    <ImageIcon className="h-4 w-4 text-blue-400" />
                  ) : (
                    <TypeIcon className="h-4 w-4 text-green-400" />
                  )}
                  <span className="truncate">
                    {selectedEndpoint?.label || "Select a model"}
                  </span>
                  {selectedEndpoint && (
                    <span className="text-xs text-muted-foreground">
                      ({getInputTypeLabel(selectedEndpoint)})
                    </span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search models..." />
                <CommandList className="max-h-[400px]">
                  <CommandEmpty>
                    {!hasFalKey && !hasRunwareKey
                      ? "Add an API key to see available models"
                      : "No models found."}
                  </CommandEmpty>

                  {generationMode === "image" ? (
                    <>
                      {imageEndpoints.textToImage.length > 0 && (
                        <CommandGroup heading="Text → Image (describe what you want)">
                          {imageEndpoints.textToImage.map((endpoint) => (
                            <CommandItem
                              key={endpoint.endpointId}
                              value={`${endpoint.label} text to image`}
                              onSelect={() => {
                                setEndpointId(endpoint.endpointId);
                                setModelPickerOpen(false);
                                setReferenceImage(null);
                              }}
                            >
                              <TypeIcon className="mr-2 h-4 w-4 text-green-400" />
                              <span className="flex-1">{endpoint.label}</span>
                              {endpoint.description && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <InfoIcon className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {endpoint.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {endpoint.cost || ""}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {imageEndpoints.imageToImage.length > 0 && (
                        <CommandGroup heading="Image → Image (upload image + describe changes)">
                          {imageEndpoints.imageToImage.map((endpoint) => (
                            <CommandItem
                              key={endpoint.endpointId}
                              value={`${endpoint.label} image to image`}
                              onSelect={() => {
                                setEndpointId(endpoint.endpointId);
                                setModelPickerOpen(false);
                              }}
                            >
                              <ImageIcon className="mr-2 h-4 w-4 text-blue-400" />
                              <span className="flex-1">{endpoint.label}</span>
                              {endpoint.description && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <InfoIcon className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {endpoint.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {endpoint.cost || ""}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </>
                  ) : (
                    <>
                      {videoEndpoints.textToVideo.length > 0 && (
                        <CommandGroup heading="Text → Video (describe what you want)">
                          {videoEndpoints.textToVideo.map((endpoint) => (
                            <CommandItem
                              key={endpoint.endpointId}
                              value={`${endpoint.label} text to video`}
                              onSelect={() => {
                                setEndpointId(endpoint.endpointId);
                                setModelPickerOpen(false);
                                setReferenceImage(null);
                              }}
                            >
                              <TypeIcon className="mr-2 h-4 w-4 text-green-400" />
                              <span className="flex-1">{endpoint.label}</span>
                              {endpoint.description && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <InfoIcon className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {endpoint.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {endpoint.cost || ""}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {videoEndpoints.imageToVideo.length > 0 && (
                        <CommandGroup heading="Image → Video (upload image to animate)">
                          {videoEndpoints.imageToVideo.map((endpoint) => (
                            <CommandItem
                              key={endpoint.endpointId}
                              value={`${endpoint.label} image to video`}
                              onSelect={() => {
                                setEndpointId(endpoint.endpointId);
                                setModelPickerOpen(false);
                              }}
                            >
                              <ImageIcon className="mr-2 h-4 w-4 text-blue-400" />
                              <span className="flex-1">{endpoint.label}</span>
                              {endpoint.description && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <InfoIcon className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {endpoint.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {endpoint.cost || ""}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Reference Image Upload (for Image→X models) */}
        {currentRequiresImage && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-400" />
              Reference Image (required)
            </Label>
            {referenceImage ? (
              <div className="relative rounded-lg border overflow-hidden bg-muted/30">
                <img
                  src={referenceImage.url}
                  alt="Reference"
                  className="w-full h-32 object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => setReferenceImage(null)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => referenceImageRef.current?.click()}
                onKeyDown={(e) =>
                  e.key === "Enter" && referenceImageRef.current?.click()
                }
              >
                <UploadIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload an image to transform
                </p>
              </div>
            )}
            <input
              ref={referenceImageRef}
              type="file"
              accept="image/*"
              onChange={handleReferenceImageUpload}
              className="hidden"
            />
          </div>
        )}

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

          {/* Action Buttons - only show if no content yet */}
          {!content && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleGenerate}
                disabled={
                  generating ||
                  !prompt.trim() ||
                  (currentRequiresImage && !referenceImage)
                }
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
          )}
        </div>

        {/* Generate Again button - shown after content is generated */}
        {content && !mintSuccess && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleGenerate}
              disabled={
                generating ||
                !prompt.trim() ||
                (currentRequiresImage && !referenceImage)
              }
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4 mr-2" />
              )}
              Generate Again
              {estimatedCost !== null && ` (~$${estimatedCost.toFixed(3)})`}
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              Start Over
            </Button>
          </div>
        )}

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

              <div className="space-y-2">
                <Label htmlFor="mint-description">Description</Label>
                <Input
                  id="mint-description"
                  placeholder="Describe your creation"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
