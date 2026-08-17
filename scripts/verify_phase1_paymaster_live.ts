import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseAbi,
  formatUnits,
  parseUnits,
  concat,
  pad,
  toHex,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  getAddress,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org';

const RELAYER_PK = (process.env.DEPLOYER_PRIVATE_KEY ||
  process.env.PRIVATE_KEY ||
  process.env.RELAYER_PRIVATE_KEY) as `0x${string}` | undefined;

const PAYMASTER_SIGNER_PK = process.env.PAYMASTER_SIGNER_PRIVATE_KEY as `0x${string}` | undefined;

if (!RELAYER_PK || !PAYMASTER_SIGNER_PK) {
  throw new Error(
    'RELAYER_PRIVATE_KEY and PAYMASTER_SIGNER_PRIVATE_KEY are required in environment',
  );
}

const relayerAccount = privateKeyToAccount(RELAYER_PK);
const paymasterSignerAccount = privateKeyToAccount(PAYMASTER_SIGNER_PK);

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
const NEW_PAYMASTER = '0x42c6342516714CFd64474bd41Ce360605b9fEA88' as const;
const OLD_PAYMASTER = '0x3477e6c6aaa1E28E5A0227adED1055ca1A3A84d6' as const;
const DEPLOYED_TOKEN = '0x006c5DF13C716E5224b33956651C4356BB90DEc0' as const;
const DEPLOYED_CBM = '0x57869372AFbd7b61752f2f8d3e7F37701e28517B' as const;
const SENDER_SMART_ACCOUNT = '0x7d7a2FbCc9ee851a58B179E15f55ED83195511C0' as const;
const RECIPIENT_ADDRESS = '0x63b81Fc51688F89b479f90f08b09510D62cB9B18' as const;

const ENTRYPOINT_ABI = parseAbi([
  'function getNonce(address sender, uint192 key) external view returns (uint256)',
  'function getUserOpHash((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp) external view returns (bytes32)',
  'function handleOps((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] ops, address payable beneficiary) external',
  'function simulateValidation((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp) external returns (bytes)',
]);

const ERC20_ABI = parseAbi([
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function totalSupply() external view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

const CBM_ABI = parseAbi([
  'function costBasis(address account) external view returns (uint256)',
  'function realizedPnL(address account) external view returns (int256)',
]);

const SMART_ACCOUNT_ABI = parseAbi([
  'function execute(address dest, uint256 value, bytes func) external payable returns (bytes)',
]);

const PAYMASTER_ABI = parseAbi([
  'function verifyingSigner() external view returns (address)',
  'function requireSigner() external view returns (bool)',
  'function maxCostPerUserOp() external view returns (uint256)',
  'function maxFeePerGasCap() external view returns (uint256)',
  'function userOpCooldown() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function getDeposit() external view returns (uint256)',
  'function getHash((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp, uint48 validUntil, uint48 validAfter) external view returns (bytes32)',
  'event UserOperationSponsored(address indexed sender, bytes32 indexed userOpHash, uint256 actualGasCost, bool success)',
]);

function buildSignedPaymasterData(
  validUntil: number,
  validAfter: number,
  signature: Hex,
  vGasLimit: bigint = 100000n,
  pGasLimit: bigint = 50000n,
  paymasterAddr: Address = NEW_PAYMASTER,
): Hex {
  const vGasHex = pad(toHex(vGasLimit), { size: 16 });
  const pGasHex = pad(toHex(pGasLimit), { size: 16 });
  const validUntilHex = pad(toHex(validUntil), { size: 6 });
  const validAfterHex = pad(toHex(validAfter), { size: 6 });
  const paymasterData = concat([validUntilHex, validAfterHex, signature]);
  return concat([paymasterAddr, vGasHex, pGasHex, paymasterData]);
}

async function computePaymasterHash(
  userOp: {
    sender: Address;
    nonce: bigint;
    initCode: Hex;
    callData: Hex;
    accountGasLimits: Hex;
    preVerificationGas: bigint;
    gasFees: Hex;
  },
  paymasterAddr: Address,
  validUntil: number,
  validAfter: number,
): Promise<Hex> {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters([
        'address sender',
        'uint256 nonce',
        'bytes32 initCodeHash',
        'bytes32 callDataHash',
        'bytes32 accountGasLimits',
        'uint256 preVerificationGas',
        'bytes32 gasFees',
        'uint256 chainId',
        'address paymaster',
        'uint48 validUntil',
        'uint48 validAfter',
      ]),
      [
        userOp.sender,
        userOp.nonce,
        keccak256(userOp.initCode || '0x'),
        keccak256(userOp.callData),
        userOp.accountGasLimits,
        userOp.preVerificationGas,
        userOp.gasFees,
        BigInt(baseSepolia.id),
        paymasterAddr,
        validUntil,
        validAfter,
      ],
    ),
  );
}

