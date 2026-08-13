// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { Script, console } from 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import '../src/ProtocolDirectory.sol';
import '../src/token/UVBEV2.sol';
import '../src/treasury/CostBasisManagerV2.sol';
import '../src/treasury/PerformanceManager.sol';
import '../src/escrow/P2PEscrowV2.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/vault/CustodyVault.sol';
import '../src/constants/ModuleIds.sol';
import '../src/types/EscrowTypes.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IVmKey {
  function rememberKey(uint256 privateKey) external returns (address);
}

contract ExecuteFreshLiveVerificationFlowScript is Script {
  address public constant DIRECTORY = 0x8040006d6907a84911aaC0a9aC08278311B156e2;

  uint256 public constant ADMIN_PK =
    0xcda08c38c9fae447665aef7828d82e1862577dcffd1dbd6c07b332e576e9c8f8;
  uint256 public constant BOB_PK =
    0x2222222222222222222222222222222222222222222222222222222222222222;

  address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  address public admin;
  address public bob;

  ProtocolDirectory public directory;
  UVBEV2 public token;
  CostBasisManagerV2 public cbm;
  P2PEscrowV2 public escrow;
  PerformanceManager public perf;
  PortfolioManager public pm;
  UnifyVaultController public controller;
  CustodyVault public vault;

  function run() external {
    admin = IVmKey(address(vm)).rememberKey(ADMIN_PK);
    bob = IVmKey(address(vm)).rememberKey(BOB_PK);

    console2.log('=====================================================');
    console2.log('  FRESH BASE SEPOLIA LIVE PROTOCOL VERIFICATION FLOW');
    console2.log('=====================================================');
    console2.log('Admin: ', admin);
    console2.log('Bob:   ', bob);

    directory = ProtocolDirectory(DIRECTORY);
    token = UVBEV2(directory.getAddress(ModuleIds.TOKEN));
    cbm = CostBasisManagerV2(directory.getAddress(ModuleIds.COST_BASIS_MANAGER));
    escrow = P2PEscrowV2(payable(directory.getAddress(ModuleIds.P2P_ESCROW)));
    perf = PerformanceManager(directory.getAddress(ModuleIds.PERFORMANCE_MANAGER));
    pm = PortfolioManager(directory.getAddress(ModuleIds.PORTFOLIO_MANAGER));
    controller = UnifyVaultController(payable(directory.getAddress(ModuleIds.DEPOSIT_MANAGER)));
    vault = CustodyVault(directory.getAddress(ModuleIds.VAULT));

    // ─────────────────────────────────────────────────────────────
    // PHASE 8: UV PRICE ENGINE GENESIS CHECK
    // ─────────────────────────────────────────────────────────────
    console2.log('\n=== PHASE 8: GENESIS STATE CHECK ===');
    uint256 initialSupply = token.totalSupply();
    console2.log('Total Supply Before Genesis: ', initialSupply);
    require(initialSupply == 0, 'PHASE 8: initial supply not zero');

    (uint256 genesisNAV, uint256 genesisPrice) = pm.calculateUVPrice();
    console2.log('Genesis NAV USD:             ', genesisNAV);
    console2.log('Genesis UV Price USD:        ', genesisPrice);
    require(genesisPrice == 1e18, 'PHASE 8: genesis price not $1.00');

    // ─────────────────────────────────────────────────────────────
    // PHASE 8 & 9: LIVE TESTNET GENESIS MINT (5.00 USDC)
    // ─────────────────────────────────────────────────────────────
    console2.log('\n=== PHASE 8 & 9: LIVE TESTNET GENESIS DEPOSIT ===');
    uint256 depositAmt = 5 * 1e6; // 5.00 USDC

    vm.startBroadcast(admin);
    IERC20(USDC).approve(address(controller), depositAmt);
    controller.deposit(USDC, depositAmt, 0, admin);
    vm.stopBroadcast();

    uint256 deadBal = token.balanceOf(DEAD);
    uint256 adminBalAfterGenesis = token.balanceOf(admin);
    uint256 supplyAfterGenesis = token.totalSupply();

    console2.log('DEAD Shares Minted:          ', deadBal);
    console2.log('Admin UVBE Shares Minted:    ', adminBalAfterGenesis);
    console2.log('Total Supply After Genesis:  ', supplyAfterGenesis);

    require(deadBal == 1000, 'PHASE 8: DEAD shares not exactly 1000 wei');
    require(supplyAfterGenesis == adminBalAfterGenesis + 1000, 'PHASE 8: supply != user + dead');

    (uint256 postGenesisNAV, uint256 postGenesisPrice) = pm.calculateUVPrice();
    console2.log('Post-Genesis Vault Backing:  ', postGenesisNAV);
    console2.log('Post-Genesis UV Price:       ', postGenesisPrice);
    require(postGenesisPrice > 0, 'PHASE 8: post-genesis price is zero');

    uint256 adminCostBasis = cbm.costBasis(admin);
    console2.log('Admin Recorded Cost Basis:   ', adminCostBasis);
    require(adminCostBasis > 0, 'PHASE 9: cost basis not recorded');

    // ─────────────────────────────────────────────────────────────
    // PHASE 10: TRANSFER TEST (Deployer -> Bob)
    // ─────────────────────────────────────────────────────────────
    console2.log('\n=== PHASE 10: TRANSFER TEST ===');
    uint256 transferShares = 500000000000000000; // 0.5 UVBE
    uint256 adminSharesBefore = token.balanceOf(admin);
    uint256 bobSharesBefore = token.balanceOf(bob);
    uint256 adminBasisBefore = cbm.costBasis(admin);
    uint256 bobBasisBefore = cbm.costBasis(bob);

    (, uint256 priceBeforeTransfer) = pm.calculateUVPrice();

    vm.startBroadcast(admin);
    token.transfer(bob, transferShares);
    vm.stopBroadcast();

    uint256 adminSharesAfter = token.balanceOf(admin);
    uint256 bobSharesAfter = token.balanceOf(bob);
    uint256 adminBasisAfter = cbm.costBasis(admin);
    uint256 bobBasisAfter = cbm.costBasis(bob);

    (, uint256 priceAfterTransfer) = pm.calculateUVPrice();

    console2.log('Admin Shares: ', adminSharesBefore, '->', adminSharesAfter);
    console2.log('Bob Shares:   ', bobSharesBefore, '->', bobSharesAfter);
    console2.log('Admin Basis:  ', adminBasisBefore, '->', adminBasisAfter);
    console2.log('Bob Basis:    ', bobBasisBefore, '->', bobBasisAfter);
    console2.log('UV Price Before Transfer: ', priceBeforeTransfer);
    console2.log('UV Price After Transfer:  ', priceAfterTransfer);

    require(
      adminSharesAfter == adminSharesBefore - transferShares,
      'PHASE 10: admin shares mismatch'
    );
    require(bobSharesAfter == bobSharesBefore + transferShares, 'PHASE 10: bob shares mismatch');
    require(adminBasisAfter < adminBasisBefore, 'PHASE 10: admin basis did not decrease');
    require(bobBasisAfter > bobBasisBefore, 'PHASE 10: bob basis did not increase');
    require(priceAfterTransfer == priceBeforeTransfer, 'PHASE 10: price changed on transfer');

    // ─────────────────────────────────────────────────────────────
    // PHASE 11: P2P ESCROW TEST (Bob locks in escrow)
    // ─────────────────────────────────────────────────────────────
    console2.log('\n=== PHASE 11: P2P ESCROW ISOLATION TEST ===');
    uint256 escrowTradeShares = 100000000000000000; // 0.1 UVBE
    uint256 bobBasisBeforeEscrow = cbm.costBasis(bob);
    uint256 supplyBeforeEscrow = token.totalSupply();
    (uint256 navBeforeEscrow, uint256 priceBeforeEscrow) = pm.calculateUVPrice();

    // Send Bob 0.005 ETH for gas
    vm.startBroadcast(admin);
    payable(bob).transfer(0.005 ether);
    vm.stopBroadcast();

    vm.startBroadcast(bob);
    token.approve(address(escrow), escrowTradeShares);
    EscrowTypes.CreateTradeParams memory tradeParams = EscrowTypes.CreateTradeParams({
      buyer: admin,
      seller: bob,
      asset: address(token),
      amount: escrowTradeShares,
      fiatAmount: 1000,
      fiatCurrency: 'INR',
      paymentWindow: 1 hours
    });
    uint256 tradeId = escrow.createTrade(tradeParams);
    vm.stopBroadcast();

    uint256 bobBasisDuringEscrow = cbm.costBasis(bob);
    uint256 supplyDuringEscrow = token.totalSupply();
    (uint256 navDuringEscrow, uint256 priceDuringEscrow) = pm.calculateUVPrice();

    console2.log('Trade ID Created in Escrow: ', tradeId);
    console2.log('Bob Basis During Escrow:    ', bobBasisDuringEscrow);
    console2.log('Total Supply During Escrow: ', supplyDuringEscrow);
    console2.log('UV Price During Escrow:     ', priceDuringEscrow);

    require(
      bobBasisDuringEscrow == bobBasisBeforeEscrow,
      'PHASE 11: basis mutated during escrow lock'
    );
    require(
      supplyDuringEscrow == supplyBeforeEscrow,
      'PHASE 11: supply changed during escrow lock'
    );
    require(navDuringEscrow == navBeforeEscrow, 'PHASE 11: NAV changed during escrow lock');
    require(priceDuringEscrow == priceBeforeEscrow, 'PHASE 11: price changed during escrow lock');

    // ─────────────────────────────────────────────────────────────
    // PHASE 12: BURN / REDEEM TEST (Admin redeems 0.25 UVBE)
    // ─────────────────────────────────────────────────────────────
    console2.log('\n=== PHASE 12: BURN / REDEEM TEST ===');
    uint256 redeemShares = 250000000000000000; // 0.25 UVBE
    uint256 adminSharesPreRedeem = token.balanceOf(admin);
    uint256 supplyPreRedeem = token.totalSupply();
    uint256 adminBasisPreRedeem = cbm.costBasis(admin);
    uint256 usdcBalPreRedeem = IERC20(USDC).balanceOf(admin);

    vm.startBroadcast(admin);
    token.approve(address(controller), redeemShares);
    controller.redeem(USDC, redeemShares, 0, admin, block.timestamp + 1 hours);
    vm.stopBroadcast();

    uint256 adminSharesPostRedeem = token.balanceOf(admin);
    uint256 supplyPostRedeem = token.totalSupply();
    uint256 adminBasisPostRedeem = cbm.costBasis(admin);
    uint256 usdcBalPostRedeem = IERC20(USDC).balanceOf(admin);

    (uint256 postRedeemNAV, uint256 postRedeemPrice) = pm.calculateUVPrice();

    console2.log('Admin Shares Post-Redeem:   ', adminSharesPostRedeem);
    console2.log('Supply Post-Redeem:         ', supplyPostRedeem);
    console2.log('Admin Basis Post-Redeem:    ', adminBasisPostRedeem);
    console2.log('USDC Received:              ', usdcBalPostRedeem - usdcBalPreRedeem);
    console2.log('Post-Redeem Vault Backing:  ', postRedeemNAV);
    console2.log('Post-Redeem UV Price:       ', postRedeemPrice);

    require(
      adminSharesPostRedeem == adminSharesPreRedeem - redeemShares,
      'PHASE 12: shares not burned'
    );
    require(supplyPostRedeem == supplyPreRedeem - redeemShares, 'PHASE 12: supply not reduced');
    require(adminBasisPostRedeem < adminBasisPreRedeem, 'PHASE 12: basis not reduced');
    require(usdcBalPostRedeem > usdcBalPreRedeem, 'PHASE 12: no USDC payout received');
    require(postRedeemPrice > 0, 'PHASE 12: post-redeem price is zero');

    console2.log('\n=====================================================');
    console2.log('   ALL ECONOMIC FLOWS VERIFIED SUCCESSFULLY (8-12)!');
    console2.log('=====================================================');
  }
}
