import { Contract, Interface, ethers } from "ethers";
import {
  IP_MODULE_ABI,
  NETWORKS,
  NFT_MODULE_ABI,
  ZERO_ADDRESS,
} from "./constants";
import type {
  CreateCollectionParams,
  CreateIPCollectionParams,
  KorSDKConfig,
  MintFromCollectionParams,
  MintFromProtocolCollectionParams,
  Network,
  NetworkConfig,
  RegisterDerivativeParams,
  RegisterIPParams,
  SignatureResponse,
  Signer,
} from "./types";

export class KorSDK {
  private apiKey: string;
  private network: Network;
  private config: NetworkConfig;

  constructor(options: KorSDKConfig) {
    this.apiKey = options.apiKey;
    this.network = options.network || "base-sepolia";
    this.config = NETWORKS[this.network];

    if (options.apiBaseUrl) {
      this.config = { ...this.config, apiBaseUrl: options.apiBaseUrl };
    }
  }

  // ============ API Helpers ============

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api-key": this.apiKey,
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API error: ${response.status}`);
    }

    return data as T;
  }

  // ============ Collections ============

  /**
   * Get a signature to create a new NFT collection
   */
  async createCollection(
    params: CreateCollectionParams,
  ): Promise<SignatureResponse> {
    return this.fetch<SignatureResponse>(
      `/nft-module/create-collection/${this.config.chainId}`,
      {
        method: "POST",
        body: JSON.stringify(params),
      },
    );
  }

  /**
   * Get a signature to create a new IP collection
   */
  async createIPCollection(
    params: CreateIPCollectionParams,
  ): Promise<SignatureResponse> {
    const body = {
      name: params.name,
      symbol: params.symbol,
      mintPrice: params.mintPrice,
      maxSupply: params.maxSupply,
      licensors: params.licensors || [ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS],
      licenseTermID: params.licenseTermID || 0,
    };

    return this.fetch<SignatureResponse>(
      `/nft-module/create-ip-collection/${this.config.chainId}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  }

  /**
   * Get a signature to mint from a collection
   */
  async mintFromCollection(
    params: MintFromCollectionParams,
  ): Promise<SignatureResponse> {
    return this.fetch<SignatureResponse>(
      `/nft-module/mint-from-collection/${this.config.chainId}`,
      {
        method: "POST",
        body: JSON.stringify({
          collectionAddress: params.collectionAddress,
          recipientAddress: params.recipientAddress,
          metadataURI: params.metadataURI,
        }),
      },
    );
  }

  /**
   * Get a signature to mint from the protocol collection
   */
  async mintFromProtocolCollection(
    params: MintFromProtocolCollectionParams,
  ): Promise<SignatureResponse> {
    return this.fetch<SignatureResponse>(
      `/nft-module/mint-from-protocol-collection/${this.config.chainId}`,
      {
        method: "POST",
        body: JSON.stringify({
          recipientAddress: params.recipientAddress,
          metadataURI: params.metadataURI,
        }),
      },
    );
  }

  // ============ IP Registration ============

  /**
   * Get a signature to register an NFT as IP
   */
  async registerIP(params: RegisterIPParams): Promise<SignatureResponse> {
    const body = {
      tokenContract: params.tokenContract,
      tokenId: params.tokenId,
      licensors: params.licensors || [ZERO_ADDRESS, ZERO_ADDRESS, ZERO_ADDRESS],
    };

    return this.fetch<SignatureResponse>(
      `/ip-module/register-nft/${this.config.chainId}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  }

  /**
   * Get a signature to register a derivative IP
   */
  async registerDerivative(
    params: RegisterDerivativeParams,
  ): Promise<SignatureResponse> {
    return this.fetch<SignatureResponse>(
      `/ip-module/register-derivative/${this.config.chainId}`,
      {
        method: "POST",
        body: JSON.stringify(params),
      },
    );
  }

  // ============ Blockchain Submission ============

  /**
   * Submit a createCollection transaction to the blockchain
   */
  async submitCreateCollection(
    signatureResponse: SignatureResponse,
    signer: Signer,
  ): Promise<{ tx: any; collectionAddress: string }> {
    const contract = new Contract(
      this.config.nftModuleAddress,
      NFT_MODULE_ABI,
      signer,
    );

    const tx = await contract.createCollectionEncoded(
      signatureResponse.encodedData,
      signatureResponse.signature,
    );

    const receipt = await tx.wait();

    // Parse collection address from event
    let collectionAddress = "";
    const iface = new Interface(NFT_MODULE_ABI);
    if (receipt?.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "CollectionCreated") {
            collectionAddress = parsed.args.collectionAddress;
            break;
          }
        } catch (e) {}
      }
    }

    return { tx, collectionAddress };
  }

  /**
   * Submit a createIPCollection transaction to the blockchain
   */
  async submitCreateIPCollection(
    signatureResponse: SignatureResponse,
    signer: Signer,
  ): Promise<{
    tx: any;
    ipId: string;
    collectionAddress: string;
  }> {
    const contract = new Contract(
      this.config.nftModuleAddress,
      NFT_MODULE_ABI,
      signer,
    );

    const tx = await contract.createIPCollectionEncoded(
      signatureResponse.encodedData,
      signatureResponse.signature,
    );

    const receipt = await tx.wait();

    // Parse from event
    let ipId = "";
    let collectionAddress = "";
    const iface = new Interface(NFT_MODULE_ABI);
    if (receipt?.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "IPCollectionCreated") {
            ipId = parsed.args.ipID;
            collectionAddress = parsed.args.collectionAddress;
            break;
          }
        } catch (e) {}
      }
    }

    return { tx, ipId, collectionAddress };
  }

  /**
   * Submit a mintFromCollection transaction to the blockchain
   */
  async submitMintFromCollection(
    signatureResponse: SignatureResponse,
    signer: Signer,
  ): Promise<{ tx: any; tokenId: string }> {
    const contract = new Contract(
      this.config.nftModuleAddress,
      NFT_MODULE_ABI,
      signer,
    );

    const tx = await contract.mintFromCollectionEncoded(
      signatureResponse.encodedData,
      signatureResponse.signature,
    );

    const receipt = await tx.wait();

    // Parse tokenId from event
    let tokenId = "0";
    const iface = new Interface(NFT_MODULE_ABI);
    if (receipt?.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "NFTMinted") {
            tokenId = parsed.args.tokenId.toString();
            break;
          }
        } catch (e) {}
      }
    }

    return { tx, tokenId };
  }

  /**
   * Submit a registerIP transaction to the blockchain
   */
  async submitRegisterIP(
    signatureResponse: SignatureResponse,
    signer: Signer,
  ): Promise<{ tx: any; ipId: string }> {
    const contract = new Contract(
      this.config.ipModuleAddress,
      IP_MODULE_ABI,
      signer,
    );

    const tx = await contract.registerNFTEncoded(
      signatureResponse.encodedData,
      signatureResponse.signature,
    );

    const receipt = await tx.wait();

    // Parse ipId from event
    let ipId = "";
    const iface = new Interface(IP_MODULE_ABI);
    if (receipt?.logs) {
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "IPAssetRegistered") {
            ipId = parsed.args.id;
            break;
          }
        } catch (e) {}
      }
    }

    return { tx, ipId };
  }

  // ============ Utilities ============

  /**
   * Get the current network configuration
   */
  getNetworkConfig(): NetworkConfig {
    return { ...this.config };
  }

  /**
   * Get the chain ID for the current network
   */
  getChainId(): number {
    return this.config.chainId;
  }
}
