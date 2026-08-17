import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  toFunctionSelector,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';

const DEPLOYER_PK = (process.env.DEPLOYER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY ||
  process.env.RELAYER_PRIVATE_KEY) as `0x${string}` | undefined;

if (!DEPLOYER_PK) {
  throw new Error('DEPLOYER_PRIVATE_KEY is required in environment');
}

const deployerAccount = privateKeyToAccount(DEPLOYER_PK);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const walletClient = createWalletClient({
  account: deployerAccount,
  chain: baseSepolia,
  transport: http(RPC_URL),
});

const NEW_PAYMASTER_ADDRESS = '0x42c6342516714CFd64474bd41Ce360605b9fEA88' as const;
const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
const DEPLOYED_TOKEN = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as const;
const DEPLOYED_CONTROLLER = '0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec' as const;
const DEPLOYED_ESCROW = '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb' as const;
const DEPLOYED_TREASURY = '0xD4B19A48c270B720FeeEd57CcAb5aa4eCfcC1fD9' as const;

const PAYMASTER_ABI = parseAbi([
  'function setApprovedTarget(address target, bool approved) external',
  'function setApprovedSelector(address target, bytes4 selector, bool approved) external',
  'function deposit() external payable',
  'function getDeposit() external view returns (uint256)',
  'function approvedTargets(address target) external view returns (bool)',
  'function approvedSelectors(address target, bytes4 selector) external view returns (bool)',
]);

const TREASURY_ABI = parseAbi([
  'function setPaymaster(address newPaymaster) external',
  'function paymaster() external view returns (address)',
]);

async function getNextNonce() {
  return await publicClient.getTransactionCount({
    address: deployerAccount.address,
    blockTag: 'pending',
  });
}

async function sendTx(writeFn: () => Promise<Hex>) {
  const hash = await writeFn();
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  await new Promise((r) => setTimeout(r, 1000));
  return { hash, receipt };
}

