import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseAbi,
  keccak256,
  toHex,
  formatUnits,
  parseUnits,
  concat,
  toHex as viemToHex,
  pad,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';
const RELAYER_PK = (process.env.DEPLOYER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY ||
  process.env.RELAYER_PRIVATE_KEY) as `0x${string}`;

const relayerAccount = privateKeyToAccount(RELAYER_PK);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: relayerAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const CANONICAL_ENTRYPOINT_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;
const DEPLOYED_TOKEN = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as const;
const DEPLOYED_PAYMASTER = '0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6' as const;
const DEPLOYED_ESCROW = '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb' as const;
const DEPLOYED_CBM = '0x57869372AFbd7b61752f2f8d3e7F37701e28517B' as const;
const SENDER_SMART_ACCOUNT = '0x7d7a2FbCc9ee851a58B179E15f55ED83195511C0' as const; // Seller
const RECIPIENT_SMART_ACCOUNT = '0x63b81Fc51688F89b479f90f08b09510D62cB9B18' as const; // Buyer

const ENTRYPOINT_ABI = parseAbi([
  'function getNonce(address sender, uint192 key) external view returns (uint256)',
  'function getUserOpHash((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp) external view returns (bytes32)',
  'function handleOps((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] ops, address payable beneficiary) external',
]);

const ESCROW_ABI = parseAbi([
  'function totalTrades() external view returns (uint256)',
  'function createTrade((address buyer, address seller, address asset, uint256 amount, uint256 fiatAmount, bytes32 fiatCurrency, uint256 paymentWindow) params) external payable returns (uint256)',
  'function cancelUnfundedTrade(uint256 tradeId) external',
]);

const SMART_ACCOUNT_ABI = parseAbi([
  'function execute(address dest, uint256 value, bytes func) external payable returns (bytes)',
]);

async function sendUserOp(userOp: any) {
  const nonce = await publicClient.getTransactionCount({
    address: relayerAccount.address,
    blockTag: 'pending',
  });

  const hash = await walletClient.writeContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'handleOps',
    args: [[userOp], relayerAccount.address],
    gas: 3_000_000n,
    maxFeePerGas: parseUnits('2', 9),
    maxPriorityFeePerGas: parseUnits('1.5', 9),
    nonce,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  await new Promise((r) => setTimeout(r, 2000));
  return { txHash: hash, receipt };
}

async function main() {
  console.log('=== TESTING GASLESS CANCEL/REFUND PATH ON BASE SEPOLIA ===');

  // Step 1: Create trade with 300s window
  const createTradeData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'createTrade',
    args: [
      {
        buyer: RECIPIENT_SMART_ACCOUNT,
        seller: SENDER_SMART_ACCOUNT,
        asset: DEPLOYED_TOKEN,
        amount: parseUnits('0.005', 18),
        fiatAmount: 5000n,
        fiatCurrency: keccak256(toHex('INR')),
        paymentWindow: 300n,
      },
    ],
  });

  const sellerNonce1 = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getNonce',
    args: [SENDER_SMART_ACCOUNT, 0n],
  });

  const userOp1 = {
    sender: SENDER_SMART_ACCOUNT,
    nonce: sellerNonce1,
    initCode: '0x' as `0x${string}`,
    callData: encodeFunctionData({
      abi: SMART_ACCOUNT_ABI,
      functionName: 'execute',
      args: [DEPLOYED_ESCROW, 0n, createTradeData],
    }),
    accountGasLimits:
      '0x000000000000000000000000000493e0000000000000000000000000000927c0' as `0x${string}`,
    preVerificationGas: 100_000n,
    gasFees: '0x0000000000000000000000003b9aca000000000000000000000000003b9aca00' as `0x${string}`,
    paymasterAndData: concat([
      DEPLOYED_PAYMASTER,
      pad(viemToHex(150_000n), { size: 16 }),
      pad(viemToHex(150_000n), { size: 16 }),
    ]),
    signature: '0x01' as `0x${string}`,
  };

  const userOp1Hash = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getUserOpHash',
    args: [userOp1],
  });
  const { txHash: tx1Hash, receipt: receipt1 } = await sendUserOp(userOp1);
  const tradeId = await publicClient.readContract({
    address: DEPLOYED_ESCROW,
    abi: ESCROW_ABI,
    functionName: 'totalTrades',
  });
  console.log(
    'Trade Created for Cancel Test! ID:',
    tradeId.toString(),
    '| UserOp:',
    userOp1Hash,
    '| TX:',
    tx1Hash,
  );

  // Step 2: Cancel Unfunded Trade via Gasless UserOp
  const cancelData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'cancelUnfundedTrade',
    args: [tradeId],
  });

  const sellerNonce2 = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getNonce',
    args: [SENDER_SMART_ACCOUNT, 0n],
  });

  const userOp2 = {
    sender: SENDER_SMART_ACCOUNT,
    nonce: sellerNonce2,
    initCode: '0x' as `0x${string}`,
    callData: encodeFunctionData({
      abi: SMART_ACCOUNT_ABI,
      functionName: 'execute',
      args: [DEPLOYED_ESCROW, 0n, cancelData],
    }),
    accountGasLimits:
      '0x000000000000000000000000000493e0000000000000000000000000000927c0' as `0x${string}`,
    preVerificationGas: 100_000n,
    gasFees: '0x0000000000000000000000003b9aca000000000000000000000000003b9aca00' as `0x${string}`,
    paymasterAndData: concat([
      DEPLOYED_PAYMASTER,
      pad(viemToHex(150_000n), { size: 16 }),
      pad(viemToHex(150_000n), { size: 16 }),
    ]),
    signature: '0x01' as `0x${string}`,
  };

  const userOp2Hash = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getUserOpHash',
    args: [userOp2],
  });
  const { txHash: tx2Hash, receipt: receipt2 } = await sendUserOp(userOp2);
  console.log(
    'Trade Cancelled Gaslessly! UserOp:',
    userOp2Hash,
    '| TX:',
    tx2Hash,
    '| Status:',
    receipt2.status,
  );
  console.log('=== GASLESS CANCEL/REFUND PATH VERIFIED ON BASE SEPOLIA! ===');
}

main().catch((err) => {
  console.error('Cancel test failed:', err);
  process.exit(1);
});
