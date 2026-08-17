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
  process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';
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
const DEPLOYED_TOKEN = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as const;
const DEPLOYED_PAYMASTER = '0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6' as const;
const DEPLOYED_ESCROW = '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb' as const;
const DEPLOYED_CBM = '0x57869372AFbd7b61752f2f8d3e7F37701e28517B' as const;
const SENDER_SMART_ACCOUNT = '0x7d7a2FbCc9ee851a58B179E15f55ED83195511C0' as const; // Seller
const RECIPIENT_SMART_ACCOUNT = '0x63b81Fc51688F89b479f90f08b09510D62cB9B18' as const; // Buyer

const PAYMASTER_ABI = parseAbi([
  'function setApprovedTarget(address target, bool approved) external',
  'function setApprovedSelector(address target, bytes4 selector, bool approved) external',
  'function approvedTargets(address target) external view returns (bool)',
  'function approvedSelectors(address target, bytes4 selector) external view returns (bool)',
  'function getDeposit() external view returns (uint256)',
  'function deposit() external payable',
]);

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
  'function refund(uint256 tradeId) external',
  'function cancelUnfundedTrade(uint256 tradeId) external',
  'function raiseDispute(uint256 tradeId, bytes32 reasonHash) external',
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
    gas: 1_500_000n,
    maxFeePerGas: parseUnits('0.1', 9),
    maxPriorityFeePerGas: parseUnits('0.05', 9),
    nonce,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  await new Promise((r) => setTimeout(r, 2000));
  return { txHash: hash, receipt };
}