async function main() {
  console.log('=== CONFIGURING PHASE 1 PAYMASTER POLICY & DEPOSIT ===');
  console.log('Target Paymaster:', NEW_PAYMASTER_ADDRESS);

  // 1. Whitelist Targets
  const targets = [
    { name: 'USDC', address: BASE_SEPOLIA_USDC },
    { name: 'Controller', address: DEPLOYED_CONTROLLER },
    { name: 'UVBE', address: DEPLOYED_TOKEN },
    { name: 'P2PEscrow', address: DEPLOYED_ESCROW },
  ];

  for (const t of targets) {
    const isApproved = await publicClient.readContract({
      address: NEW_PAYMASTER_ADDRESS,
      abi: PAYMASTER_ABI,
      functionName: 'approvedTargets',
      args: [t.address],
    });
    if (!isApproved) {
      const nonce = await getNextNonce();
      const { hash } = await sendTx(() =>
        walletClient.writeContract({
          address: NEW_PAYMASTER_ADDRESS,
          abi: PAYMASTER_ABI,
          functionName: 'setApprovedTarget',
          args: [t.address, true],
          nonce,
          gas: 200_000n,
          maxFeePerGas: parseUnits('2', 9),
          maxPriorityFeePerGas: parseUnits('1.5', 9),
        }),
      );
      console.log(`[Target Whitelisted] ${t.name} (${t.address}) | TX: ${hash}`);
    } else {
      console.log(`[Target Already Whitelisted] ${t.name}`);
    }
  }

  // 2. Whitelist Selectors
  const selectors = [
    {
      target: BASE_SEPOLIA_USDC,
      name: 'USDC.approve',
      selector: toFunctionSelector('approve(address,uint256)'),
    },
    {
      target: DEPLOYED_CONTROLLER,
      name: 'Controller.deposit',
      selector: toFunctionSelector('deposit(address,uint256,uint256,address)'),
    },
    {
      target: DEPLOYED_CONTROLLER,
      name: 'Controller.redeem',
      selector: toFunctionSelector('redeem(address,uint256,uint256,address,uint256)'),
    },
    {
      target: DEPLOYED_TOKEN,
      name: 'UVBE.transfer',
      selector: toFunctionSelector('transfer(address,uint256)'),
    },
    {
      target: DEPLOYED_TOKEN,
      name: 'UVBE.approve',
      selector: toFunctionSelector('approve(address,uint256)'),
    },
    {
      target: DEPLOYED_ESCROW,
      name: 'P2PEscrow.createTrade',
      selector: toFunctionSelector(
        'createTrade((address,address,address,uint256,uint256,bytes32,uint256))',
      ),
    },
    {
      target: DEPLOYED_ESCROW,
      name: 'P2PEscrow.fundTrade',
      selector: toFunctionSelector('fundTrade(uint256)'),
    },
    {
      target: DEPLOYED_ESCROW,
      name: 'P2PEscrow.submitPayment',
      selector: toFunctionSelector('submitPayment(uint256,bytes32,bytes32)'),
    },
    {
      target: DEPLOYED_ESCROW,
      name: 'P2PEscrow.confirmAndRelease',
      selector: toFunctionSelector('confirmAndRelease(uint256)'),
    },
    {
      target: DEPLOYED_ESCROW,
      name: 'P2PEscrow.refund',
      selector: toFunctionSelector('refund(uint256)'),
    },
    {
      target: DEPLOYED_ESCROW,
      name: 'P2PEscrow.cancelUnfundedTrade',
      selector: toFunctionSelector('cancelUnfundedTrade(uint256)'),
    },
    {
      target: DEPLOYED_ESCROW,
      name: 'P2PEscrow.raiseDispute',
      selector: toFunctionSelector('raiseDispute(uint256,bytes32)'),
    },
  ];

  for (const s of selectors) {
    const isApproved = await publicClient.readContract({
      address: NEW_PAYMASTER_ADDRESS,
      abi: PAYMASTER_ABI,
      functionName: 'approvedSelectors',
      args: [s.target, s.selector as Hex],
    });
    if (!isApproved) {
      const nonce = await getNextNonce();
      const { hash } = await sendTx(() =>
        walletClient.writeContract({
          address: NEW_PAYMASTER_ADDRESS,
          abi: PAYMASTER_ABI,
          functionName: 'setApprovedSelector',
          args: [s.target, s.selector as Hex, true],
          nonce,
          gas: 200_000n,
          maxFeePerGas: parseUnits('2', 9),
          maxPriorityFeePerGas: parseUnits('1.5', 9),
        }),
      );
      console.log(`[Selector Whitelisted] ${s.name} (${s.selector}) | TX: ${hash}`);
    } else {
      console.log(`[Selector Already Whitelisted] ${s.name}`);
    }
  }

  // 3. Deposit to EntryPoint
  const currentDeposit = await publicClient.readContract({
    address: NEW_PAYMASTER_ADDRESS,
    abi: PAYMASTER_ABI,
    functionName: 'getDeposit',
  });
  console.log('Current EntryPoint Deposit:', currentDeposit);

  if (currentDeposit < parseUnits('0.01', 18)) {
    const nonce = await getNextNonce();
    const { hash } = await sendTx(() =>
      walletClient.writeContract({
        address: NEW_PAYMASTER_ADDRESS,
        abi: PAYMASTER_ABI,
        functionName: 'deposit',
        value: parseUnits('0.015', 18),
        nonce,
        gas: 300_000n,
        maxFeePerGas: parseUnits('2', 9),
        maxPriorityFeePerGas: parseUnits('1.5', 9),
      }),
    );
    console.log(`[Deposit Added] 0.015 ETH deposited to EntryPoint | TX: ${hash}`);
  }

  // 4. Update GasTreasury Paymaster
  const currentTreasuryPm = await publicClient.readContract({
    address: DEPLOYED_TREASURY,
    abi: TREASURY_ABI,
    functionName: 'paymaster',
  });
  console.log('Current GasTreasury Paymaster:', currentTreasuryPm);

  if (currentTreasuryPm.toLowerCase() !== NEW_PAYMASTER_ADDRESS.toLowerCase()) {
    const nonce = await getNextNonce();
    const { hash } = await sendTx(() =>
      walletClient.writeContract({
        address: DEPLOYED_TREASURY,
        abi: TREASURY_ABI,
        functionName: 'setPaymaster',
        args: [NEW_PAYMASTER_ADDRESS],
        nonce,
        gas: 200_000n,
        maxFeePerGas: parseUnits('2', 9),
        maxPriorityFeePerGas: parseUnits('1.5', 9),
      }),
    );
    console.log(`[GasTreasury Updated] setPaymaster -> ${NEW_PAYMASTER_ADDRESS} | TX: ${hash}`);
  }

  const finalDeposit = await publicClient.readContract({
    address: NEW_PAYMASTER_ADDRESS,
    abi: PAYMASTER_ABI,
    functionName: 'getDeposit',
  });
  console.log('\n=== FINAL VERIFICATION ===');
  console.log('New Paymaster EntryPoint Deposit:', finalDeposit);
  console.log('Configuration Completed Successfully!');
}

main().catch((err) => {
  console.error('Configuration failed:', err);
  process.exit(1);
});
