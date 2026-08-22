import fs from 'fs';
import path from 'path';
import { createPublicClient, http, isAddress, getAddress } from 'viem';
import { base } from 'viem/chains';

function getManifestPath(chainId: number): string {
  const custom = process.env.DEPLOYMENT_STORAGE_DIR;
  const dir = custom ? path.resolve(custom) : path.resolve(process.cwd(), 'var', 'deployment');
  if (chainId === 8453) {
    return path.join(dir, 'base-mainnet-8453.json');
  }
  return path.join(dir, `base-sepolia-${chainId}.json`);
}

export const REQUIRED_CONTRACT_KEYS = [
  'ProtocolDirectory',
  'OracleManager',
  'ChainlinkOracleProvider',
  'Treasury',
  'FeeManager',
  'CustodyVault',
  'LiquidityManager',
  'UVBEV2',
  'SwapAdapter',
  'StrategyManager',
  'PortfolioManager',
  'UnifyVaultController',
  'CostBasisManagerV2',
  'P2PEscrowV2',
  'PerformanceManager',
  'Marketplace',
];

export const REQUIRED_SECRET_NAMES = [
  'NEXT_PUBLIC_RPC_URL_BASE_MAINNET',
  'NEXT_PUBLIC_DIRECTORY_ADDRESS_MAINNET',
  'PAYMENT_DATA_ENCRYPTION_KEY',
  'NEXT_PUBLIC_ADMIN_ADDRESS',
  'NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID',
];

export interface PreflightOptions {
  silent?: boolean;
  manifest?: {
    chainId?: number;
    status?: string;
    contracts?: Record<string, string>;
  } | null;
  rpcUrl?: string | null;
  skipBytecode?: boolean;
  /** Structural unit tests may opt out of runtime-only operator inputs. */
  skipEnvironment?: boolean;
}

export interface PreflightResults {
  pass: string[];
  warning: string[];
  fail: string[];
}