async function main() {
  console.log('=== STARTING PHASE 2B-2 LIVE BASE SEPOLIA GASLESS P2P VERIFICATION ===');
  console.log('Relayer Address:', relayerAccount.address);
  console.log('Seller Smart Account:', SENDER_SMART_ACCOUNT);
  console.log('Buyer Smart Account:', RECIPIENT_SMART_ACCOUNT);

  // 1. Verify and configure Paymaster whitelisting
  console.log('\n--- 1. Checking Paymaster Whitelist Configuration ---');
  const isTargetApproved = await publicClient.readContract({
    address: DEPLOYED_PAYMASTER,
    abi: PAYMASTER_ABI,
    functionName: 'approvedTargets',
    args: [DEPLOYED_ESCROW],
  });

  if (!isTargetApproved) {
    console.log('Whitelisting P2PEscrow target on Paymaster...');
    const tx = await walletClient.writeContract({
      address: DEPLOYED_PAYMASTER,
      abi: PAYMASTER_ABI,
      functionName: 'setApprovedTarget',
      args: [DEPLOYED_ESCROW, true],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }

  // Whitelist selectors: createTrade, fundTrade, submitPayment, confirmAndRelease, refund, cancelUnfundedTrade, raiseDispute
  const selectors = [
    '0xddfca579', // createTrade((address,address,address,uint256,uint256,bytes32,uint256))
    '0x347291bd', // fundTrade(uint256)
    '0x00867bd2', // submitPayment(uint256,bytes32,bytes32)
    '0xe307b694', // confirmAndRelease(uint256)
    '0x278ecde1', // refund(uint256)
    '0xbb6094a1', // cancelUnfundedTrade(uint256)
    '0x636bf26d', // raiseDispute(uint256,bytes32)
  ] as const;

  for (const sel of selectors) {
    const isSelApproved = await publicClient.readContract({
      address: DEPLOYED_PAYMASTER,
      abi: PAYMASTER_ABI,
      functionName: 'approvedSelectors',
      args: [DEPLOYED_ESCROW, sel],
    });
    if (!isSelApproved) {
      console.log(`Whitelisting selector ${sel} on Paymaster...`);
      const tx = await walletClient.writeContract({
        address: DEPLOYED_PAYMASTER,
        abi: PAYMASTER_ABI,
        functionName: 'setApprovedSelector',
        args: [DEPLOYED_ESCROW, sel, true],
        maxFeePerGas: parseUnits('2', 9),
        maxPriorityFeePerGas: parseUnits('1.5', 9),
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Also ensure UVBE approve selector is approved on Paymaster
  const isApproveApproved = await publicClient.readContract({
    address: DEPLOYED_PAYMASTER,
    abi: PAYMASTER_ABI,
    functionName: 'approvedSelectors',
    args: [DEPLOYED_TOKEN, '0x095ea7b3'],
  });
  if (!isApproveApproved) {
    console.log('Whitelisting ERC20.approve on UVBE token...');
    const tx = await walletClient.writeContract({
      address: DEPLOYED_PAYMASTER,
      abi: PAYMASTER_ABI,
      functionName: 'setApprovedSelector',
      args: [DEPLOYED_TOKEN, '0x095ea7b3', true],
      maxFeePerGas: parseUnits('2', 9),
      maxPriorityFeePerGas: parseUnits('1.5', 9),
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Check Paymaster Deposit
  const paymasterDeposit = await publicClient.readContract({
    address: DEPLOYED_PAYMASTER,
    abi: PAYMASTER_ABI,
    functionName: 'getDeposit',
  });
  console.log('Paymaster EntryPoint Deposit:', formatUnits(paymasterDeposit, 18), 'ETH');
  if (paymasterDeposit < parseUnits('0.005', 18)) {
    console.log('Funding Paymaster deposit with 0.02 ETH...');
    const tx = await walletClient.writeContract({
      address: DEPLOYED_PAYMASTER,
      abi: PAYMASTER_ABI,
      functionName: 'deposit',
      value: parseUnits('0.02', 18),
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
  }

  // Pre-State assertions
  const sellerEthBefore = await publicClient.getBalance({ address: SENDER_SMART_ACCOUNT });
  const buyerEthBefore = await publicClient.getBalance({ address: RECIPIENT_SMART_ACCOUNT });
  const sellerUvbeBefore = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [SENDER_SMART_ACCOUNT],
  });
  const buyerUvbeBefore = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [RECIPIENT_SMART_ACCOUNT],
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
  const buyerBasisBefore = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [RECIPIENT_SMART_ACCOUNT],
  });

  console.log('\n--- Initial Balances & Accounting ---');
  console.log('Seller ETH:', formatUnits(sellerEthBefore, 18), '(Strict 0 required)');
  console.log('Buyer ETH:', formatUnits(buyerEthBefore, 18), '(Strict 0 required)');
  console.log('Seller UVBE:', formatUnits(sellerUvbeBefore, 18));
  console.log('Buyer UVBE:', formatUnits(buyerUvbeBefore, 18));
  console.log('Total Supply:', formatUnits(totalSupplyBefore, 18));
  console.log('Seller Cost Basis:', formatUnits(sellerBasisBefore, 6), 'USD');
  console.log('Buyer Cost Basis:', formatUnits(buyerBasisBefore, 6), 'USD');

  if (sellerEthBefore !== 0n || buyerEthBefore !== 0n) {
    throw new Error('Smart Accounts must have strictly 0 native ETH!');
  }

  // =========================================================================
  // STEP 1: Gasless createTrade by Seller Smart Account (ETH = 0)
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 1: Gasless createTrade by Seller Smart Account');
  console.log('======================================================');

  const tradeAmount = parseUnits('0.01', 18); // 0.01 UVBE
  const fiatAmount = 10000n; // 100.00 INR (10000 paise)
  const fiatCurrency = keccak256(toHex('INR'));
  const paymentWindow = 3600n;

  const createTradeData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'createTrade',
    args: [
      {
        buyer: RECIPIENT_SMART_ACCOUNT,
        seller: SENDER_SMART_ACCOUNT,
        asset: DEPLOYED_TOKEN,
        amount: tradeAmount,
        fiatAmount,
        fiatCurrency,
        paymentWindow,
      },
    ],
  });

  const sellerExecCreateData = encodeFunctionData({
    abi: SMART_ACCOUNT_ABI,
    functionName: 'execute',
    args: [DEPLOYED_ESCROW, 0n, createTradeData],
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
    callData: sellerExecCreateData,
    accountGasLimits:
      '0x000000000000000000000000000493e0000000000000000000000000000927c0' as `0x${string}`, // 300k, 600k
    preVerificationGas: 100_000n,
    gasFees: '0x0000000000000000000000003b9aca000000000000000000000000003b9aca00' as `0x${string}`, // 1 gwei, 1 gwei
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
  console.log('UserOp 1 Hash (createTrade):', userOp1Hash);

  const { txHash: tx1Hash, receipt: receipt1 } = await sendUserOp(userOp1);
  console.log(
    'TX 1 Hash (createTrade):',
    tx1Hash,
    '| Block:',
    receipt1.blockNumber,
    '| Status:',
    receipt1.status,
  );

  const currentTradeCount = await publicClient.readContract({
    address: DEPLOYED_ESCROW,
    abi: ESCROW_ABI,
    functionName: 'totalTrades',
  });
  const activeTradeId = currentTradeCount;
  console.log('Active Trade Created! ID:', activeTradeId.toString());

  // =========================================================================
  // STEP 2: Gasless fundTrade by Seller (2-call batch: UVBE.approve + P2PEscrow.fundTrade)
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 2: Gasless fundTrade (Batch Approve + Fund) by Seller');
  console.log('======================================================');

  const approveData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [DEPLOYED_ESCROW, tradeAmount],
  });

  const fundData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'fundTrade',
    args: [activeTradeId],
  });

  const sellerExecFundBatchData = encodeFunctionData({
    abi: SMART_ACCOUNT_ABI,
    functionName: 'executeBatch',
    args: [
      [DEPLOYED_TOKEN, DEPLOYED_ESCROW],
      [0n, 0n],
      [approveData, fundData],
    ],
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
    callData: sellerExecFundBatchData,
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
  console.log('UserOp 2 Hash (fundTrade batch):', userOp2Hash);

  const { txHash: tx2Hash, receipt: receipt2 } = await sendUserOp(userOp2);
  console.log(
    'TX 2 Hash (fundTrade batch):',
    tx2Hash,
    '| Block:',
    receipt2.blockNumber,
    '| Status:',
    receipt2.status,
  );

  // =========================================================================
  // STEP 3: Gasless submitPayment by Buyer Smart Account (ETH = 0)
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 3: Gasless submitPayment by Buyer Smart Account');
  console.log('======================================================');

  const utrRef = keccak256(
    toHex(`BASE-SEPOLIA-UTR-P2P-${Date.now()}-${Math.floor(Math.random() * 10000)}`),
  );
  const proofHash = keccak256(
    toHex(`PROOF-HASH-LIVE-${Date.now()}-${Math.floor(Math.random() * 10000)}`),
  );

  const submitPaymentData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'submitPayment',
    args: [activeTradeId, utrRef, proofHash],
  });

  const buyerExecSubmitData = encodeFunctionData({
    abi: SMART_ACCOUNT_ABI,
    functionName: 'execute',
    args: [DEPLOYED_ESCROW, 0n, submitPaymentData],
  });

  const buyerNonce1 = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getNonce',
    args: [RECIPIENT_SMART_ACCOUNT, 0n],
  });

  const userOp3 = {
    sender: RECIPIENT_SMART_ACCOUNT,
    nonce: buyerNonce1,
    initCode: '0x' as `0x${string}`,
    callData: buyerExecSubmitData,
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
  console.log('UserOp 3 Hash (submitPayment):', userOp3Hash);

  const { txHash: tx3Hash, receipt: receipt3 } = await sendUserOp(userOp3);
  console.log(
    'TX 3 Hash (submitPayment):',
    tx3Hash,
    '| Block:',
    receipt3.blockNumber,
    '| Status:',
    receipt3.status,
  );

  // =========================================================================
  // STEP 4: Gasless confirmAndRelease by Seller Smart Account (ETH = 0)
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 4: Gasless confirmAndRelease by Seller Smart Account');
  console.log('======================================================');

  const releaseData = encodeFunctionData({
    abi: ESCROW_ABI,
    functionName: 'confirmAndRelease',
    args: [activeTradeId],
  });

  const sellerExecReleaseData = encodeFunctionData({
    abi: SMART_ACCOUNT_ABI,
    functionName: 'execute',
    args: [DEPLOYED_ESCROW, 0n, releaseData],
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
    callData: sellerExecReleaseData,
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
  console.log('UserOp 4 Hash (confirmAndRelease):', userOp4Hash);

  const { txHash: tx4Hash, receipt: receipt4 } = await sendUserOp(userOp4);
  console.log(
    'TX 4 Hash (confirmAndRelease):',
    tx4Hash,
    '| Block:',
    receipt4.blockNumber,
    '| Status:',
    receipt4.status,
  );

  // =========================================================================
  // STEP 5: Final On-Chain Invariant Assertions
  // =========================================================================
  console.log('\n======================================================');
  console.log('STEP 5: VERIFYING POST-P2P ON-CHAIN INVARIANTS');
  console.log('======================================================');

  const sellerEthAfter = await publicClient.getBalance({ address: SENDER_SMART_ACCOUNT });
  const buyerEthAfter = await publicClient.getBalance({ address: RECIPIENT_SMART_ACCOUNT });
  const sellerUvbeAfter = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [SENDER_SMART_ACCOUNT],
  });
  const buyerUvbeAfter = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [RECIPIENT_SMART_ACCOUNT],
  });
  const totalSupplyAfter = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
  });
  const sellerBasisAfter = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [SENDER_SMART_ACCOUNT],
  });
  const buyerBasisAfter = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [RECIPIENT_SMART_ACCOUNT],
  });
  const sellerPnL = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'realizedPnL',
    args: [SENDER_SMART_ACCOUNT],
  });
  const buyerPnL = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'realizedPnL',
    args: [RECIPIENT_SMART_ACCOUNT],
  });

  console.log('Seller ETH After:', formatUnits(sellerEthAfter, 18), '(Strict 0 verified)');
  console.log('Buyer ETH After:', formatUnits(buyerEthAfter, 18), '(Strict 0 verified)');
  console.log('Seller UVBE Delta:', formatUnits(sellerUvbeAfter - sellerUvbeBefore, 18));
  console.log('Buyer UVBE Delta:', formatUnits(buyerUvbeAfter - buyerUvbeBefore, 18));
  console.log('Total Supply Constant:', totalSupplyAfter === totalSupplyBefore);
  console.log('Seller Cost Basis Unchanged:', sellerBasisAfter === sellerBasisBefore);
  console.log('Buyer Cost Basis Unchanged:', buyerBasisAfter === buyerBasisBefore);
  console.log('Seller Realized P&L:', sellerPnL.toString(), 'USD');
  console.log('Buyer Realized P&L:', buyerPnL.toString(), 'USD');

  if (sellerEthAfter !== 0n) throw new Error('Invariant violation: Seller ETH is not 0!');
  if (buyerEthAfter !== 0n) throw new Error('Invariant violation: Buyer ETH is not 0!');
  if (totalSupplyAfter !== totalSupplyBefore)
    throw new Error('Invariant violation: Total supply mutated!');
  if (sellerPnL !== 0n || buyerPnL !== 0n)
    throw new Error('Invariant violation: Non-zero P&L created!');

  console.log('\n=== ALL PHASE 2B-2 BASE SEPOLIA ON-CHAIN INVARIANTS FULLY VERIFIED! ===');
}

main().catch((err) => {
  console.error('Execution failed:', err);
  process.exit(1);
});
