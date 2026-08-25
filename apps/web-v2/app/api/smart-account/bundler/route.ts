export const dynamic = "force-static";
import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  toHex,
  type Address,
  type Hex,
  type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { ENTRYPOINT_ADDRESS_V07 } from '../../../../lib/smartAccount/constants';
import { getRpcUrl } from '../../../../constants';

const ENTRYPOINT_ABI = parseAbi([
  'function handleOps((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature)[] ops, address payable beneficiary) external',
  'function getUserOpHash((address sender, uint256 nonce, bytes initCode, bytes callData, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes paymasterAndData, bytes signature) userOp) external view returns (bytes32)',
  'function getNonce(address sender, uint192 key) external view returns (uint256)',
  'event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)',
]);

// In-memory UserOp receipt cache
const receiptCache = new Map<
  string,
  {
    userOpHash: Hash;
    txHash: Hash;
    success: boolean;
    sender: Address;
    nonce: bigint;
    blockNumber: bigint;
  }
>();

function getClients() {
  const rpcUrl = getRpcUrl(baseSepolia.id);
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const relayerKey = (process.env.RELAYER_PRIVATE_KEY ||
    process.env.DEPLOYER_PRIVATE_KEY ||
    process.env.PRIVATE_KEY) as `0x${string}` | undefined;

  if (!relayerKey) {
    throw new Error('RELAYER_PRIVATE_KEY environment variable is not configured');
  }

  const relayerAccount = privateKeyToAccount(relayerKey);

  const walletClient = createWalletClient({
    account: relayerAccount,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  return { publicClient, walletClient, relayerAccount };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jsonrpc = '2.0', id = 1, method, params = [] } = body;

    const { publicClient, walletClient, relayerAccount } = getClients();

    // 1. eth_sendUserOperation
    if (method === 'eth_sendUserOperation') {
      const [userOp, entryPointAddr = ENTRYPOINT_ADDRESS_V07] = params;

      const verificationGasLimit = BigInt(userOp.verificationGasLimit || 500000);
      const callGasLimit = BigInt(userOp.callGasLimit || 300000);

      // Transform PackedUserOperation format
      const packedUserOp = {
        sender: userOp.sender as Address,
        nonce: BigInt(userOp.nonce || 0),
        initCode: (userOp.initCode ||
          (userOp.factory
            ? `${userOp.factory}${userOp.factoryData?.slice(2) || ''}`
            : '0x')) as Hex,
        callData: userOp.callData as Hex,
        accountGasLimits: (userOp.accountGasLimits ||
          `0x${toHex(verificationGasLimit, { size: 16 }).slice(2)}${toHex(callGasLimit, { size: 16 }).slice(2)}`) as Hex,
        preVerificationGas: BigInt(userOp.preVerificationGas || 100000),
        gasFees: (userOp.gasFees ||
          `0x${toHex(BigInt(userOp.maxPriorityFeePerGas || parseUnits('0.001', 9)), { size: 16 }).slice(2)}${toHex(BigInt(userOp.maxFeePerGas || parseUnits('0.01', 9)), { size: 16 }).slice(2)}`) as Hex,
        paymasterAndData: (userOp.paymasterAndData ||
          (userOp.paymaster && userOp.paymaster !== '0x0000000000000000000000000000000000000000'
            ? `${userOp.paymaster}${toHex(BigInt(userOp.paymasterVerificationGasLimit || 150000), { size: 16 }).slice(2)}${toHex(BigInt(userOp.paymasterPostOpGasLimit || 50000), { size: 16 }).slice(2)}${userOp.paymasterData?.slice(2) || ''}`
            : '0x')) as Hex,
        signature: userOp.signature as Hex,
      };

      const userOpHash = await publicClient.readContract({
        address: entryPointAddr,
        abi: ENTRYPOINT_ABI,
        functionName: 'getUserOpHash',
        args: [packedUserOp],
      });

      const relayerNonce = await publicClient.getTransactionCount({
        address: relayerAccount.address,
        blockTag: 'pending',
      });

      // Dynamically estimate gas fees from network
      let maxFeePerGas = parseUnits('0.05', 9);
      let maxPriorityFeePerGas = parseUnits('0.01', 9);
      try {
        const fees = await publicClient.estimateFeesPerGas();
        if (fees.maxFeePerGas) {
          maxFeePerGas = fees.maxFeePerGas + parseUnits('0.01', 9);
        }
        if (fees.maxPriorityFeePerGas) {
          maxPriorityFeePerGas = fees.maxPriorityFeePerGas;
        }
      } catch {
        // use defaults
      }

      // Submit handleOps with realistic gas limits
      const txHash = await walletClient.writeContract({
        address: entryPointAddr,
        abi: ENTRYPOINT_ABI,
        functionName: 'handleOps',
        args: [[packedUserOp], relayerAccount.address],
        gas: 1_200_000n,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce: relayerNonce,
      });

      console.log(`[Bundler Relayer] UserOp submitted | Hash: ${userOpHash} | TX: ${txHash}`);

      // Track receipt in cache
      publicClient
        .waitForTransactionReceipt({ hash: txHash })
        .then((receipt) => {
          const success = receipt.status === 'success';
          receiptCache.set(userOpHash.toLowerCase(), {
            userOpHash,
            txHash,
            success,
            sender: packedUserOp.sender,
            nonce: packedUserOp.nonce,
            blockNumber: receipt.blockNumber,
          });
        })
        .catch(console.error);

      return NextResponse.json({
        jsonrpc,
        id,
        result: userOpHash,
      });
    }

    // 2. eth_estimateUserOperationGas
    if (method === 'eth_estimateUserOperationGas') {
      return NextResponse.json({
        jsonrpc,
        id,
        result: {
          preVerificationGas: '0x186a0', // 100,000
          verificationGasLimit: '0x7a120', // 500,000 (allows factory deployment)
          callGasLimit: '0x493e0', // 300,000
          paymasterVerificationGasLimit: '0x249f0', // 150,000
          paymasterPostOpGasLimit: '0xc350', // 50,000
        },
      });
    }

    // 3. eth_getUserOperationReceipt
    if (method === 'eth_getUserOperationReceipt') {
      const [userOpHash] = params;
      const cached = receiptCache.get((userOpHash || '').toLowerCase());

      if (cached) {
        return NextResponse.json({
          jsonrpc,
          id,
          result: {
            userOpHash,
            success: cached.success,
            sender: cached.sender,
            nonce: toHex(cached.nonce),
            receipt: {
              transactionHash: cached.txHash,
              blockNumber: toHex(cached.blockNumber),
              status: cached.success ? '0x1' : '0x0',
            },
          },
        });
      }

      return NextResponse.json({
        jsonrpc,
        id,
        result: {
          userOpHash,
          success: true,
          receipt: {
            status: '0x1',
          },
        },
      });
    }

    // 4. eth_supportedEntryPoints
    if (method === 'eth_supportedEntryPoints') {
      return NextResponse.json({
        jsonrpc,
        id,
        result: [ENTRYPOINT_ADDRESS_V07],
      });
    }

    // 5. Gas price queries
    if (
      method === 'pimlico_getUserOperationGasPrice' ||
      method === 'rundler_maxPriorityFeePerGas' ||
      method === 'eth_gasPrice'
    ) {
      return NextResponse.json({
        jsonrpc,
        id,
        result: {
          fast: {
            maxFeePerGas: '0x3b9aca00',
            maxPriorityFeePerGas: '0x3b9aca00',
          },
          standard: {
            maxFeePerGas: '0x3b9aca00',
            maxPriorityFeePerGas: '0x3b9aca00',
          },
          slow: {
            maxFeePerGas: '0x3b9aca00',
            maxPriorityFeePerGas: '0x3b9aca00',
          },
        },
      });
    }

    // Fallback for unknown methods
    return NextResponse.json(
      {
        jsonrpc,
        id,
        error: {
          code: -32601,
          message: `Method ${method} not supported`,
        },
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error('[Bundler Relayer Error]', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: -32500,
          message: error?.message || 'Transaction execution error in bundler relayer',
        },
      },
      { status: 500 },
    );
  }
}
