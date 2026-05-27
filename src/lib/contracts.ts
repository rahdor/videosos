// Contract addresses for Base Sepolia
export const KOR_CONTRACTS = {
  protocolCollection: "0x6F38e277DE29220B79dBA6789548e88f983c0d2d",
  nftModule: "0x7797A484C7a9aAa238D40476A022E5C5e3e2e0e3",
  ipModule: "0xd97fEB28aD630A3f8561a0decee0fed26842b718",
} as const;

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

// Minimal ERC721 ABI for reading token data
export const ERC721_READ_ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
