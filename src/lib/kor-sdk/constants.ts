import type { Network, NetworkConfig } from "./types";

export const NETWORKS: Record<Network, NetworkConfig> = {
  "base-sepolia": {
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    apiBaseUrl: "https://backend-production-a7215.up.railway.app/kor-sdk-api",
    nftModuleAddress: "0x7797A484C7a9aAa238D40476A022E5C5e3e2e0e3",
    ipModuleAddress: "0xd97fEB28aD630A3f8561a0decee0fed26842b718",
  },
  base: {
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    apiBaseUrl: "https://api.korprotocol.com/kor-sdk-api", // TODO: Update when mainnet is live
    nftModuleAddress: "0x0000000000000000000000000000000000000000", // TODO: Deploy to mainnet
    ipModuleAddress: "0x0000000000000000000000000000000000000000", // TODO: Deploy to mainnet
  },
};

export const NFT_MODULE_ABI = [
  "function createCollectionEncoded(bytes memory encodedData, bytes memory signature) external returns (address)",
  "function createIPCollectionEncoded(bytes memory encodedData, bytes memory signature) external",
  "function mintFromCollectionEncoded(bytes memory encodedData, bytes memory signature) external returns (uint256)",
  "function mintFromProtocolCollectionEncoded(bytes memory encodedData, bytes memory signature) external returns (uint256)",
  "event CollectionCreated(address indexed creator, address indexed collectionAddress)",
  "event IPCollectionCreated(address indexed creator, address indexed ipID, address indexed collectionAddress, uint256 collectionTokenID)",
  "event NFTMinted(address indexed collectionAddress, address indexed recipient, uint256 tokenId)",
];

export const IP_MODULE_ABI = [
  "function registerNFTEncoded(bytes memory encodedData, bytes memory signature) external returns (address)",
  "event IPAssetRegistered(address indexed id, string indexed name, address indexed tokenContract, uint256 tokenId, string uri, uint64 registrationTimestamp, bool isParent)",
];

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
