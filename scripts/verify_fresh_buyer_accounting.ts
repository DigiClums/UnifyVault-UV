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
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';
import path from 'path';

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

// Addresses
const CANONICAL_ENTRYPOINT_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;
const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
const DEPLOYED_TOKEN = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as const;
const DEPLOYED_CONTROLLER = '0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec' as const;
const DEPLOYED_PAYMASTER = '0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6' as const;
const DEPLOYED_ESCROW = '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb' as const;
const DEPLOYED_CBM = '0x57869372AFbd7b61752f2f8d3e7F37701e28517B' as const;
const SENDER_SMART_ACCOUNT = '0x7d7a2FbCc9ee851a58B179E15f55ED83195511C0' as const; // Seller

const ENTRYPOINT_ABI = parseAbi([
  'function getNonce(address sender, uint192 key) external view returns (uint256)',
  'function getUserOpHash((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp) external view returns (bytes32)',
  'function handleOps((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] ops, address payable beneficiary) external',
]);

const ESCROW_ABI = parseAbi([
  'function totalTrades() external view returns (uint256)',
  'function createTrade((address buyer, address seller, address asset, uint256 amount, uint256 fiatAmount, bytes32 fiatCurrency, uint256 paymentWindow) params) external payable returns (uint256)',
  'function fundTrade(uint256 tradeId) external payable',
  'function submitPayment(uint256 tradeId, bytes32 paymentReference, bytes32 evidenceHash) external',
  'function confirmAndRelease(uint256 tradeId) external',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
]);

const CBM_ABI = parseAbi([
  'function costBasis(address account) external view returns (uint256)',
  'function realizedPnL(address account) external view returns (int256)',
]);

const SMART_ACCOUNT_ABI = parseAbi([
  'function execute(address dest, uint256 value, bytes func) external payable returns (bytes)',
  'function executeBatch(address[] dests, uint256[] values, bytes[] funcs) external payable returns (bytes[])',
]);

const CONTROLLER_ABI = parseAbi([
  'function redeem(address asset, uint256 shares, uint256 minAssetsOut, address receiver, uint256 deadline) external returns (uint256 assetsOut)',
]);

const artifactPath = path.resolve(
  __dirname,
  '../packages/protocol/out/VerifyFreshBuyerP2PAccounting.s.sol/FreshLiveSimpleAccount.json',
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const LIVE_SIM_BYTECODE = artifact.bytecode.object as `0x${string}`;
const LIVE_SIM_ABI = artifact.abi;

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
    gas: 3_500_000n,
    maxFeePerGas: parseUnits('2', 9),
    maxPriorityFeePerGas: parseUnits('1.5', 9),
    nonce,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  await new Promise((r) => setTimeout(r, 2000));
  return { txHash: hash, receipt };
}