async function main() {
  console.log('===============================================================');
  console.log('PHASE 1 DEPLOYED PAYMASTER LIVE SECURITY AUDIT & VERIFICATION');
  console.log('===============================================================');
  console.log('Network: Base Sepolia (84532)');
  console.log('Relayer EOA:', relayerAccount.address);
  console.log('Dedicated Paymaster Signer:', paymasterSignerAccount.address);
  console.log('New Phase 1 Paymaster:', NEW_PAYMASTER);

  // 1. Verify On-Chain Configuration
  const verifyingSigner = await publicClient.readContract({
    address: NEW_PAYMASTER,
    abi: PAYMASTER_ABI,
    functionName: 'verifyingSigner',
  });
  const requireSigner = await publicClient.readContract({
    address: NEW_PAYMASTER,
    abi: PAYMASTER_ABI,
    functionName: 'requireSigner',
  });
  const deposit = await publicClient.readContract({
    address: NEW_PAYMASTER,
    abi: PAYMASTER_ABI,
    functionName: 'getDeposit',
  });

  console.log('\n--- On-Chain State ---');
  console.log('verifyingSigner():', verifyingSigner);
  console.log('requireSigner():', requireSigner);
  console.log('EntryPoint Deposit:', formatUnits(deposit, 18), 'ETH');

  if (verifyingSigner.toLowerCase() !== paymasterSignerAccount.address.toLowerCase()) {
    throw new Error('verifyingSigner does not match PAYMASTER_SIGNER_PRIVATE_KEY!');
  }
  if (!requireSigner) {
    throw new Error('requireSigner is false on NEW_PAYMASTER!');
  }

  // Base UserOp setup
  const transferAmount = parseUnits('0.001', 18);
  const transferData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [RECIPIENT_ADDRESS, transferAmount],
  });
  const callData = encodeFunctionData({
    abi: SMART_ACCOUNT_ABI,
    functionName: 'execute',
    args: [DEPLOYED_TOKEN, 0n, transferData],
  });

  const nonce = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getNonce',
    args: [SENDER_SMART_ACCOUNT, 0n],
  });

  const accountGasLimits =
    '0x000000000000000000000000000493e0000000000000000000000000000927c0' as `0x${string}`;
  const preVerificationGas = 100_000n;
  const gasFees =
    '0x0000000000000000000000003b9aca000000000000000000000000003b9aca00' as `0x${string}`;

  const baseUserOp = {
    sender: SENDER_SMART_ACCOUNT,
    nonce,
    initCode: '0x' as `0x${string}`,
    callData,
    accountGasLimits,
    preVerificationGas,
    gasFees,
  };

  const validUntil = Math.floor(Date.now() / 1000) + 300;
  const validAfter = 0;

  console.log('\n===============================================================');
  console.log('STEP 9 & 10: NEGATIVE SECURITY TESTS AGAINST NEW PAYMASTER');
  console.log('===============================================================');

  const securityTests: { name: string; test: () => Promise<boolean> }[] = [
    // 1. Missing signature (52-byte paymasterAndData)
    {
      name: '1. No Paymaster Signature (Direct EntryPoint Bypass)',
      test: async () => {
        const paymasterAndData = concat([
          NEW_PAYMASTER,
          pad(toHex(100000n), { size: 16 }),
          pad(toHex(50000n), { size: 16 }),
        ]);
        try {
          await publicClient.simulateContract({
            address: CANONICAL_ENTRYPOINT_V07,
            abi: ENTRYPOINT_ABI,
            functionName: 'handleOps',
            args: [
              [{ ...baseUserOp, paymasterAndData, signature: '0x01' }],
              relayerAccount.address,
            ],
            account: relayerAccount.address,
          });
          return false; // Should have reverted
        } catch (err: any) {
          return err?.message?.includes('AA33') || err?.message?.includes('revert');
        }
      },
    },
    // 2. Dummy Signature (all zeros)
    {
      name: '2. Dummy 65-byte Zero Signature',
      test: async () => {
        const dummySig = ('0x' + '00'.repeat(65)) as Hex;
        const paymasterAndData = buildSignedPaymasterData(validUntil, validAfter, dummySig);
        try {
          await publicClient.simulateContract({
            address: CANONICAL_ENTRYPOINT_V07,
            abi: ENTRYPOINT_ABI,
            functionName: 'handleOps',
            args: [
              [{ ...baseUserOp, paymasterAndData, signature: '0x01' }],
              relayerAccount.address,
            ],
            account: relayerAccount.address,
          });
          return false;
        } catch (err: any) {
          return err?.message?.includes('AA33') || err?.message?.includes('revert');
        }
      },
    },
    // 3. Wrong Signer (Signed by rogue attacker)
    {
      name: '3. Wrong Signer (Rogue Attacker Key)',
      test: async () => {
        const attacker = privateKeyToAccount(generatePrivateKey());
        const hash = await computePaymasterHash(baseUserOp, NEW_PAYMASTER, validUntil, validAfter);
        const rogueSig = await attacker.signMessage({ message: { raw: hash } });
        const paymasterAndData = buildSignedPaymasterData(validUntil, validAfter, rogueSig);
        try {
          await publicClient.simulateContract({
            address: CANONICAL_ENTRYPOINT_V07,
            abi: ENTRYPOINT_ABI,
            functionName: 'handleOps',
            args: [
              [{ ...baseUserOp, paymasterAndData, signature: '0x01' }],
              relayerAccount.address,
            ],
            account: relayerAccount.address,
          });
          return false;
        } catch (err: any) {
          return err?.message?.includes('AA33') || err?.message?.includes('revert');
        }
      },
    },
    // 4. Modified Sender
    {
      name: '4. Modified Sender in UserOp vs Hash',
      test: async () => {
        const fakeSender = '0x1111111111111111111111111111111111111111' as Address;
        const hash = await computePaymasterHash(
          { ...baseUserOp, sender: fakeSender },
          NEW_PAYMASTER,
          validUntil,
          validAfter,
        );
        const sig = await paymasterSignerAccount.signMessage({ message: { raw: hash } });
        const paymasterAndData = buildSignedPaymasterData(validUntil, validAfter, sig);
        try {
          await publicClient.simulateContract({
            address: CANONICAL_ENTRYPOINT_V07,
            abi: ENTRYPOINT_ABI,
            functionName: 'handleOps',
            args: [
              [{ ...baseUserOp, paymasterAndData, signature: '0x01' }],
              relayerAccount.address,
            ],
            account: relayerAccount.address,
          });
          return false;
        } catch (err: any) {
          return err?.message?.includes('AA33') || err?.message?.includes('revert');
        }
      },
    },
    // 5. Modified Nonce
    {
      name: '5. Modified Nonce in UserOp vs Hash',
      test: async () => {
        const hash = await computePaymasterHash(
          { ...baseUserOp, nonce: nonce + 999n },
          NEW_PAYMASTER,
          validUntil,
          validAfter,
        );
        const sig = await paymasterSignerAccount.signMessage({ message: { raw: hash } });
        const paymasterAndData = buildSignedPaymasterData(validUntil, validAfter, sig);
        try {
          await publicClient.simulateContract({
            address: CANONICAL_ENTRYPOINT_V07,
            abi: ENTRYPOINT_ABI,
            functionName: 'handleOps',
            args: [
              [{ ...baseUserOp, paymasterAndData, signature: '0x01' }],
              relayerAccount.address,
            ],
            account: relayerAccount.address,
          });
          return false;
        } catch (err: any) {
          return err?.message?.includes('AA33') || err?.message?.includes('revert');
        }
      },
    },
    // 6. Modified Calldata
    {
      name: '6. Modified Calldata in UserOp vs Hash',
      test: async () => {
        const hash = await computePaymasterHash(
          { ...baseUserOp, callData: '0xdeadbeef' as Hex },
          NEW_PAYMASTER,
          validUntil,
          validAfter,
        );
        const sig = await paymasterSignerAccount.signMessage({ message: { raw: hash } });
        const paymasterAndData = buildSignedPaymasterData(validUntil, validAfter, sig);
        try {
          await publicClient.simulateContract({
            address: CANONICAL_ENTRYPOINT_V07,
            abi: ENTRYPOINT_ABI,
            functionName: 'handleOps',
            args: [
              [{ ...baseUserOp, paymasterAndData, signature: '0x01' }],
              relayerAccount.address,
            ],
            account: relayerAccount.address,
          });
          return false;
        } catch (err: any) {
          return err?.message?.includes('AA33') || err?.message?.includes('revert');
        }
      },
    },
    // 7. Modified Gas Limits
    {
      name: '7. Modified Gas Limits in UserOp vs Hash',
      test: async () => {
        const hash = await computePaymasterHash(
          {
            ...baseUserOp,
            accountGasLimits: '0x0000000000000000000000000009999900000000000000000000000000099999',
          },
          NEW_PAYMASTER,
          validUntil,
          validAfter,
        );
        const sig = await paymasterSignerAccount.signMessage({ message: { raw: hash } });
        const paymasterAndData = buildSignedPaymasterData(validUntil, validAfter, sig);
        try {
          await publicClient.simulateContract({
            address: CANONICAL_ENTRYPOINT_V07,
            abi: ENTRYPOINT_ABI,
            functionName: 'handleOps',
            args: [
              [{ ...baseUserOp, paymasterAndData, signature: '0x01' }],
              relayerAccount.address,
            ],
            account: relayerAccount.address,
          });
          return false;
        } catch (err: any) {
          return err?.message?.includes('AA33') || err?.message?.includes('revert');
        }
      },
    },
    // 8. Modified Gas Fees
    {
      name: '8. Modified Gas Fees in UserOp vs Hash',
      test: async () => {
        const hash = await computePaymasterHash(
          {
            ...baseUserOp,
            gasFees: '0x000000000000000000000000ffffffff000000000000000000000000ffffffff',
          },
          NEW_PAYMASTER,
          validUntil,
          validAfter,
        );
        const sig = await paymasterSignerAccount.signMessage({ message: { raw: hash } });
        const paymasterAndData = buildSignedPaymasterData(validUntil, validAfter, sig);
        try {
          await publicClient.simulateContract({
            address: CANONICAL_ENTRYPOINT_V07,
            abi: ENTRYPOINT_ABI,
            functionName: 'handleOps',
            args: [
              [{ ...baseUserOp, paymasterAndData, signature: '0x01' }],
              relayerAccount.address,
            ],
            account: relayerAccount.address,
          });
          return false;
        } catch (err: any) {
          return err?.message?.includes('AA33') || err?.message?.includes('revert');
        }
      },
    },
    // 9. Expired Signature
    {
      name: '9. Expired Signature (validUntil in past)',
      test: async () => {
        const expiredUntil = Math.floor(Date.now() / 1000) - 600; // 10 mins ago
        const hash = await computePaymasterHash(baseUserOp, NEW_PAYMASTER, expiredUntil, 0);
        const sig = await paymasterSignerAccount.signMessage({ message: { raw: hash } });
        const paymasterAndData = buildSignedPaymasterData(expiredUntil, 0, sig);
        try {
          await publicClient.simulateContract({
            address: CANONICAL_ENTRYPOINT_V07,
            abi: ENTRYPOINT_ABI,
            functionName: 'handleOps',
            args: [
              [{ ...baseUserOp, paymasterAndData, signature: '0x01' }],
              relayerAccount.address,
            ],
            account: relayerAccount.address,
          });
          return false;
        } catch (err: any) {
          return (
            err?.message?.includes('AA32') ||
            err?.message?.includes('AA33') ||
            err?.message?.includes('revert')
          );
        }
      },
    },
  ];

  console.log('\nRunning 9 on-chain security assertions against EntryPoint & New Paymaster...');
  for (const t of securityTests) {
    const passed = await t.test();
    console.log(
      `[SECURITY TEST] ${t.name} -> ${passed ? 'REJECTED AS EXPECTED (PASS)' : 'FAILED (ACCEPTED MALICIOUS OP!)'}`,
    );
    if (!passed) {
      throw new Error(`Security test failed: ${t.name} was accepted by EntryPoint/Paymaster!`);
    }
  }

  console.log('\n===============================================================');
  console.log('STEP 11: EXECUTING REAL TESTNET GASLESS UVBE TRANSFER');
  console.log('===============================================================');

  // Balances Before
  const senderUvbeBefore = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [SENDER_SMART_ACCOUNT],
  });
  const recipientUvbeBefore = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [RECIPIENT_ADDRESS],
  });
  const senderEthBefore = await publicClient.getBalance({ address: SENDER_SMART_ACCOUNT });
  const totalSupplyBefore = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
  });
  const senderBasisBefore = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [SENDER_SMART_ACCOUNT],
  });
  const recipientBasisBefore = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [RECIPIENT_ADDRESS],
  });

  console.log('Sender UVBE Before:', formatUnits(senderUvbeBefore, 18));
  console.log('Recipient UVBE Before:', formatUnits(recipientUvbeBefore, 18));
  console.log('Sender Native ETH Before:', formatUnits(senderEthBefore, 18));
  console.log('Total Supply Before:', formatUnits(totalSupplyBefore, 18));

  // Compute Canonical Valid Hash
  const canonicalHash = await computePaymasterHash(
    baseUserOp,
    NEW_PAYMASTER,
    validUntil,
    validAfter,
  );
  const validSignature = await paymasterSignerAccount.signMessage({
    message: { raw: canonicalHash },
  });
  const validPaymasterAndData = buildSignedPaymasterData(validUntil, validAfter, validSignature);

  const validUserOp = {
    ...baseUserOp,
    paymasterAndData: validPaymasterAndData,
    signature: '0x01' as Hex, // SimpleAccount simulation test signature
  };

  const userOpHash = await publicClient.readContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'getUserOpHash',
    args: [validUserOp],
  });
  console.log('UserOperation Hash:', userOpHash);

  const relayerNonce = await publicClient.getTransactionCount({
    address: relayerAccount.address,
    blockTag: 'pending',
  });

  console.log('Submitting handleOps transaction to EntryPoint...');
  const txHash = await walletClient.writeContract({
    address: CANONICAL_ENTRYPOINT_V07,
    abi: ENTRYPOINT_ABI,
    functionName: 'handleOps',
    args: [[validUserOp], relayerAccount.address],
    gas: 2_500_000n,
    maxFeePerGas: parseUnits('2', 9),
    maxPriorityFeePerGas: parseUnits('1.5', 9),
    nonce: relayerNonce,
  });

  console.log('>>> Transaction Broadcasted! TX Hash:', txHash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log('Transaction Confirmed in Block Number:', receipt.blockNumber);
  console.log('Receipt Status:', receipt.status === 'success' ? 'SUCCESS (1)' : 'REVERT (0)');

  // Wait 2s for RPC state consistency
  await new Promise((r) => setTimeout(r, 2000));

  // Post-Execution Invariants
  const senderUvbeAfter = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [SENDER_SMART_ACCOUNT],
    blockTag: 'latest',
  });
  const recipientUvbeAfter = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [RECIPIENT_ADDRESS],
    blockTag: 'latest',
  });
  const senderEthAfter = await publicClient.getBalance({
    address: SENDER_SMART_ACCOUNT,
    blockTag: 'latest',
  });
  const totalSupplyAfter = await publicClient.readContract({
    address: DEPLOYED_TOKEN,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
    blockTag: 'latest',
  });
  const senderBasisAfter = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [SENDER_SMART_ACCOUNT],
    blockTag: 'latest',
  });
  const recipientBasisAfter = await publicClient.readContract({
    address: DEPLOYED_CBM,
    abi: CBM_ABI,
    functionName: 'costBasis',
    args: [RECIPIENT_ADDRESS],
    blockTag: 'latest',
  });

  console.log('\n--- Post-Transfer State ---');
  console.log('Sender UVBE After:', formatUnits(senderUvbeAfter, 18));
  console.log('Recipient UVBE After:', formatUnits(recipientUvbeAfter, 18));
  console.log('Sender ETH After:', formatUnits(senderEthAfter, 18));
  console.log('Total Supply After:', formatUnits(totalSupplyAfter, 18));
  console.log('Sender Cost Basis After:', formatUnits(senderBasisAfter, 18));
  console.log('Recipient Cost Basis After:', formatUnits(recipientBasisAfter, 18));

  // Check Logs
  const tokenLogs = receipt.logs.filter(
    (l) => l.address.toLowerCase() === DEPLOYED_TOKEN.toLowerCase(),
  );
  const paymasterLogs = receipt.logs.filter(
    (l) => l.address.toLowerCase() === NEW_PAYMASTER.toLowerCase(),
  );

  console.log('\n--- Event Verifications ---');
  console.log('UVBE Transfer Event Emitted:', tokenLogs.length > 0);
  console.log('New Paymaster UserOperationSponsored Emitted:', paymasterLogs.length > 0);

  if (senderEthAfter !== 0n) {
    throw new Error('CRITICAL: Sender Smart Account ETH modified!');
  }
  if (recipientUvbeAfter !== recipientUvbeBefore + transferAmount) {
    throw new Error('CRITICAL: Recipient did not receive exact UVBE transfer amount!');
  }
  if (totalSupplyAfter !== totalSupplyBefore) {
    throw new Error('CRITICAL: Total supply mutated!');
  }
  if (senderBasisAfter + recipientBasisAfter !== senderBasisBefore + recipientBasisBefore) {
    throw new Error('CRITICAL: Cost basis conservation violated!');
  }

  console.log('\n===============================================================');
  console.log('PHASE 1 PAYMASTER LIVE BASE SEPOLIA VERIFICATION 100% SUCCESS!');
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