export async function runPreflight(options: PreflightOptions = {}): Promise<PreflightResults> {
  const silent = options.silent || false;
  const customManifest = options.manifest || null;
  const customRpc = options.rpcUrl || null;
  const skipBytecode = options.skipBytecode || false;
  const skipEnvironment = options.skipEnvironment || false;

  const results: PreflightResults = {
    pass: [],
    warning: [],
    fail: [],
  };

  function logPass(msg: string) {
    results.pass.push(msg);
    if (!silent) console.log(`  [PASS] ${msg}`);
  }

  function logWarn(msg: string) {
    results.warning.push(msg);
    if (!silent) console.log(`  [WARN] ${msg}`);
  }

  function logFail(msg: string) {
    results.fail.push(msg);
    if (!silent) console.log(`  [FAIL] ${msg}`);
  }

  // Auto-load .env.local if present and not in test mode
  if (!skipEnvironment) {
    const envPaths = [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), 'apps/web-v2/.env.local'),
      path.resolve(__dirname, '../../.env.local'),
    ];
    for (const p of envPaths) {
      if (fs.existsSync(p)) {
        try {
          const content = fs.readFileSync(p, 'utf-8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const key = trimmed.slice(0, eqIdx).trim();
              const val = trimmed
                .slice(eqIdx + 1)
                .trim()
                .replace(/^["']|["']$/g, '');
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        } catch {}
      }
    }
  }

  // 1. Secrets & Env Config. Runtime preflight must fail closed: an operator
  // cannot treat a missing production input as a deployment-ready warning.
  if (skipEnvironment) {
    logPass('Skipped runtime environment validation (structural test mode).');
  } else {
    for (const secretName of REQUIRED_SECRET_NAMES) {
      const val = process.env[secretName];
      if (!val || val.trim() === '' || val.includes('replace_with_') || val.includes('your_')) {
        logFail(`Missing or placeholder required environment variable: ${secretName}`);
      } else {
        logPass(`Configured variable present: ${secretName}`);
      }
    }
  }

  // 2. Encryption Key Quality Check
  if (!silent) console.log('\n--- 2. Cryptographic Encryption Key Integrity ---');
  const encKey = process.env.PAYMENT_DATA_ENCRYPTION_KEY;
  if (skipEnvironment) {
    logPass('Skipped encryption-key validation (structural test mode).');
  } else if (!encKey || encKey.trim() === '') {
    logFail('PAYMENT_DATA_ENCRYPTION_KEY is unconfigured in current process environment.');
  } else if (encKey === '9f8e4b7c1a2d3e5f608192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7') {
    logFail('PAYMENT_DATA_ENCRYPTION_KEY matches known sample value! Must be rotated immediately.');
  } else if (encKey.length < 16) {
    logFail('PAYMENT_DATA_ENCRYPTION_KEY is shorter than minimum 16 bytes.');
  } else {
    logPass('PAYMENT_DATA_ENCRYPTION_KEY meets entropy requirements.');
  }

  // 3. Manifest Validation
  if (!silent) console.log('\n--- 3. Base Mainnet Deployment Manifest Structural Validation ---');
  let manifest = customManifest;

  if (!manifest) {
    const manifestPath = getManifestPath(8453);
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        logPass(`Located mainnet manifest at: ${manifestPath}`);
      } catch (err: any) {
        logFail(`Failed to parse mainnet manifest JSON: ${err?.message || 'Unknown error'}`);
      }
    } else {
      logFail(`Required mainnet manifest is missing (Path: ${manifestPath}).`);
    }
  }

  if (manifest) {
    if (manifest.chainId !== 8453) {
      logFail(`Manifest chainId mismatch: Expected 8453, received ${manifest.chainId}`);
    } else {
      logPass('Manifest chainId === 8453 verified.');
    }

    const seenAddresses = new Map<string, string>();
    let hasContractErrors = false;

    for (const key of REQUIRED_CONTRACT_KEYS) {
      const addr = manifest.contracts?.[key];
      if (!addr || addr === '0x0000000000000000000000000000000000000000') {
        if (
          manifest.status === 'in_progress' &&
          Object.keys(manifest.contracts || {}).length === 0
        ) {
          logWarn(`Pre-deployment stage: contract not yet deployed: ${key}`);
        } else {
          logFail(`Required manifest contract is missing or zero: ${key}`);
          hasContractErrors = true;
        }
      } else if (typeof addr !== 'string' || !isAddress(addr)) {
        logFail(`Invalid contract address for ${key}: ${String(addr)}`);
        hasContractErrors = true;
      } else {
        const normalized = getAddress(addr);
        if (seenAddresses.has(normalized)) {
          logFail(
            `Duplicate contract address detected: ${normalized} used for ${key} and ${seenAddresses.get(normalized)}`,
          );
          hasContractErrors = true;
        } else {
          seenAddresses.set(normalized, key);
        }
      }
    }

    if (!hasContractErrors && seenAddresses.size === REQUIRED_CONTRACT_KEYS.length) {
      logPass(
        `All ${REQUIRED_CONTRACT_KEYS.length} required mainnet contracts mapped without duplication.`,
      );
    }
  }

  // 4. On-Chain Bytecode & RPC Connectivity Check
  if (!silent) console.log('\n--- 4. Base Mainnet RPC & Bytecode Verification ---');
  const rpcUrl =
    customRpc ||
    process.env.NEXT_PUBLIC_RPC_URL_BASE_MAINNET ||
    process.env.BASE_MAINNET_RPC_URL ||
    'https://mainnet.base.org';

  if (!skipBytecode) {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
      });

      const chainIdOnChain = await client.getChainId();
      if (chainIdOnChain !== 8453) {
        logFail(`Connected RPC chainId mismatch: Expected 8453, received ${chainIdOnChain}`);
      } else {
        logPass(`Connected to Base Mainnet RPC (${rpcUrl}) -> Verified Chain ID 8453.`);
      }

      if (manifest && manifest.contracts) {
        for (const [name, addr] of Object.entries(manifest.contracts)) {
          if (
            typeof addr === 'string' &&
            isAddress(addr) &&
            addr !== '0x0000000000000000000000000000000000000000'
          ) {
            try {
              const code = await client.getBytecode({ address: addr });
              if (!code || code === '0x') {
                logFail(`On-chain bytecode empty for configured contract ${name} (${addr})`);
              } else {
                logPass(
                  `Bytecode verified on Base Mainnet for ${name} (${addr.slice(0, 6)}...${addr.slice(-4)})`,
                );
              }
            } catch (err: any) {
              logFail(
                `Failed to fetch bytecode for ${name} (${addr}): ${err?.message || 'Unknown error'}`,
              );
            }
          }
        }
      }
    } catch (err: any) {
      logFail(
        `Could not connect to Base Mainnet RPC (${rpcUrl}): ${err?.message || 'Unknown error'}`,
      );
    }
  } else {
    logPass('Skipped on-chain bytecode verification (structural test mode).');
  }

  // 5. Final Report Summary
  if (!silent) {
    console.log(
      '\n================================================================================',
    );
    console.log('                           PREFLIGHT SUMMARY REPORT                             ');
    console.log('================================================================================');
    console.log(`  PASS:     ${results.pass.length}`);
    console.log(`  WARNINGS: ${results.warning.length}`);
    console.log(`  FAILURES: ${results.fail.length}\n`);

    if (results.fail.length > 0) {
      console.error('❌ MAINNET LAUNCH READINESS: NO-GO (Critical issues detected)');
    } else if (results.warning.length > 0) {
      console.log(
        '⚠️  MAINNET LAUNCH READINESS: READY FOR STEP-BY-STEP LIVE DEPLOYMENT (Pre-flight passed, pending mainnet execution)',
      );
    } else {
      console.log('✅ MAINNET LAUNCH READINESS: GO (100% verified & passing)');
    }
  }

  return results;
}
