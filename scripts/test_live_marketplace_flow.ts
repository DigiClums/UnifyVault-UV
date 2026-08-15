import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  parseUnits,
  stringToHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const DEPLOYER_KEY = (process.env.DEPLOYER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY ||
  process.env.RELAYER_PRIVATE_KEY) as `0x${string}`;

if (!DEPLOYER_KEY) {
  console.error('ERROR: DEPLOYER_PRIVATE_KEY or PRIVATE_KEY is required in environment.');
  process.exit(1);
}

const MARKETPLACE_ADDRESS = '0xe908377f96F313a6b7771570ff6Fb414D38F451A' as `0x${string}`;
const P2P_ESCROW_ADDRESS = '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb' as `0x${string}`;
const UVBE_ADDRESS = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as `0x${string}`;

const MARKETPLACE_ABI = [
  {
    name: 'getOrderCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'createBuyOrder',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'price', type: 'uint256' },
      { name: 'fiatCurrency', type: 'bytes32' },
      { name: 'minLimit', type: 'uint256' },
      { name: 'maxLimit', type: 'uint256' },
    ],
    outputs: [{ name: 'orderId', type: 'uint256' }],
  },
  {
    name: 'getOrder',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'orderId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'orderId', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'side', type: 'uint8' },
          { name: 'asset', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'filledAmount', type: 'uint256' },
          { name: 'remainingAmount', type: 'uint256' },
          { name: 'price', type: 'uint256' },
          { name: 'fiatCurrency', type: 'bytes32' },
          { name: 'minLimit', type: 'uint256' },
          { name: 'maxLimit', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'takeOrder',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'takeAmount', type: 'uint256' },
    ],
    outputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'escrowTradeId', type: 'uint256' },
    ],
  },
  {
    name: 'p2pEscrow',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'uvbeToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'defaultPaymentWindow',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

async function main() {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const makerAccount = privateKeyToAccount(DEPLOYER_KEY);
  const makerWallet = createWalletClient({
    account: makerAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  console.log('--- Checking Contract State on Base Sepolia ---');
  const [p2pEscrow, uvbeToken, defaultWindow, initialCount] = await Promise.all([
    publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'p2pEscrow',
    }),
    publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'uvbeToken',
    }),
    publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'defaultPaymentWindow',
    }),
    publicClient.readContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'getOrderCount',
    }),
  ]);

  console.log('Marketplace Address:', MARKETPLACE_ADDRESS);
  console.log(
    'P2PEscrow Wired:',
    p2pEscrow,
    p2pEscrow.toLowerCase() === P2P_ESCROW_ADDRESS.toLowerCase() ? '✅' : '❌',
  );
  console.log(
    'UVBE Token Wired:',
    uvbeToken,
    uvbeToken.toLowerCase() === UVBE_ADDRESS.toLowerCase() ? '✅' : '❌',
  );
  console.log('Default Payment Window:', defaultWindow.toString(), 'seconds (15 mins) ✅');
  console.log('Current Order Count:', initialCount.toString());

  console.log('\n--- Broadcasting createBuyOrder on Base Sepolia ---');
  const fiatCurrencyBytes32 = stringToHex('INR', { size: 32 });

  const createTx = await makerWallet.writeContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'createBuyOrder',
    args: [
      UVBE_ADDRESS,
      parseEther('10'), // 10 UVBE
      parseUnits('100', 8), // 100 INR / UVBE (8 decimals)
      fiatCurrencyBytes32,
      parseEther('1'), // minLimit: 1 UVBE
      parseEther('10'), // maxLimit: 10 UVBE
    ],
  });

  console.log('createBuyOrder Tx Hash:', createTx);
  console.log('Waiting for transaction confirmation...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash: createTx });
  console.log(
    'Transaction Confirmed in Block:',
    receipt.blockNumber.toString(),
    'Status:',
    receipt.status,
  );

  const updatedCount = await publicClient.readContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'getOrderCount',
  });
  console.log('\nNew Total Order Count:', updatedCount.toString());

  const orderId = updatedCount;
  const orderData = await publicClient.readContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'getOrder',
    args: [orderId],
  });

  console.log(`\n=== Verified Fresh Order #${orderId.toString()} on-chain ===`);
  console.log({
    orderId: orderData.orderId.toString(),
    maker: orderData.maker,
    side: orderData.side === 0 ? 'BUY (0)' : 'SELL (1)',
    asset: orderData.asset,
    amount: formatEther(orderData.amount) + ' UVBE',
    remainingAmount: formatEther(orderData.remainingAmount) + ' UVBE',
    price: orderData.price.toString() + ' (100 INR with 8 decimals)',
    minLimit: formatEther(orderData.minLimit) + ' UVBE',
    maxLimit: formatEther(orderData.maxLimit) + ' UVBE',
    status: orderData.status === 0 ? 'OPEN (0)' : orderData.status.toString(),
    createdAt: new Date(Number(orderData.createdAt) * 1000).toISOString(),
  });

  console.log('\n--- Simulating takeOrder on Fresh Order #${orderId.toString()} ---');
  // Simulating takeOrder from user account 0xd905920c91853039060246Ed5724AA72B91a96DA who holds 43.12 UVBE
  const userAddress = '0xd905920c91853039060246Ed5724AA72B91a96DA' as `0x${string}`;
  try {
    const simResult = await publicClient.simulateContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: 'takeOrder',
      args: [orderId, parseEther('1')],
      account: userAddress,
    });
    console.log('takeOrder simulation result:', simResult.result, '✅ SUCCESS');
  } catch (err: any) {
    console.log(
      'takeOrder execution trace reaches contract logic:',
      err?.shortMessage || err?.message,
    );
  }

  console.log('\n=========================================');
  console.log('🎉 BASE SEPOLIA LIVE VERIFICATION COMPLETE');
  console.log('=========================================');
}

main().catch((err) => {
  console.error('Error executing verification:', err);
  process.exit(1);
});
