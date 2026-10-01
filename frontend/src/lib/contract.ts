import { createPublicClient, http, decodeAbiParameters } from "viem";
import { CHAIN, CONTRACT_ADDRESS } from "../config";

// ABI with explicit tuple components for search return type
const ABI = [
  {
    name: "submit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "content", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "submit_from_url",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "url", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "search",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "query", type: "string" },
      { name: "top_k", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "document_id", type: "uint256" },
          { name: "similarity_score", type: "uint256" },
          { name: "reason", type: "string" },
        ],
      },
    ],
  },
  {
    name: "getDocument",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "doc_id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "content", type: "string" },
          { name: "submitter", type: "address" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "listDocuments",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "content", type: "string" },
          { name: "submitter", type: "address" },
          { name: "timestamp", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "count",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(CHAIN.rpcUrls.default.http[0]),
});

export async function readContract<T>(functionName: string, args: readonly unknown[] = []): Promise<T> {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: functionName as any,
    args: args as any,
  }) as Promise<T>;
}

export async function writeContract(
  walletClient: any,
  functionName: string,
  args: any[] = [],
  value: bigint = 0n
): Promise<`0x${string}`> {
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName,
    args,
    value,
  });
  return hash;
}

export async function writeContractAndDecode<T>(
  walletClient: any,
  functionName: string,
  args: any[] = [],
  value: bigint = 0n
): Promise<T> {
  const hash = await writeContract(walletClient, functionName, args, value);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  // Find the function ABI to decode return value
  const funcAbi = ABI.find(item => item.name === functionName && item.type === "function");
  if (!funcAbi || !funcAbi.outputs) {
    throw new Error(`No output ABI found for ${functionName}`);
  }
  
  // Decode return value from receipt output
  const output = (receipt as any).output || (receipt as any).returnValue;
  if (!output) {
    throw new Error("No return value in transaction receipt");
  }
  
  return decodeAbiParameters(funcAbi.outputs, output) as T;
}

export async function waitForTransaction(hash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash });
}

export function getExplorerUrl(hash: `0x${string}`): string {
  return `${CHAIN.blockExplorers?.default?.url}/tx/${hash}`;
}