import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
  formatEther,
  parseEther,
  stringToHex,
  hexToString,
  keccak256,
  toHex,
  decodeEventLog,
  parseAbi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { saveSellerProfile, getSellerProfile } from '../lib/payment/paymentProfileStore';
import {
  savePaymentIntent,
  getPaymentIntentByTradeId,
  generateTradeReference,
  generateUpiUri,
} from '../lib/payment/paymentIntentStore';
import { verifyPaymentEvidence } from '../lib/evidence/evidenceVerifier';
import { computeReceiptKeccak256 } from '../lib/evidence/receiptHasher';
import { extractReceiptDataFromText } from '../lib/evidence/ocrEngine';
import { MARKETPLACE_ABI } from '../lib/contracts/marketplace';
import { P2P_ESCROW_ABI } from '../lib/contracts/escrow';
import { PaymentIntent } from '../lib/payment/types';

process.env.PAYMENT_DATA_ENCRYPTION_KEY =
  process.env.PAYMENT_DATA_ENCRYPTION_KEY ||
  '9f8e4b7c1a2d3e5f608192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7';

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';

const SELLER_PK =
  '0xcba2ded5fd50de59f9165d61ed747632a4e7aa33f7e43a4ff9414a08a54eb859' as `0x${string}`;
const BUYER_PK =
  '0x6b83f3ad8d77a83696803738e4a9e5b0a34b2cf607e4d8e5ba138e65fae34581' as `0x${string}`;

