import type { Provider, Signer } from "ethers";
import type { TransactionReceipt } from "ethers";

// ============ Config ============

export type Network = "base-sepolia" | "base";

export interface KorSDKConfig {
  /** Your API key from the KOR Protocol dashboard */
  apiKey: string;
  /** Network to use (default: 'base-sepolia') */
  network?: Network;
  /** Custom API base URL (optional, for self-hosted backends) */
  apiBaseUrl?: string;
}

export interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  apiBaseUrl: string;
  nftModuleAddress: string;
  ipModuleAddress: string;
}

// ============ Auth ============

export interface CreateUserParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organisation?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface CreateApiKeyParams {
  allowedDomains?: string[];
  allowedIPs?: string[];
}

export interface ApiKeyResponse {
  key: string;
}

// ============ Collections ============

export interface CreateCollectionParams {
  name: string;
  symbol: string;
}

export interface CreateIPCollectionParams {
  name: string;
  symbol: string;
  mintPrice: number;
  maxSupply: number;
  licensors?: [string, string, string];
  licenseTermID?: number;
}

export interface MintFromCollectionParams {
  collectionAddress: string;
  recipientAddress: string;
  metadataURI: string;
}

export interface MintFromProtocolCollectionParams {
  recipientAddress: string;
  metadataURI: string;
}

// ============ IP ============

export interface RegisterIPParams {
  tokenContract: string;
  tokenId: number;
  licensors?: [string, string, string];
}

export interface RegisterDerivativeParams {
  tokenContract: string;
  tokenId: number;
  parentIP: string;
}

export interface UpdateLicensorsParams {
  ipAddress: string;
  licensors: [string, string, string];
}

// ============ Responses ============

export interface SignatureResponse {
  encodedData: string;
  signature: string;
}

export interface TransactionResult {
  hash: string;
  wait: () => Promise<TransactionReceipt | null>;
}

// ============ Signer Types ============

export type { Signer, Provider };