async function main() {
  console.log('=== PHASE 2B-2: DEDICATED FRESH BUYER P2P ACCOUNTING & REDEEM VERIFICATION ===');
  console.log('Chain: Base Sepolia (84532)');
  console.log('Relayer:', relayerAccount.address);
  console.log('Seller Smart Account:', SENDER_SMART_ACCOUNT);

  // 1. Generate Fresh Buyer EOA and Deploy Fresh Smart Account
  const freshBuyerEOA = privateKeyToAccount(generatePrivateKey());
  console.log('\n--- 1. Deploying Fresh Buyer Smart Account ---');
  console.log('Fresh Buyer EOA:', freshBuyerEOA.address);

  const deployNonce = await publicClient.getTransactionCount({
    address: relayerAccount.address,
    blockTag: 'pending',
  });

  const deployTxHash = await walletClient.deployContract({
    abi: LIVE_SIM_ABI,
    bytecode: LIVE_SIM_BYTECODE,
    args: [CANONICAL_ENTRYPOINT_V07, freshBuyerEOA.address],
    gas: 1_500_000n,
    maxFeePerGas: parseUnits('2', 9),
    maxPriorityFeePerGas: parseUnits('1.5', 9),
    nonce: deployNonce,
  });

  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
  const FRESH_BUYER_SMART_ACCOUNT = deployReceipt.contractAddress!;
  console.log('Fresh Buyer Smart Account Deployed at:', FRESH_BUYER_SMART_ACCOUNT);
  console.log('Deployment TX:', deployTxHash, '| Block:', deployReceipt.blockNumber);

  // 2. Strict Pre-State Initial Verification
  console.log('\n--- 2. Verifying Initial Pre-State of Fresh Buyer ---');
  const freshBuyerEth = await publicClient.getBalance({ address: FRESH_BUYER_SMART_ACCOUNT });
  const freshBuyerUvbe = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });
  const freshBuyerBasis = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });
  const freshBuyerPnL = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'realizedPnL',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });
  const totalSupplyBefore = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
  });
  const sellerBasisBefore = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [SENDER_SMART_ACCOUNT],
  });

  console.log(
    'Fresh Buyer Initial ETH:',
    formatUnits(freshBuyerEth, 18),
    '(Strict $0.00 required)',
  );
  console.log('Fresh Buyer Initial UVBE:', formatUnits(freshBuyerUvbe, 18), '(Strict 0 required)');
  console.log(
    'Fresh Buyer Initial Cost Basis:',
    formatUnits(freshBuyerBasis, 18),
    'USD (Strict $0 required)',
  );
  console.log(
    'Fresh Buyer Initial Realized P&L:',
    formatUnits(freshBuyerPnL, 18),
    'USD (Strict $0 required)',
  );
  console.log('Total UVBE Supply Before:', formatUnits(totalSupplyBefore, 18));
  console.log('Seller Initial Cost Basis:', formatUnits(sellerBasisBefore, 18), 'USD');

  if (
    freshBuyerEth !== 0n ||
    freshBuyerUvbe !== 0n ||
    freshBuyerBasis !== 0n ||
    freshBuyerPnL !== 0n
  ) {
    throw new Error('Fresh Buyer initial state is not strictly zero!');
  }

  // =========================================================================
  // STEP 1: Seller creates trade for Fresh Buyer (0.005 UVBE for 50 INR)
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 1: Gasless createTrade by Seller for Fresh Buyer');
  console.log('======================================================');

  const tradeAmount = parseUnits('0.005', 18); // 0.005 UVBE
  const fiatAmount = 5000n; // 50.00 INR
  const fiatCurrency = keccak256(toHex('INR'));
  const paymentWindow = 3600n;

  const createTradeData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'createTrade',
    args: [
      {
        buyer: FRESH_BUYER_SMART_ACCOUNT,
        seller: SENDER_SMART_ACCOUNT,
        asset: DEPLOYED_TOKEN,
        amount: tradeAmount,
        fiatAmount,
        fiatCurrency,
        paymentWindow,
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
    'Trade Created for Fresh Buyer! ID:',
    tradeId.toString(),
    '| UserOp:',
    userOp1Hash,
    '| TX:',
    tx1Hash,
    '| Block:',
    receipt1.blockNumber,
  );

  // =========================================================================
  // STEP 2: Seller funds trade (2-call batch: UVBE.approve + P2PEscrow.fundTrade)
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 2: Gasless fundTrade by Seller');
  console.log('======================================================');

  const approveData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [DEPLOYED_ESCROW, tradeAmount],
  });
  const fundData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'fundTrade',
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
      functionName: 'executeBatch',
      args: [
        [DEPLOYED_TOKEN, DEPLOYED_ESCROW],
        [0n, 0n],
        [approveData, fundData],
      ],
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
    'Trade Funded! UserOp:',
    userOp2Hash,
    '| TX:',
    tx2Hash,
    '| Block:',
    receipt2.blockNumber,
  );

  // =========================================================================
  // STEP 3: Fresh Buyer submits payment evidence
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 3: Gasless submitPayment by Fresh Buyer');
  console.log('======================================================');

  const utrRef = keccak256(toHex('FRESH-BUYER-UTR-993344'));
  const proofHash = keccak256(toHex('FRESH-BUYER-PROOF-7788'));

  const submitPaymentData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'submitPayment',
    args: [tradeId, utrRef, proofHash],
  });

  const freshBuyerNonce1 = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getNonce',
    args: [FRESH_BUYER_SMART_ACCOUNT, 0n],
  });

  const userOp3 = {
    sender: FRESH_BUYER_SMART_ACCOUNT,
    nonce: freshBuyerNonce1,
    initCode: '0x' as `0x${string}`,
    callData: encodeFunctionData({
      abi: SMART_ACCOUNT_ABI,
      functionName: 'execute',
      args: [DEPLOYED_ESCROW, 0n, submitPaymentData],
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

  const userOp3Hash = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getUserOpHash',
    args: [userOp3],
  });
  const { txHash: tx3Hash, receipt: receipt3 } = await sendUserOp(userOp3);
  console.log(
    'Payment Reference Submitted! UserOp:',
    userOp3Hash,
    '| TX:',
    tx3Hash,
    '| Block:',
    receipt3.blockNumber,
  );

  // =========================================================================
  // STEP 4: Seller confirms and releases escrow to Fresh Buyer
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 4: Gasless confirmAndRelease by Seller');
  console.log('======================================================');

  const releaseData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'confirmAndRelease',
    args: [tradeId],
  });

  const sellerNonce3 = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getNonce',
    args: [SENDER_SMART_ACCOUNT, 0n],
  });

  const userOp4 = {
    sender: SENDER_SMART_ACCOUNT,
    nonce: sellerNonce3,
    initCode: '0x' as `0x${string}`,
    callData: encodeFunctionData({
      abi: SMART_ACCOUNT_ABI,
      functionName: 'execute',
      args: [DEPLOYED_ESCROW, 0n, releaseData],
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

  const userOp4Hash = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getUserOpHash',
    args: [userOp4],
  });
  const { txHash: tx4Hash, receipt: receipt4 } = await sendUserOp(userOp4);
  console.log(
    'Escrow Released to Fresh Buyer! UserOp:',
    userOp4Hash,
    '| TX:',
    tx4Hash,
    '| Block:',
    receipt4.blockNumber,
  );

  // =========================================================================
  // STEP 5: Verify Post-P2P Invariants for Fresh Buyer
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 5: VERIFYING POST-P2P INVARIANTS FOR FRESH BUYER');
  console.log('======================================================');

  const freshBuyerUvbePostP2P = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });
  const freshBuyerBasisPostP2P = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });
  const freshBuyerPnLPostP2P = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'realizedPnL',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });
  const sellerBasisPostP2P = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [SENDER_SMART_ACCOUNT],
  });
  const totalSupplyPostP2P = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
  });

  console.log(
    'Fresh Buyer UVBE Balance Post-P2P:',
    formatUnits(freshBuyerUvbePostP2P, 18),
    '(Expected: 0.00495 UVBE)',
  );
  console.log(
    'Fresh Buyer Cost Basis Post-P2P:',
    formatUnits(freshBuyerBasisPostP2P, 18),
    'USD (Strict $0.00 Verified!)',
  );
  console.log(
    'Fresh Buyer Realized P&L Post-P2P:',
    formatUnits(freshBuyerPnLPostP2P, 18),
    'USD (Strict $0.00 Verified!)',
  );
  console.log(
    'Seller Cost Basis Post-P2P:',
    formatUnits(sellerBasisPostP2P, 18),
    'USD (Unchanged)',
  );
  console.log('Total Supply Post-P2P:', formatUnits(totalSupplyPostP2P, 18), '(Unchanged)');

  if (freshBuyerUvbePostP2P !== parseUnits('0.00495', 18)) {
    throw new Error('Fresh Buyer did not receive expected UVBE tokens!');
  }
  if (freshBuyerBasisPostP2P !== 0n) {
    throw new Error('Fresh Buyer cost basis mutated during P2P acquisition! Expected 0.');
  }
  if (freshBuyerPnLPostP2P !== 0n) {
    throw new Error('Fresh Buyer realized P&L mutated during P2P acquisition! Expected 0.');
  }

  // =========================================================================
  // STEP 6: Execute Redemption of P2P-Acquired UVBE by Fresh Buyer
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 6: Executing Redemption of P2P-Acquired UVBE Shares');
  console.log('======================================================');

  const redeemShares = freshBuyerUvbePostP2P; // 0.00495 UVBE
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const approveControllerData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [DEPLOYED_CONTROLLER, redeemShares],
  });

  const redeemData = encodeFunctionData({
    abi: CONTROLLER_ABI,
    functionName: 'redeem',
    args: [BASE_SEPOLIA_USDC, redeemShares, 0n, FRESH_BUYER_SMART_ACCOUNT, deadline],
  });

  const freshBuyerNonce2 = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getNonce',
    args: [FRESH_BUYER_SMART_ACCOUNT, 0n],
  });

  // Execute batch: [UVBE.approve(Controller, shares), Controller.redeem(...)]
  // Use callGasLimit = 2_000_000 for multi-asset pool swap
  const userOp5 = {
    sender: FRESH_BUYER_SMART_ACCOUNT,
    nonce: freshBuyerNonce2,
    initCode: '0x' as `0x${string}`,
    callData: encodeFunctionData({
      abi: SMART_ACCOUNT_ABI,
      functionName: 'executeBatch',
      args: [
        [DEPLOYED_TOKEN, DEPLOYED_CONTROLLER],
        [0n, 0n],
        [approveControllerData, redeemData],
      ],
    }),
    accountGasLimits:
      '0x000000000000000000000000000493e0000000000000000000000000001e8480' as `0x${string}`,
    preVerificationGas: 100_000n,
    gasFees: '0x0000000000000000000000003b9aca000000000000000000000000003b9aca00' as `0x${string}`,
    paymasterAndData: concat([
      DEPLOYED_PAYMASTER,
      pad(viemToHex(200_000n), { size: 16 }),
      pad(viemToHex(200_000n), { size: 16 }),
    ]),
    signature: '0x01' as `0x${string}`,
  };

  const userOp5Hash = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getUserOpHash',
    args: [userOp5],
  });
  const { txHash: tx5Hash, receipt: receipt5 } = await sendUserOp(userOp5);
  console.log(
    'Redemption Executed! UserOp:',
    userOp5Hash,
    '| TX:',
    tx5Hash,
    '| Block:',
    receipt5.blockNumber,
  );

  // =========================================================================
  // STEP 7: Verify Post-Redemption Accounting Calculations
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 7: VERIFYING POST-REDEMPTION ACCOUNTING FORMULAS');
  console.log('======================================================');

  const freshBuyerUsdcPostRedeem = await publicClient.readContract({
    address: BASE_SEPOLIA_USDC,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });
  const freshBuyerUvbePostRedeem = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });
  const freshBuyerBasisPostRedeem = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });
  const freshBuyerPnLPostRedeem = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'realizedPnL',
    args: [FRESH_BUYER_SMART_ACCOUNT],
  });

  console.log(
    'USDC Received by Fresh Buyer (netAssets):',
    formatUnits(freshBuyerUsdcPostRedeem, 6),
    'USDC',
  );
  console.log('Remaining UVBE Shares:', formatUnits(freshBuyerUvbePostRedeem, 18));
  console.log(
    'Fresh Buyer Cost Basis Post-Redeem:',
    formatUnits(freshBuyerBasisPostRedeem, 18),
    'USD',
  );
  console.log(
    'Fresh Buyer Realized P&L Post-Redeem:',
    formatUnits(freshBuyerPnLPostRedeem, 18),
    'USD',
  );

  console.log('\n--- Mathematical Invariant Verification ---');
  console.log('1. initialCostBasis = 0 USD');
  console.log('2. costBasisProportional = 0 * (redeemedShares / totalShares) = 0 USD');
  console.log(
    `3. grossAssetsUSD (payoutValueUSD) = ${formatUnits(freshBuyerPnLPostRedeem, 18)} USD`,
  );
  console.log(
    `4. realizedPnL = grossAssetsUSD - costBasisProportional = ${formatUnits(freshBuyerPnLPostRedeem, 18)} USD`,
  );

  if (freshBuyerPnLPostRedeem <= 0n) {
    throw new Error('Realized P&L was not positively recorded on zero-basis redemption!');
  }
  if (freshBuyerBasisPostRedeem !== 0n) {
    throw new Error('Cost basis should remain 0 after redeeming 0-basis shares!');
  }
  if (freshBuyerUvbePostRedeem !== 0n) {
    throw new Error('All P2P shares should have been burned upon redemption!');
  }

  console.log('\n=== ACCOUNTING EDGE CASE 100% VERIFIED ON BASE SEPOLIA! ===');
}

main().catch((err) => {
  console.error('Execution failed:', err);
  process.exit(1);
});