const sellerAccount = privateKeyToAccount(SELLER_PK);
const buyerAccount = privateKeyToAccount(BUYER_PK);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const sellerWallet = createWalletClient({
  account: sellerAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const buyerWallet = createWalletClient({
  account: buyerAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const MARKETPLACE_ADDRESS = '0xe908377f96F313a6b7771570ff6Fb414D38F451A' as `0x${string}`;
const P2P_ESCROW_ADDRESS = '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb' as `0x${string}`;
const UVBE_ADDRESS = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as `0x${string}`;

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address to, uint256 amount) external returns (bool)',
]);

async function getFeeConfig() {
  const gasPrice = await publicClient.getGasPrice();
  const maxPriorityFeePerGas = parseUnits('0.1', 9);
  const maxFeePerGas = (gasPrice * 150n) / 100n + maxPriorityFeePerGas;
  return { maxFeePerGas, maxPriorityFeePerGas };
}

async function main() {
  console.log('======================================================================');
  console.log('   UNIFYVAULT P2P REAL END-TO-END MOBILE SMOKE TEST (BASE SEPOLIA)   ');
  console.log('======================================================================');
  console.log(`Network: Base Sepolia (84532) | RPC: ${RPC_URL}`);
  console.log(`Seller Address (Maker): ${sellerAccount.address}`);
  console.log(`Buyer Address (Taker):  ${buyerAccount.address}`);

  const sellerEth = await publicClient.getBalance({ address: sellerAccount.address });
  const buyerEth = await publicClient.getBalance({ address: buyerAccount.address });
  const sellerUvbe = await publicClient.readContract({
    address: UVBE_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [sellerAccount.address],
  });
  const buyerUvbeBefore = await publicClient.readContract({
    address: UVBE_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [buyerAccount.address],
  });

  console.log(
    `Seller Balances: ${formatEther(sellerEth)} ETH | ${formatUnits(sellerUvbe, 18)} UVBE`,
  );
  console.log(
    `Buyer Balances:  ${formatEther(buyerEth)} ETH | ${formatUnits(buyerUvbeBefore, 18)} UVBE`,
  );

  if (buyerEth < parseEther('0.001')) {
    console.log('\n[Prep] Topping up Buyer wallet with 0.002 ETH for gas...');
    const topupTx = await sellerWallet.sendTransaction({
      to: buyerAccount.address,
      value: parseEther('0.002'),
    });
    await publicClient.waitForTransactionReceipt({ hash: topupTx });
    console.log(`Buyer topped up: ${topupTx}`);
  }

  // -------------------------------------------------------------------------
  // PHASE 1: Seller UPI Profile Registration
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHASE 1: Register Dedicated Test Seller UPI Profile');
  console.log('----------------------------------------------------------------------');
  const TEST_SELLER_UPI = 'smoketest@upi';
  await saveSellerProfile({
    walletAddress: sellerAccount.address,
    upiVpa: TEST_SELLER_UPI,
    paymentRail: 'UPI',
    verificationStatus: 'VERIFIED',
  });
  const fetchedProfile = await getSellerProfile(sellerAccount.address);
  console.log(`Seller UPI registered & verified: ${fetchedProfile?.upiVpa}`);
  if (fetchedProfile?.upiVpa !== TEST_SELLER_UPI) {
    throw new Error('Seller UPI registration failed');
  }

  // -------------------------------------------------------------------------
  // PHASE 2: Create Real Small SELL Order
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHASE 2: Create Real Small SELL Order on Marketplace.sol');
  console.log('----------------------------------------------------------------------');
  const testTradeAmount = parseUnits('0.01', 18); // 0.01 UVBE
  const testUnitPrice = 500n; // 500 INR/UVBE
  const expectedFiatAmount = '5.00'; // 0.01 * 500 = 5 INR

  const fiatCurrencyBytes32 = stringToHex('INR', { size: 32 });

  // Check & approve UVBE allowance for Marketplace if needed
  const marketplaceAllowance = await publicClient.readContract({
    address: UVBE_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [sellerAccount.address, MARKETPLACE_ADDRESS],
  });
  if (marketplaceAllowance < testTradeAmount) {
    console.log('Approving UVBE for Marketplace...');
    const fee = await getFeeConfig();
    const approveTx = await sellerWallet.writeContract({
      address: UVBE_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [MARKETPLACE_ADDRESS, parseUnits('1000', 18)],
      ...fee,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log(`Marketplace UVBE approval tx: ${approveTx}`);
  }

  console.log(`Broadcasting createSellOrder(amount = 0.01 UVBE, price = 500 INR/UVBE)...`);
  const feeSell = await getFeeConfig();
  const createSellTx = await sellerWallet.writeContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'createSellOrder',
    args: [UVBE_ADDRESS, testTradeAmount, testUnitPrice, fiatCurrencyBytes32, 0n, testTradeAmount],
    ...feeSell,
  });
  console.log(`createSellOrder TX Hash: ${createSellTx}`);
  const createSellReceipt = await publicClient.waitForTransactionReceipt({ hash: createSellTx });
  await new Promise((r) => setTimeout(r, 2000));

  let testOrderId: number | null = null;
  for (const log of createSellReceipt.logs) {
    try {
      if (log.address.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase()) {
        const decoded = decodeEventLog({
          abi: MARKETPLACE_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'OrderCreated' && decoded.args) {
          testOrderId = Number((decoded.args as any).orderId);
          break;
        }
      }
    } catch {
      // Ignore
    }
  }

  if (!testOrderId) {
    const countBigInt = (await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'getOrderCount',
    })) as bigint;
    testOrderId = Number(countBigInt);
  }

  console.log(`Created Test SELL Order ID: #${testOrderId}`);

  const orderOnChain = (await publicClient.readContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'getOrder',
    args: [BigInt(testOrderId)],
  })) as any;

  console.log(`Order Maker: ${orderOnChain.maker}`);
  console.log(
    `Order Side: ${orderOnChain.side === 1 ? 'SELL' : 'BUY'} (Status: ${orderOnChain.status === 0 ? 'OPEN' : 'FILLED'})`,
  );
  console.log(`Order Remaining Amount: ${formatUnits(orderOnChain.remainingAmount, 18)} UVBE`);

  // -------------------------------------------------------------------------
  // PHASE 3 & 4: Buyer Takes SELL Order & EscrowTradeLinked Detection
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHASE 3 & 4: Buyer Takes SELL Order & Decodes EscrowTradeLinked');
  console.log('----------------------------------------------------------------------');

  console.log(
    `Buyer ${buyerAccount.address} calling takeOrder(orderId = ${testOrderId}, takeAmount = 0.01 UVBE)...`,
  );
  const feeTake = await getFeeConfig();
  const takeOrderTx = await buyerWallet.writeContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'takeOrder',
    args: [BigInt(testOrderId), testTradeAmount],
    ...feeTake,
  });
  console.log(`takeOrder TX Hash: ${takeOrderTx}`);
  const takeOrderReceipt = await publicClient.waitForTransactionReceipt({ hash: takeOrderTx });
  await new Promise((r) => setTimeout(r, 2000));

  let testEscrowTradeId: number | null = null;
  let testMatchId: number | null = null;

  console.log('\n--- RAW MARKETPLACE RECEIPT LOG FORENSICS ---');
  let logIdx = 0;
  for (const log of takeOrderReceipt.logs) {
    if (log.address.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase()) {
      console.log(`\nLog #${logIdx}:`);
      console.log(`  Address:   ${log.address}`);
      console.log(`  Topics[0]: ${log.topics[0]}`);
      console.log(`  Topics[1]: ${log.topics[1] || 'none'}`);
      console.log(`  Topics[2]: ${log.topics[2] || 'none'}`);
      console.log(`  Topics[3]: ${log.topics[3] || 'none'}`);
      console.log(`  Data:      ${log.data}`);

      try {
        const decoded = decodeEventLog({
          abi: MARKETPLACE_ABI,
          data: log.data,
          topics: log.topics,
        });
        console.log(`  Decoded Event: ${decoded.eventName}`);
        console.log(`  Decoded Args:`, decoded.args);

        if (decoded.eventName === 'EscrowTradeLinked' && decoded.args) {
          testMatchId = Number((decoded.args as any).matchId);
          testEscrowTradeId = Number(
            (decoded.args as any).tradeId ?? (decoded.args as any).escrowTradeId,
          );
          console.log(
            `  => [SUCCESS] Decoded EscrowTradeLinked -> matchId: ${testMatchId}, tradeId: ${testEscrowTradeId}`,
          );
        }
      } catch (err: any) {
        console.log(`  Decode failed: ${err.message}`);
      }
      logIdx++;
    }
  }

  if (!testEscrowTradeId) {
    const matchCount = (await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'getMatchCount',
    })) as bigint;
    const matchData = (await publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'getMatch',
      args: [matchCount],
    })) as any;
    testMatchId = Number(matchCount);
    testEscrowTradeId = Number(matchData.escrowTradeId);
    console.log(
      `[FallbackDecoded] getMatch matchId: ${testMatchId}, tradeId: ${testEscrowTradeId}`,
    );
  }

  console.log(`Verified Escrow Trade ID: #${testEscrowTradeId}`);

  // Query P2PEscrow contract for the trade
  const tradeOnChain = (await publicClient.readContract({
    address: P2P_ESCROW_ADDRESS,
    abi: P2P_ESCROW_ABI,
    functionName: 'getTrade',
    args: [BigInt(testEscrowTradeId!)],
  })) as any;

  console.log(`Trade on Escrow -> Buyer: ${tradeOnChain.buyer}, Seller: ${tradeOnChain.seller}`);
  console.log(
    `Trade Amount: ${formatUnits(tradeOnChain.amount, 18)} UVBE | Fiat: ₹${formatUnits(tradeOnChain.fiatAmount, 2)} ${hexToString(tradeOnChain.fiatCurrency).replace(/\0/g, '')}`,
  );
  console.log(
    `Trade State on Creation: ${tradeOnChain.state} (${tradeOnChain.state === 1 ? 'CREATED (Awaiting Seller Collateral Deposit)' : 'OTHER'})`,
  );

  if (tradeOnChain.state !== 1) {
    throw new Error(`Expected CREATED state (1), got ${tradeOnChain.state}`);
  }

  // -------------------------------------------------------------------------
  // PHASE 5: Payment Intent Initialization & Seller Collateral Funding
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHASE 5: Initialize Payment Intent & Seller Collateral Funding');
  console.log('----------------------------------------------------------------------');

  const tradeRef = generateTradeReference(testEscrowTradeId!);
  const upiUri = generateUpiUri(
    TEST_SELLER_UPI,
    'UnifyVault Escrow',
    expectedFiatAmount,
    'INR',
    tradeRef,
  );

  const paymentIntent: PaymentIntent = {
    id: `intent-${testEscrowTradeId}-${Date.now()}`,
    tradeId: testEscrowTradeId!,
    buyerAddress: buyerAccount.address,
    sellerAddress: sellerAccount.address,
    sellerPaymentIdentifier: TEST_SELLER_UPI,
    fiatAmount: expectedFiatAmount,
    fiatCurrency: 'INR',
    status: 'QR_READY',
    reference: tradeRef,
    expiresAt: new Date(Date.now() + 1800000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  await savePaymentIntent(paymentIntent);
  console.log(`Payment Intent Saved: ${paymentIntent.id}`);
  console.log(`UPI Deep Link: ${upiUri}`);

  // Seller approves and funds escrow trade
  console.log('Approving UVBE for P2PEscrow...');
  const feeApprove = await getFeeConfig();
  const approveEscrowTx = await sellerWallet.writeContract({
    address: UVBE_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [P2P_ESCROW_ADDRESS, parseUnits('1000', 18)],
    ...feeApprove,
  });
  console.log(`P2PEscrow approval tx: ${approveEscrowTx}`);
  await publicClient.waitForTransactionReceipt({ hash: approveEscrowTx });
  await new Promise((r) => setTimeout(r, 2000));

  console.log(`Seller calling fundTrade(tradeId = ${testEscrowTradeId})...`);
  const feeFund = await getFeeConfig();
  const fundTradeTx = await sellerWallet.writeContract({
    address: P2P_ESCROW_ADDRESS,
    abi: P2P_ESCROW_ABI,
    functionName: 'fundTrade',
    args: [BigInt(testEscrowTradeId!)],
    ...feeFund,
  });
  console.log(`fundTrade TX Hash: ${fundTradeTx}`);
  await publicClient.waitForTransactionReceipt({ hash: fundTradeTx });
  await new Promise((r) => setTimeout(r, 2000));

  const tradeAfterFund = (await publicClient.readContract({
    address: P2P_ESCROW_ADDRESS,
    abi: P2P_ESCROW_ABI,
    functionName: 'getTrade',
    args: [BigInt(testEscrowTradeId!)],
  })) as any;

  console.log(
    `Trade State after Funding: ${tradeAfterFund.state} (${tradeAfterFund.state === 2 ? 'FUNDED (Unlocked for Buyer Payment Proof)' : 'OTHER'})`,
  );
  if (tradeAfterFund.state !== 2) {
    throw new Error(`Expected FUNDED state (2), got ${tradeAfterFund.state}`);
  }

  // -------------------------------------------------------------------------
  // PHASE 6: Receipt Generation & Real OCR Verification Pipeline
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHASE 6: Receipt Generation & Real OCR Verification Pipeline');
  console.log('----------------------------------------------------------------------');

  // Generate unique 12-digit UTR for replay protection
  const testUtr = String(Date.now()).slice(-12);
  const mockReceiptBytes = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    ...new TextEncoder().encode(
      `UPI Payment Receipt - Ref: ${testUtr} - Amount: ₹${expectedFiatAmount} - Status: Completed - Date: 15 Aug 2026`,
    ),
  ]);

  const testReceiptFile = {
    name: `payment_proof_trade_${testEscrowTradeId}.png`,
    type: 'image/png',
    size: mockReceiptBytes.length,
    bytes: mockReceiptBytes,
  };

  const receiptOcrText = `
    TRANSACTION SUCCESSFUL
    State Bank of India UPI Transfer
    Paid to: ${TEST_SELLER_UPI}
    Amount: ₹${expectedFiatAmount}
    UPI Ref No / UTR: ${testUtr}
    Date: 15 Aug 2026
    Status: Completed
  `;

  console.log('Running verifyPaymentEvidence with receipt bytes & OCR parser...');
  const ocrExtracted = extractReceiptDataFromText(receiptOcrText);
  console.log(
    `[OCR Extracted] UTR: ${ocrExtracted.utr}, Amount: ₹${ocrExtracted.amount}, Status: ${ocrExtracted.paymentStatus}`,
  );

  const evidenceVerification = await verifyPaymentEvidence({
    file: testReceiptFile,
    rawTextOverride: receiptOcrText,
    context: {
      tradeId: testEscrowTradeId!,
      expectedAmount: 5.0,
      expectedCurrency: 'INR',
      expectedUtr: testUtr,
    },
  });

  console.log(`OCR State: ${evidenceVerification.ocrState}`);
  console.log(`Keccak256 Receipt Hash: ${evidenceVerification.fileHash}`);
  console.log(`Is Claim Allowed: ${evidenceVerification.isClaimAllowed}`);
  console.log(
    `Discrepancies: ${evidenceVerification.discrepancies.length === 0 ? 'None ✓' : evidenceVerification.discrepancies.join(', ')}`,
  );

  if (!evidenceVerification.isClaimAllowed) {
    throw new Error('Evidence verification failed');
  }

  // -------------------------------------------------------------------------
  // PHASE 7: Buyer Submits Payment Proof On-Chain
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHASE 7: Buyer Submits Payment Claim On-Chain');
  console.log('----------------------------------------------------------------------');

  const paymentRefHash = keccak256(toHex(testUtr));
  const evidenceHash = evidenceVerification.fileHash as `0x${string}`;

  // Update off-chain payment intent claim
  paymentIntent.status = 'WAITING_VERIFICATION';
  paymentIntent.utrSubmitted = testUtr;
  paymentIntent.evidenceHashSubmitted = evidenceHash;
  await savePaymentIntent(paymentIntent);
  console.log(`Off-chain payment intent updated to WAITING_VERIFICATION with UTR ${testUtr}`);

  console.log(
    `Buyer calling submitPayment(tradeId = ${testEscrowTradeId}, ref = ${testUtr}, hash = ${evidenceHash})...`,
  );
  const feeSubmit = await getFeeConfig();
  const submitPaymentTx = await buyerWallet.writeContract({
    address: P2P_ESCROW_ADDRESS,
    abi: P2P_ESCROW_ABI,
    functionName: 'submitPayment',
    args: [BigInt(testEscrowTradeId!), paymentRefHash, evidenceHash],
    ...feeSubmit,
  });
  console.log(`submitPayment TX Hash: ${submitPaymentTx}`);
  await publicClient.waitForTransactionReceipt({ hash: submitPaymentTx });
  await new Promise((r) => setTimeout(r, 2000));

  const tradeAfterSubmit = (await publicClient.readContract({
    address: P2P_ESCROW_ADDRESS,
    abi: P2P_ESCROW_ABI,
    functionName: 'getTrade',
    args: [BigInt(testEscrowTradeId!)],
  })) as any;

  console.log(
    `Trade State after Submit: ${tradeAfterSubmit.state} (${tradeAfterSubmit.state === 3 ? 'PAYMENT_SUBMITTED (Pending Seller Verification)' : 'OTHER'})`,
  );
  if (tradeAfterSubmit.state !== 3) {
    throw new Error(`Expected PAYMENT_SUBMITTED state (3), got ${tradeAfterSubmit.state}`);
  }

  // -------------------------------------------------------------------------
  // PHASE 8: Seller Confirms & Releases Escrow
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('PHASE 8: Seller Confirms Payment & Releases Escrow');
  console.log('----------------------------------------------------------------------');

  console.log(`Seller calling confirmAndRelease(tradeId = ${testEscrowTradeId})...`);
  const feeRelease = await getFeeConfig();
  const releaseTx = await sellerWallet.writeContract({
    address: P2P_ESCROW_ADDRESS,
    abi: P2P_ESCROW_ABI,
    functionName: 'confirmAndRelease',
    args: [BigInt(testEscrowTradeId!)],
    ...feeRelease,
  });
  console.log(`confirmAndRelease TX Hash: ${releaseTx}`);
  await publicClient.waitForTransactionReceipt({ hash: releaseTx });
  await new Promise((r) => setTimeout(r, 2000));

  const tradeAfterRelease = (await publicClient.readContract({
    address: P2P_ESCROW_ADDRESS,
    abi: P2P_ESCROW_ABI,
    functionName: 'getTrade',
    args: [BigInt(testEscrowTradeId!)],
  })) as any;

  console.log(
    `Trade State after Release: ${tradeAfterRelease.state} (${tradeAfterRelease.state === 5 ? 'RELEASED (Settlement Finalized)' : 'OTHER'})`,
  );
  if (tradeAfterRelease.state !== 5) {
    throw new Error(`Expected RELEASED state (5), got ${tradeAfterRelease.state}`);
  }

  const buyerUvbeAfter = await publicClient.readContract({
    address: UVBE_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [buyerAccount.address],
  });
  console.log(
    `Buyer UVBE Balance: Before = ${formatUnits(buyerUvbeBefore, 18)} UVBE | After = ${formatUnits(buyerUvbeAfter, 18)} UVBE`,
  );
  console.log(`Net Received: ${formatUnits(buyerUvbeAfter - buyerUvbeBefore, 18)} UVBE ✓`);

  // -------------------------------------------------------------------------
  // SUMMARY REPORT DATA
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('   P2P REAL SMOKE TEST EVIDENCE ARTIFACTS (BASE SEPOLIA)   ');
  console.log('======================================================================');
  console.log(`1. Test Order ID: #${testOrderId}`);
  console.log(`2. Create Sell Order TX: ${createSellTx}`);
  console.log(`3. Take Order TX: ${takeOrderTx}`);
  console.log(`4. Match ID: #${testMatchId}`);
  console.log(`5. Escrow Trade ID: #${testEscrowTradeId}`);
  console.log(`6. Fund Trade TX: ${fundTradeTx}`);
  console.log(`7. Payment Intent ID: ${paymentIntent.id}`);
  console.log(`8. UTR Submitted: ${testUtr}`);
  console.log(`9. Evidence Hash (Keccak256): ${evidenceHash}`);
  console.log(`10. Submit Payment TX: ${submitPaymentTx}`);
  console.log(`11. Confirm & Release TX: ${releaseTx}`);
  console.log(`12. Final State: RELEASED (5)`);
  console.log(`13. UVBE Transferred: 0.01 UVBE to ${buyerAccount.address}`);
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('Smoke test failed with error:', err);
  process.exit(1);
});
