import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  formatUnits,
  parseUnits,
  toFunctionSelector,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import fs from 'fs';
import path from 'path';

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';

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

// Addresses
const CANONICAL_ENTRYPOINT_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;
const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
const DEPLOYED_TOKEN = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as const;
const DEPLOYED_CONTROLLER = '0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec' as const;
const DEPLOYED_ESCROW = '0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb' as const;
const DEPLOYED_TREASURY = '0xD4B19A48c270B720FeeEd57CcAb5aa4eCfcC1fD9' as const;

const TREASURY_ABI = parseAbi([
  'function setPaymaster(address newPaymaster) external',
  'function paymaster() external view returns (address)',
]);

async function getNextNonce(address: Address) {
  return await publicClient.getTransactionCount({
    address,
    blockTag: 'pending',
  });
}

async function sendTx(txPromise: Promise<Hex>) {
  const hash = await txPromise;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  await new Promise((r) => setTimeout(r, 1500));
  return { hash, receipt };
}

async function main() {
  console.log('=== DEPLOYING PHASE 1 HARDENED UNIFYVAULT PAYMASTER TO BASE SEPOLIA ===');
  console.log('Deployer / Owner:', deployerAccount.address);
  console.log('Canonical EntryPoint v0.7:', CANONICAL_ENTRYPOINT_V07);

  // 1. Dedicated Paymaster Signer Setup
  const signerKey = process.env.PAYMASTER_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;
  if (!signerKey) {
    throw new Error('PAYMASTER_SIGNER_PRIVATE_KEY is required in environment');
  }

  const signerAccount = privateKeyToAccount(signerKey);
  const verifyingSigner = signerAccount.address;
  console.log('Dedicated verifyingSigner Address:', verifyingSigner);

  if (verifyingSigner.toLowerCase() === deployerAccount.address.toLowerCase()) {
    throw new Error('Security violation: verifyingSigner cannot be deployer/owner address!');
  }

  // 2. Load Compiled Phase 1 Artifact
  const artifactPath = path.resolve(
    __dirname,
    '../packages/protocol/out/UnifyVaultPaymaster.sol/UnifyVaultPaymaster.json',
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const bytecode = artifact.bytecode.object as `0x${string}`;
  const abi = artifact.abi;

  // 3. Deploy UnifyVaultPaymaster
  console.log('\n--- Deploying Contract ---');
  const maxCostPerUserOp = parseUnits('0.05', 18); // 0.05 ether

  const deployNonce = await getNextNonce(deployerAccount.address);
  const deployTxHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [CANONICAL_ENTRYPOINT_V07, deployerAccount.address, verifyingSigner, maxCostPerUserOp],
    nonce: deployNonce,
    gas: 2_500_000n,
    maxFeePerGas: parseUnits('2', 9),
    maxPriorityFeePerGas: parseUnits('1.5', 9),
  });

  console.log('Deploy TX Hash:', deployTxHash);
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
  const NEW_PAYMASTER_ADDRESS = deployReceipt.contractAddress!;
  console.log('>>> NEW PHASE 1 PAYMASTER DEPLOYED AT:', NEW_PAYMASTER_ADDRESS);
  console.log('Block Number:', deployReceipt.blockNumber);

  // 4. On-Chain Parameter Verification
  const PAYMASTER_ABI = parseAbi([
    'function verifyingSigner() external view returns (address)',
    'function requireSigner() external view returns (bool)',
    'function maxCostPerUserOp() external view returns (uint256)',
    'function maxFeePerGasCap() external view returns (uint256)',
    'function userOpCooldown() external view returns (uint256)',
    'function owner() external view returns (address)',
    'function entryPoint() external view returns (address)',
    'function setApprovedTarget(address target, bool approved) external',
    'function setApprovedSelector(address target, bytes4 selector, bool approved) external',
    'function deposit() external payable',
    'function getDeposit() external view returns (uint256)',
  ]);

  const onChainSigner = await publicClient.readContract({
    address: NEW_PAYMASTER_ADDRESS,
    abi: PAYMASTER_ABI,
    functionName: 'verifyingSigner',
  });
  const onChainRequireSigner = await publicClient.readContract({
    address: NEW_PAYMASTER_ADDRESS,
    abi: PAYMASTER_ABI,
    functionName: 'requireSigner',
  });
  const onChainOwner = await publicClient.readContract({
    address: NEW_PAYMASTER_ADDRESS,
    abi: PAYMASTER_ABI,
    functionName: 'owner',
  });
  const onChainEntryPoint = await publicClient.readContract({
    address: NEW_PAYMASTER_ADDRESS,
    abi: PAYMASTER_ABI,
    functionName: 'entryPoint',
  });

  console.log('\n--- Post-Deployment On-Chain Verification ---');
  console.log('verifyingSigner():', onChainSigner);
  console.log('requireSigner():', onChainRequireSigner);
  console.log('owner():', onChainOwner);
  console.log('entryPoint():', onChainEntryPoint);

  if (onChainSigner.toLowerCase() !== verifyingSigner.toLowerCase()) {
    throw new Error('Signer mismatch on deployed contract!');
  }
  if (!onChainRequireSigner) {
    throw new Error('requireSigner is false! Phase 1 requirement violated.');
  }

  // 5. Configure Whitelist Policy
  console.log('\n--- Configuring Target & Selector Whitelist ---');
  const targets = [
    { name: 'USDC', address: BASE_SEPOLIA_USDC },
    { name: 'Controller', address: DEPLOYED_CONTROLLER },
    { name: 'UVBE', address: DEPLOYED_TOKEN },
    { name: 'P2PEscrow', address: DEPLOYED_ESCROW },
  ];

  for (const t of targets) {
    const nonce = await getNextNonce(deployerAccount.address);
    const { hash } = await sendTx(
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
    console.log(`Approved Target: ${t.name} (${t.address}) | TX: ${hash}`);
  }

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
    const nonce = await getNextNonce(deployerAccount.address);
    const { hash } = await sendTx(
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
    console.log(`Approved Selector: ${s.name} (${s.selector}) | TX: ${hash}`);
  }

  // 6. Fund New Paymaster on EntryPoint
  console.log('\n--- Funding Paymaster Deposit on EntryPoint ---');
  const depositNonce = await getNextNonce(deployerAccount.address);
  const { hash: depositHash } = await sendTx(
    walletClient.writeContract({
      address: NEW_PAYMASTER_ADDRESS,
      abi: PAYMASTER_ABI,
      functionName: 'deposit',
      value: parseUnits('0.15', 18), // 0.15 ETH
      nonce: depositNonce,
      gas: 300_000n,
      maxFeePerGas: parseUnits('2', 9),
      maxPriorityFeePerGas: parseUnits('1.5', 9),
    }),
  );
  console.log(`Deposited 0.15 ETH to EntryPoint | TX: ${depositHash}`);

  // 7. Update GasTreasury linkage
  console.log('\n--- Updating GasTreasury Paymaster Address ---');
  const treasuryNonce = await getNextNonce(deployerAccount.address);
  const { hash: treasuryHash } = await sendTx(
    walletClient.writeContract({
      address: DEPLOYED_TREASURY,
      abi: TREASURY_ABI,
      functionName: 'setPaymaster',
      args: [NEW_PAYMASTER_ADDRESS],
      nonce: treasuryNonce,
      gas: 200_000n,
      maxFeePerGas: parseUnits('2', 9),
      maxPriorityFeePerGas: parseUnits('1.5', 9),
    }),
  );
  console.log(`GasTreasury paymaster updated to ${NEW_PAYMASTER_ADDRESS} | TX: ${treasuryHash}`);

  // 8. Output configuration instructions
  console.log('\n=== DEPLOYMENT AND CONFIGURATION SUMMARY ===');
  console.log('NEW_PAYMASTER_ADDRESS:', NEW_PAYMASTER_ADDRESS);
  console.log('PAYMASTER_VERIFYING_SIGNER:', verifyingSigner);
  console.log('PAYMASTER_SIGNER_PRIVATE_KEY_SET:', !!signerKey);
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
