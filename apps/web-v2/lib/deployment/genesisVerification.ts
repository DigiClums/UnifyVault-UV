import type { PublicClient } from 'viem';
import { DEPLOYMENT_ARTIFACTS } from './generatedArtifacts';
import { BASE_SEPOLIA_ASSETS, MODULE_IDS, ACCESS_ROLES } from './freshBaseSepoliaSequence';
import type { GenesisVerificationCheck, DeployedContractsMap } from './types';

export async function runGenesisVerification(
  publicClient: PublicClient,
  deployedContracts: DeployedContractsMap,
  deployerAddress: `0x${string}`,
): Promise<GenesisVerificationCheck[]> {
  const results: GenesisVerificationCheck[] = [];

  const tokenAddr = deployedContracts.UVBEV2;
  const pmAddr = deployedContracts.PortfolioManager;
  const oracleAddr = deployedContracts.OracleManager;
  const vaultAddr = deployedContracts.CustodyVault;
  const treasuryAddr = deployedContracts.Treasury;
  const lmAddr = deployedContracts.LiquidityManager;
  const cbmAddr = deployedContracts.CostBasisManagerV2;
  const controllerAddr = deployedContracts.UnifyVaultController;
  const dirAddr = deployedContracts.ProtocolDirectory;

  // 1. Token Name Check
  if (tokenAddr) {
    try {
      const name = (await publicClient.readContract({
        address: tokenAddr,
        abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi,
        functionName: 'name',
      })) as string;
      results.push({
        id: 'token_name',
        name: 'Token Name Verification',
        contractName: 'UVBEV2',
        targetAddress: tokenAddr,
        passed: name === 'UnifyVault BTC-ETH V2',
        expected: 'UnifyVault BTC-ETH V2',
        actual: name,
      });
    } catch (e: any) {
      results.push({
        id: 'token_name',
        name: 'Token Name Verification',
        contractName: 'UVBEV2',
        targetAddress: tokenAddr,
        passed: false,
        expected: 'UnifyVault BTC-ETH V2',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }

    // 2. Token Symbol Check
    try {
      const symbol = (await publicClient.readContract({
        address: tokenAddr,
        abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi,
        functionName: 'symbol',
      })) as string;
      results.push({
        id: 'token_symbol',
        name: 'Token Symbol Verification',
        contractName: 'UVBEV2',
        targetAddress: tokenAddr,
        passed: symbol === 'UVBE',
        expected: 'UVBE',
        actual: symbol,
      });
    } catch (e: any) {
      results.push({
        id: 'token_symbol',
        name: 'Token Symbol Verification',
        contractName: 'UVBEV2',
        targetAddress: tokenAddr,
        passed: false,
        expected: 'UVBE',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }

    // 3. Token Decimals Check
    try {
      const decimals = (await publicClient.readContract({
        address: tokenAddr,
        abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi,
        functionName: 'decimals',
      })) as number;
      results.push({
        id: 'token_decimals',
        name: 'Token Decimals Verification',
        contractName: 'UVBEV2',
        targetAddress: tokenAddr,
        passed: Number(decimals) === 18,
        expected: '18',
        actual: String(decimals),
      });
    } catch (e: any) {
      results.push({
        id: 'token_decimals',
        name: 'Token Decimals Verification',
        contractName: 'UVBEV2',
        targetAddress: tokenAddr,
        passed: false,
        expected: '18',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }

    // 4. Token Total Supply Genesis Check (Must be 0)
    try {
      const totalSupply = (await publicClient.readContract({
        address: tokenAddr,
        abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi,
        functionName: 'totalSupply',
      })) as bigint;
      results.push({
        id: 'token_total_supply',
        name: 'Genesis Total Supply Check (Zero)',
        contractName: 'UVBEV2',
        targetAddress: tokenAddr,
        passed: totalSupply === 0n,
        expected: '0',
        actual: totalSupply.toString(),
      });
    } catch (e: any) {
      results.push({
        id: 'token_total_supply',
        name: 'Genesis Total Supply Check (Zero)',
        contractName: 'UVBEV2',
        targetAddress: tokenAddr,
        passed: false,
        expected: '0',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }
  }

  // 5. PortfolioManager Genesis Price Check ($1.00 = 1e18)
  if (pmAddr) {
    try {
      const priceRes = (await publicClient.readContract({
        address: pmAddr,
        abi: DEPLOYMENT_ARTIFACTS.PortfolioManager.abi,
        functionName: 'calculateUVPrice',
      })) as [bigint, bigint];
      const genesisPrice = priceRes[1];
      results.push({
        id: 'pm_genesis_price',
        name: 'Genesis Share Price ($1.00)',
        contractName: 'PortfolioManager',
        targetAddress: pmAddr,
        passed: genesisPrice === 1_000_000_000_000_000_000n,
        expected: '1000000000000000000 (1.00 USD)',
        actual: `${genesisPrice.toString()} ($${(Number(genesisPrice) / 1e18).toFixed(2)})`,
      });
    } catch (e: any) {
      results.push({
        id: 'pm_genesis_price',
        name: 'Genesis Share Price ($1.00)',
        contractName: 'PortfolioManager',
        targetAddress: pmAddr,
        passed: false,
        expected: '1000000000000000000 (1.00 USD)',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }
  }

  // 6. Oracle Freshness & Price Check: USDC, CBBTC, WETH
  if (oracleAddr) {
    for (const [symbol, assetAddr] of Object.entries(BASE_SEPOLIA_ASSETS)) {
      try {
        const isFresh = (await publicClient.readContract({
          address: oracleAddr,
          abi: DEPLOYMENT_ARTIFACTS.OracleManager.abi,
          functionName: 'isPriceFresh',
          args: [assetAddr],
        })) as boolean;

        const price = (await publicClient.readContract({
          address: oracleAddr,
          abi: DEPLOYMENT_ARTIFACTS.OracleManager.abi,
          functionName: 'getAssetPrice',
          args: [assetAddr],
        })) as bigint;

        results.push({
          id: `oracle_fresh_${symbol.toLowerCase()}`,
          name: `Oracle Freshness: ${symbol}`,
          contractName: 'OracleManager',
          targetAddress: oracleAddr,
          passed: isFresh && price > 0n,
          expected: 'Fresh (true) & Price > $0',
          actual: `Fresh: ${isFresh}, Price: $${(Number(price) / 1e8).toFixed(2)}`,
        });
      } catch (e: any) {
        results.push({
          id: `oracle_fresh_${symbol.toLowerCase()}`,
          name: `Oracle Freshness: ${symbol}`,
          contractName: 'OracleManager',
          targetAddress: oracleAddr,
          passed: false,
          expected: 'Fresh (true) & Price > $0',
          actual: 'ERROR',
          error: e?.message || String(e),
        });
      }
    }
  }

  // 7. Role Grants Check: Controller Role on Vault, Treasury, LiquidityManager, Token, CostBasisManager
  if (controllerAddr) {
    const roleTargets = [
      { name: 'CustodyVault', addr: vaultAddr, abi: DEPLOYMENT_ARTIFACTS.CustodyVault.abi },
      { name: 'Treasury', addr: treasuryAddr, abi: DEPLOYMENT_ARTIFACTS.Treasury.abi },
      {
        name: 'LiquidityManager',
        addr: lmAddr,
        abi: DEPLOYMENT_ARTIFACTS.LiquidityManager.abi,
      },
      { name: 'UVBEV2', addr: tokenAddr, abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi },
      {
        name: 'CostBasisManagerV2',
        addr: cbmAddr,
        abi: DEPLOYMENT_ARTIFACTS.CostBasisManagerV2.abi,
      },
    ];

    for (const target of roleTargets) {
      if (target.addr) {
        try {
          const hasRole = (await publicClient.readContract({
            address: target.addr,
            abi: target.abi,
            functionName: 'hasRole',
            args: [ACCESS_ROLES.CONTROLLER_ROLE, controllerAddr],
          })) as boolean;

          results.push({
            id: `role_controller_${target.name.toLowerCase()}`,
            name: `CONTROLLER_ROLE on ${target.name}`,
            contractName: target.name,
            targetAddress: target.addr,
            passed: hasRole === true,
            expected: 'Granted (true)',
            actual: hasRole ? 'Granted (true)' : 'Not Granted (false)',
          });
        } catch (e: any) {
          results.push({
            id: `role_controller_${target.name.toLowerCase()}`,
            name: `CONTROLLER_ROLE on ${target.name}`,
            contractName: target.name,
            targetAddress: target.addr,
            passed: false,
            expected: 'Granted (true)',
            actual: 'ERROR',
            error: e?.message || String(e),
          });
        }
      }
    }

    // 8. Security Check: Deployer CONTROLLER_ROLE Revoked on Token
    if (tokenAddr) {
      try {
        const deployerHasTokenRole = (await publicClient.readContract({
          address: tokenAddr,
          abi: DEPLOYMENT_ARTIFACTS.UVBEV2.abi,
          functionName: 'hasRole',
          args: [ACCESS_ROLES.CONTROLLER_ROLE, deployerAddress],
        })) as boolean;

        results.push({
          id: 'deployer_token_role_revoked',
          name: 'Deployer Mint Authority Revoked (Security Gate)',
          contractName: 'UVBEV2',
          targetAddress: tokenAddr,
          passed: deployerHasTokenRole === false,
          expected: 'Revoked (false)',
          actual: deployerHasTokenRole ? 'Retained (DANGER: true)' : 'Revoked (Safe: false)',
        });
      } catch (e: any) {
        results.push({
          id: 'deployer_token_role_revoked',
          name: 'Deployer Mint Authority Revoked (Security Gate)',
          contractName: 'UVBEV2',
          targetAddress: tokenAddr,
          passed: false,
          expected: 'Revoked (false)',
          actual: 'ERROR',
          error: e?.message || String(e),
        });
      }
    }
  }

  // 9. ProtocolDirectory Registration Check
  if (dirAddr && tokenAddr && controllerAddr) {
    try {
      const regToken = (await publicClient.readContract({
        address: dirAddr,
        abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
        functionName: 'getAddress',
        args: [MODULE_IDS.TOKEN],
      })) as string;

      const regController = (await publicClient.readContract({
        address: dirAddr,
        abi: DEPLOYMENT_ARTIFACTS.ProtocolDirectory.abi,
        functionName: 'getAddress',
        args: [MODULE_IDS.DEPOSIT_MANAGER],
      })) as string;

      results.push({
        id: 'directory_token_registered',
        name: 'TOKEN Registered in Directory',
        contractName: 'ProtocolDirectory',
        targetAddress: dirAddr,
        passed: regToken.toLowerCase() === tokenAddr.toLowerCase(),
        expected: tokenAddr,
        actual: regToken,
      });

      results.push({
        id: 'directory_controller_registered',
        name: 'DEPOSIT_MANAGER Registered in Directory',
        contractName: 'ProtocolDirectory',
        targetAddress: dirAddr,
        passed: regController.toLowerCase() === controllerAddr.toLowerCase(),
        expected: controllerAddr,
        actual: regController,
      });
    } catch (e: any) {
      results.push({
        id: 'directory_registry_check',
        name: 'Directory Registry Verification',
        contractName: 'ProtocolDirectory',
        targetAddress: dirAddr,
        passed: false,
        expected: 'Valid registered addresses',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }
  }

  // 10. Marketplace Verification Checks
  const mpAddr = deployedContracts.Marketplace;
  const escrowAddr = deployedContracts.P2PEscrowV2;

  if (mpAddr) {
    // Check 1: Marketplace Bytecode Exists
    try {
      const bytecode = await publicClient.getBytecode({ address: mpAddr });
      const exists = !!bytecode && bytecode !== '0x';
      results.push({
        id: 'marketplace_bytecode_exists',
        name: 'Marketplace Bytecode Deployed',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: exists,
        expected: 'Valid bytecode (length > 2)',
        actual: exists ? `Bytecode present (${bytecode.length} hex chars)` : '0x (No bytecode)',
      });
    } catch (e: any) {
      results.push({
        id: 'marketplace_bytecode_exists',
        name: 'Marketplace Bytecode Deployed',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: false,
        expected: 'Valid bytecode',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }

    // Check 2: p2pEscrow() == fresh P2PEscrowV2
    if (escrowAddr) {
      try {
        const p2pEscrow = (await publicClient.readContract({
          address: mpAddr,
          abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
          functionName: 'p2pEscrow',
        })) as string;
        results.push({
          id: 'marketplace_escrow_wiring',
          name: 'Marketplace P2PEscrow Connection',
          contractName: 'Marketplace',
          targetAddress: mpAddr,
          passed: p2pEscrow.toLowerCase() === escrowAddr.toLowerCase(),
          expected: escrowAddr,
          actual: p2pEscrow,
        });
      } catch (e: any) {
        results.push({
          id: 'marketplace_escrow_wiring',
          name: 'Marketplace P2PEscrow Connection',
          contractName: 'Marketplace',
          targetAddress: mpAddr,
          passed: false,
          expected: escrowAddr,
          actual: 'ERROR',
          error: e?.message || String(e),
        });
      }
    }

    // Check 3: uvbeToken() == fresh UVBEV2
    if (tokenAddr) {
      try {
        const uvbeToken = (await publicClient.readContract({
          address: mpAddr,
          abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
          functionName: 'uvbeToken',
        })) as string;
        results.push({
          id: 'marketplace_uvbe_token_wiring',
          name: 'Marketplace UVBE Token Connection',
          contractName: 'Marketplace',
          targetAddress: mpAddr,
          passed: uvbeToken.toLowerCase() === tokenAddr.toLowerCase(),
          expected: tokenAddr,
          actual: uvbeToken,
        });
      } catch (e: any) {
        results.push({
          id: 'marketplace_uvbe_token_wiring',
          name: 'Marketplace UVBE Token Connection',
          contractName: 'Marketplace',
          targetAddress: mpAddr,
          passed: false,
          expected: tokenAddr,
          actual: 'ERROR',
          error: e?.message || String(e),
        });
      }
    }

    // Check 4: DEFAULT_ADMIN_ROLE == connected deployer
    try {
      const hasAdmin = (await publicClient.readContract({
        address: mpAddr,
        abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
        functionName: 'hasRole',
        args: [ACCESS_ROLES.DEFAULT_ADMIN_ROLE, deployerAddress],
      })) as boolean;
      results.push({
        id: 'marketplace_admin_role',
        name: 'Marketplace DEFAULT_ADMIN_ROLE on Deployer',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: hasAdmin === true,
        expected: 'true',
        actual: String(hasAdmin),
      });
    } catch (e: any) {
      results.push({
        id: 'marketplace_admin_role',
        name: 'Marketplace DEFAULT_ADMIN_ROLE on Deployer',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: false,
        expected: 'true',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }

    // Check 5: GOVERNANCE_ROLE == connected deployer
    try {
      const hasGov = (await publicClient.readContract({
        address: mpAddr,
        abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
        functionName: 'hasRole',
        args: [ACCESS_ROLES.GOVERNANCE_ROLE, deployerAddress],
      })) as boolean;
      results.push({
        id: 'marketplace_governance_role',
        name: 'Marketplace GOVERNANCE_ROLE on Deployer',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: hasGov === true,
        expected: 'true',
        actual: String(hasGov),
      });
    } catch (e: any) {
      results.push({
        id: 'marketplace_governance_role',
        name: 'Marketplace GOVERNANCE_ROLE on Deployer',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: false,
        expected: 'true',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }

    // Check 6: GUARDIAN_ROLE == connected deployer
    try {
      const hasGuardian = (await publicClient.readContract({
        address: mpAddr,
        abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
        functionName: 'hasRole',
        args: [ACCESS_ROLES.GUARDIAN_ROLE, deployerAddress],
      })) as boolean;
      results.push({
        id: 'marketplace_guardian_role',
        name: 'Marketplace GUARDIAN_ROLE on Deployer',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: hasGuardian === true,
        expected: 'true',
        actual: String(hasGuardian),
      });
    } catch (e: any) {
      results.push({
        id: 'marketplace_guardian_role',
        name: 'Marketplace GUARDIAN_ROLE on Deployer',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: false,
        expected: 'true',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }

    // Check 7: defaultPaymentWindow() == 900
    try {
      const window = (await publicClient.readContract({
        address: mpAddr,
        abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
        functionName: 'defaultPaymentWindow',
      })) as bigint;
      results.push({
        id: 'marketplace_payment_window',
        name: 'Marketplace Default Payment Window (900s / 15m)',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: Number(window) === 900,
        expected: '900',
        actual: String(window),
      });
    } catch (e: any) {
      results.push({
        id: 'marketplace_payment_window',
        name: 'Marketplace Default Payment Window (900s / 15m)',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: false,
        expected: '900',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }

    // Check 8: getOrderCount() == 0
    try {
      const orderCount = (await publicClient.readContract({
        address: mpAddr,
        abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
        functionName: 'getOrderCount',
      })) as bigint;
      results.push({
        id: 'marketplace_order_count',
        name: 'Marketplace Initial Order Count (0)',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: Number(orderCount) === 0,
        expected: '0',
        actual: String(orderCount),
      });
    } catch (e: any) {
      results.push({
        id: 'marketplace_order_count',
        name: 'Marketplace Initial Order Count (0)',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: false,
        expected: '0',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }

    // Check 9: paused() == false
    try {
      const paused = (await publicClient.readContract({
        address: mpAddr,
        abi: DEPLOYMENT_ARTIFACTS.Marketplace.abi,
        functionName: 'paused',
      })) as boolean;
      results.push({
        id: 'marketplace_paused_state',
        name: 'Marketplace Paused State (false)',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: paused === false,
        expected: 'false',
        actual: String(paused),
      });
    } catch (e: any) {
      results.push({
        id: 'marketplace_paused_state',
        name: 'Marketplace Paused State (false)',
        contractName: 'Marketplace',
        targetAddress: mpAddr,
        passed: false,
        expected: 'false',
        actual: 'ERROR',
        error: e?.message || String(e),
      });
    }
  }

  return results;
}
