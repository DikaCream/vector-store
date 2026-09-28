import { createPublicClient, http, parseAbi } from "viem";
import { CHAIN, CONTRACT_ADDRESS } from "../config";

const ABI = parseAbi([
  "function submit(string) external returns (uint256)",
  "function submitFromUrl(string) external returns (uint256)",
  "function search(string, uint256) external view returns (tuple(uint256 document_id, uint256 similarity_score, string reason)[])",
  "function getDocument(uint256) external view returns (tuple(uint256 id, string content, address submitter, uint256 timestamp))",
  "function listDocuments() external view returns (tuple(uint256 id, string content, address submitter, uint256 timestamp)[])",
  "function count() external view returns (uint256)",
]);

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(CHAIN.rpcUrls.default.http[0]),
});

export async function readContract<T>(functionName: string, args: any[] = []): Promise<T> {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName,
    args,
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

export async function waitForTransaction(hash: `0x${string}`) {
  return publicClient.waitForTransactionReceipt({ hash });
}

export function getExplorerUrl(hash: `0x${string}`): string {
  return `${CHAIN.blockExplorers?.default?.url}/tx/${hash}`;
}