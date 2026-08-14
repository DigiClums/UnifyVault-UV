import {
  createPublicClient,
  http,
  type Account,
  type Address,
  type Client,
  type Hex,
  type LocalAccount,
  type OneOf,
  type Transport,
  type WalletClient,
} from 'viem';
import { baseSepolia, type Chain } from 'viem/chains';
import { toSimpleSmartAccount } from 'permissionless/accounts';
import { createSmartAccountClient, type SmartAccountClient } from 'permissionless';
import { ENTRYPOINT_ADDRESS_V07 } from './constants';
import { getBundlerRpcUrl, getPaymasterRpcUrl, getPaymasterAddress } from './config';
import { getRpcUrl } from '../../constants';
import { BundlerProvider } from './providers/bundlerProvider';
import { PaymasterProvider } from './providers/paymasterProvider';

export type SmartAccountOwner = OneOf<
  WalletClient<Transport, Chain | undefined, Account> | LocalAccount
>;

/**
 * Creates a standard ERC-4337 v0.7 SimpleSmartAccount instance for the given owner.
 * Preserves non-custodial EOA ownership and deterministic address counterfactuals.
 */
export async function createSimpleAccount(params: {
  owner: SmartAccountOwner;
  publicClient?: Client;
  entryPointAddress?: Address;
}) {
  const {
    owner,
    publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(getRpcUrl(baseSepolia.id)),
    }),
    entryPointAddress = ENTRYPOINT_ADDRESS_V07,
  } = params;

  return await toSimpleSmartAccount({
    client: publicClient,
    owner,
    entryPoint: {
      address: entryPointAddress,
      version: '0.7',
    },
  });
}

/**
 * Creates a provider-agnostic Bundler & Paymaster client wrapper.
 */
export function createAAInfrastructureClient(params?: {
  chainId?: number;
  bundlerRpcUrl?: string;
  paymasterRpcUrl?: string;
  paymasterAddress?: Address;
  entryPointAddress?: Address;
}) {
  const {
    chainId = baseSepolia.id,
    bundlerRpcUrl = getBundlerRpcUrl(chainId),
    paymasterRpcUrl = getPaymasterRpcUrl(chainId),
    paymasterAddress = getPaymasterAddress(chainId),
  } = params || {};

  const bundlerProvider = new BundlerProvider({ rpcUrl: bundlerRpcUrl, chainId });
  const paymasterProvider = new PaymasterProvider({
    rpcUrl: paymasterRpcUrl,
    paymasterAddress,
    chainId,
  });

  return { bundlerProvider, paymasterProvider };
}

/**
 * @deprecated Provided for backward-compatibility with Phase 2A test suites.
 */
export function createPimlicoBundlerAndPaymasterClient(params?: {
  chainId?: number;
  entryPointAddress?: Address;
}) {
  return createAAInfrastructureClient(params);
}

/**
 * Creates a fully configured SmartAccountClient with provider-agnostic gas sponsorship.
 * Connects to UnifyVault self-managed Bundler & Paymaster without third-party vendor lock-in.
 */
export async function getSponsoredSmartAccountClient(params: {
  owner: SmartAccountOwner;
  publicClient?: Client;
  chainId?: number;
  entryPointAddress?: Address;
  bundlerRpcUrl?: string;
  paymasterRpcUrl?: string;
  paymasterAddress?: Address;
}) {
  const {
    owner,
    chainId = baseSepolia.id,
    entryPointAddress = ENTRYPOINT_ADDRESS_V07,
    bundlerRpcUrl = getBundlerRpcUrl(chainId),
    paymasterRpcUrl = getPaymasterRpcUrl(chainId),
    paymasterAddress = getPaymasterAddress(chainId),
  } = params;

  const publicClient =
    params.publicClient ||
    createPublicClient({
      chain: baseSepolia,
      transport: http(getRpcUrl(chainId)),
    });

  const account = await createSimpleAccount({
    owner,
    publicClient,
    entryPointAddress,
  });

  const bundlerProvider = new BundlerProvider({ rpcUrl: bundlerRpcUrl, chainId });
  const paymasterProvider = new PaymasterProvider({
    rpcUrl: paymasterRpcUrl,
    paymasterAddress,
    chainId,
  });

  return createSmartAccountClient({
    account,
    chain: baseSepolia,
    bundlerTransport: http(bundlerRpcUrl),
    paymaster: {
      getPaymasterStubData: async (userOp) => {
        const stub = await paymasterProvider.getPaymasterStubData(userOp, entryPointAddress);
        return {
          paymaster: stub.paymaster,
          paymasterData: stub.paymasterData || (('0x' + '00'.repeat(77)) as Hex),
          paymasterVerificationGasLimit: stub.paymasterVerificationGasLimit ?? 100000n,
          paymasterPostOpGasLimit: stub.paymasterPostOpGasLimit ?? 50000n,
          preVerificationGas: stub.preVerificationGas,
          verificationGasLimit: stub.verificationGasLimit,
          callGasLimit: stub.callGasLimit,
        };
      },
      getPaymasterData: async (userOp) => {
        const data = await paymasterProvider.getPaymasterData(userOp, entryPointAddress);
        return {
          paymaster: data.paymaster,
          paymasterData: data.paymasterData || (('0x' + '00'.repeat(77)) as Hex),
          paymasterVerificationGasLimit: data.paymasterVerificationGasLimit ?? 100000n,
          paymasterPostOpGasLimit: data.paymasterPostOpGasLimit ?? 50000n,
        };
      },
    },
    userOperation: {
      estimateFeesPerGas: async () => {
        return await bundlerProvider.getUserOperationGasPrice();
      },
    },
  });
}
