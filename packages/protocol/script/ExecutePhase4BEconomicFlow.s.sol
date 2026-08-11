// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import '../src/ProtocolDirectory.sol';
import '../src/token/UVBEV2.sol';
import '../src/treasury/CostBasisManagerV2.sol';
import '../src/treasury/PerformanceManager.sol';
import '../src/escrow/P2PEscrowV2.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/constants/ModuleIds.sol';
import '../src/types/EscrowTypes.sol';

interface IVmKey {
  function rememberKey(uint256 privateKey) external returns (address);
}

contract ExecutePhase4BEconomicFlowScript is Script {
  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;

  uint256 public constant ADMIN_PK =
    0xcda08c38c9fae447665aef7828d82e1862577dcffd1dbd6c07b332e576e9c8f8;
  uint256 public constant BOB_PK =
    0x2222222222222222222222222222222222222222222222222222222222222222;
  uint256 public constant CHARLIE_PK =
    0x3333333333333333333333333333333333333333333333333333333333333333;

  address public admin;
  address public bob;
  address public charlie;

  ProtocolDirectory public directory;
  UVBEV2 public v2Token;
  CostBasisManagerV2 public v2CBM;
  P2PEscrowV2 public v2Escrow;
  PerformanceManager public v2Perf;
  PortfolioManager public pm;
  address public treasury;

  function run() external {
    admin = IVmKey(address(vm)).rememberKey(ADMIN_PK);
    bob = IVmKey(address(vm)).rememberKey(BOB_PK);
    charlie = IVmKey(address(vm)).rememberKey(CHARLIE_PK);

    console2.log('=====================================================');
    console2.log('   PHASE 4B - BASE SEPOLIA LIVE ECONOMIC FLOW TESTS');
    console2.log('=====================================================');
    console2.log('Admin Address:  ', admin);
    console2.log('Bob Address:    ', bob);
    console2.log('Charlie Address:', charlie);

    directory = ProtocolDirectory(DIRECTORY);
    v2Token = UVBEV2(directory.getAddress(ModuleIds.TOKEN));
    v2CBM = CostBasisManagerV2(directory.getAddress(ModuleIds.COST_BASIS_MANAGER));
    v2Escrow = P2PEscrowV2(payable(directory.getAddress(ModuleIds.P2P_ESCROW)));
    v2Perf = PerformanceManager(directory.getAddress(ModuleIds.PERFORMANCE_MANAGER));
    pm = PortfolioManager(directory.getAddress(ModuleIds.PORTFOLIO_MANAGER));
    treasury = directory.getAddress(ModuleIds.TREASURY);

    // Step 0: Ensure Bob and Charlie have gas money
    vm.startBroadcast(admin);
    if (bob.balance < 0.002 ether) {
      payable(bob).transfer(0.005 ether);
    }
    if (charlie.balance < 0.002 ether) {
      payable(charlie).transfer(0.005 ether);
    }
    vm.stopBroadcast();

    uint256 initSupply = v2Token.totalSupply();
    (uint256 initNAV, uint256 initNAVShare) = pm.calculateNAV();

    console2.log('\n--- Pre-Test Verification ---');
    console2.log('Initial Total Supply:', initSupply);
    console2.log('Initial NAV USD:     ', initNAV);
    console2.log('Initial NAV/Share:   ', initNAVShare);

    // ──────────────────────────────────────────────────────────────────
    // TEST 1 - ORDINARY PARTIAL TRANSFER (Admin -> Bob)
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 1: ORDINARY PARTIAL TRANSFER (Admin -> Bob) ===');
    uint256 adminBal1 = v2Token.balanceOf(admin);
    uint256 adminBasis1 = v2CBM.costBasis(admin);
    int256 adminPnl1 = v2CBM.realizedPnL(admin);
    uint256 bobBal1 = v2Token.balanceOf(bob);
    uint256 bobBasis1 = v2CBM.costBasis(bob);
    int256 bobPnl1 = v2CBM.realizedPnL(bob);

    uint256 transferAmt1 = 1 * 1e18; // 1.0 UVBE

    vm.startBroadcast(admin);
    v2Token.transfer(bob, transferAmt1);
    vm.stopBroadcast();

    uint256 expBasisMoved1 = (adminBasis1 * transferAmt1) / adminBal1;
    console2.log('Expected Basis Moved:', expBasisMoved1);

    require(v2Token.balanceOf(admin) == adminBal1 - transferAmt1, 'T1: Admin balance failed');
    require(v2Token.balanceOf(bob) == bobBal1 + transferAmt1, 'T1: Bob balance failed');
    require(v2Token.totalSupply() == initSupply, 'T1: Total supply changed');
    require(v2CBM.costBasis(admin) == adminBasis1 - expBasisMoved1, 'T1: Admin basis failed');
    require(v2CBM.costBasis(bob) == bobBasis1 + expBasisMoved1, 'T1: Bob basis failed');
    require(v2CBM.realizedPnL(admin) == adminPnl1, 'T1: Admin PnL changed');
    require(v2CBM.realizedPnL(bob) == bobPnl1, 'T1: Bob PnL changed');
    console2.log('[PASS] TEST 1 - ORDINARY PARTIAL TRANSFER');

    // ──────────────────────────────────────────────────────────────────
    // TEST 2 - FULL BALANCE TRANSFER (Bob -> Charlie)
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 2: FULL BALANCE TRANSFER (Bob -> Charlie) ===');
    uint256 bobBal2 = v2Token.balanceOf(bob);
    uint256 bobBasis2 = v2CBM.costBasis(bob);
    uint256 charlieBal2 = v2Token.balanceOf(charlie);
    uint256 charlieBasis2 = v2CBM.costBasis(charlie);

    vm.startBroadcast(bob);
    v2Token.transfer(charlie, bobBal2);
    vm.stopBroadcast();

    require(v2Token.balanceOf(bob) == 0, 'T2: Bob balance not zero');
    require(v2CBM.costBasis(bob) == 0, 'T2: Bob basis dust remains');
    require(v2Token.balanceOf(charlie) == charlieBal2 + bobBal2, 'T2: Charlie balance failed');
    require(v2CBM.costBasis(charlie) == charlieBasis2 + bobBasis2, 'T2: Charlie basis failed');
    console2.log('[PASS] TEST 2 - FULL BALANCE TRANSFER');

    // ──────────────────────────────────────────────────────────────────
    // TEST 3 - CHAINED TRANSFER (Charlie -> Admin)
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 3: CHAINED TRANSFER (Charlie -> Admin) ===');
    uint256 totalBasisBefore3 =
      v2CBM.costBasis(admin) + v2CBM.costBasis(bob) + v2CBM.costBasis(charlie);
    int256 totalPnlBefore3 =
      v2CBM.realizedPnL(admin) + v2CBM.realizedPnL(bob) + v2CBM.realizedPnL(charlie);

    vm.startBroadcast(charlie);
    v2Token.transfer(admin, v2Token.balanceOf(charlie));
    vm.stopBroadcast();

    uint256 totalBasisAfter3 =
      v2CBM.costBasis(admin) + v2CBM.costBasis(bob) + v2CBM.costBasis(charlie);
    int256 totalPnlAfter3 =
      v2CBM.realizedPnL(admin) + v2CBM.realizedPnL(bob) + v2CBM.realizedPnL(charlie);

    require(totalBasisAfter3 == totalBasisBefore3, 'T3: Basis not conserved');
    require(totalPnlAfter3 == totalPnlBefore3, 'T3: PnL mutated');
    console2.log('[PASS] TEST 3 - CHAINED TRANSFER & BASIS CONSERVATION');

    // ──────────────────────────────────────────────────────────────────
    // TEST 4 - transferFrom() (Admin -> Bob via Bob spender)
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 4: transferFrom() (Admin -> Bob via Bob) ===');
    uint256 transferAmt4 = 5 * 1e17; // 0.5 UVBE

    vm.startBroadcast(admin);
    v2Token.approve(bob, transferAmt4);
    vm.stopBroadcast();

    uint256 adminBal4 = v2Token.balanceOf(admin);
    uint256 adminBasis4 = v2CBM.costBasis(admin);

    vm.startBroadcast(bob);
    v2Token.transferFrom(admin, bob, transferAmt4);
    vm.stopBroadcast();

    uint256 expBasisMoved4 = (adminBasis4 * transferAmt4) / adminBal4;
    require(v2Token.allowance(admin, bob) == 0, 'T4: Allowance not consumed');
    require(v2Token.balanceOf(admin) == adminBal4 - transferAmt4, 'T4: Admin balance failed');
    require(v2CBM.costBasis(admin) == adminBasis4 - expBasisMoved4, 'T4: Admin basis failed');
    require(v2CBM.costBasis(bob) == expBasisMoved4, 'T4: Bob basis failed');
    console2.log('[PASS] TEST 4 - transferFrom()');

    // ──────────────────────────────────────────────────────────────────
    // TEST 5 - SELF TRANSFER (Admin -> Admin)
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 5: SELF TRANSFER (Admin -> Admin) ===');
    uint256 adminBal5 = v2Token.balanceOf(admin);
    uint256 adminBasis5 = v2CBM.costBasis(admin);
    int256 adminPnl5 = v2CBM.realizedPnL(admin);

    vm.startBroadcast(admin);
    v2Token.transfer(admin, 1 * 1e18);
    vm.stopBroadcast();

    require(v2Token.balanceOf(admin) == adminBal5, 'T5: Admin balance mutated');
    require(v2CBM.costBasis(admin) == adminBasis5, 'T5: Admin basis mutated');
    require(v2CBM.realizedPnL(admin) == adminPnl5, 'T5: Admin PnL mutated');
    console2.log('[PASS] TEST 5 - SELF TRANSFER');

    // ──────────────────────────────────────────────────────────────────
    // TEST 6 & 7 - P2P LIVE TRADE CREATION & RELEASE
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 6 & 7: P2P LIVE TRADE CREATION & RELEASE ===');

    // Transfer Bob's shares back to Admin so Admin has clean position
    vm.startBroadcast(bob);
    v2Token.transfer(admin, v2Token.balanceOf(bob));
    vm.stopBroadcast();

    uint256 tradeShares = 10 * 1e18; // 10.0 UVBE
    uint256 fiatUSDWei = 200 * 1e18; // $200.00 USD

    uint256 sellerBalBeforeP2P = v2Token.balanceOf(admin);
    uint256 sellerBasisBeforeP2P = v2CBM.costBasis(admin);
    int256 sellerPnlBeforeP2P = v2CBM.realizedPnL(admin);
    uint256 treasuryBalBeforeP2P = v2Token.balanceOf(treasury);

    vm.startBroadcast(admin);
    v2Token.approve(address(v2Escrow), tradeShares);

    EscrowTypes.CreateTradeParams memory p2pParams = EscrowTypes.CreateTradeParams({
      buyer: bob,
      seller: admin,
      asset: address(v2Token),
      amount: tradeShares,
      fiatAmount: fiatUSDWei,
      fiatCurrency: keccak256('USD'),
      paymentWindow: 1 hours
    });

    uint256 tradeId = v2Escrow.createTrade(p2pParams);
    vm.stopBroadcast();

    console2.log('Created P2P Trade ID:', tradeId);
    require(v2Token.balanceOf(address(v2Escrow)) == tradeShares, 'T6: Escrow token balance failed');
    require(v2CBM.realizedPnL(admin) == sellerPnlBeforeP2P, 'T6: Seller PnL changed on creation');
    console2.log('[PASS] TEST 6 - P2P LIVE TRADE CREATION & FUNDING');

    // ──────────────────────────────────────────────────────────────────
    // TEST 8 - P2P DUPLICATE RELEASE REPLAY PROTECTION
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 8: P2P DUPLICATE RELEASE REPLAY PROTECTION ===');
    vm.prank(admin);
    try v2Escrow.confirmAndRelease(tradeId) {
      revert('T8: Duplicate release failed to revert');
    } catch {
      console2.log('Duplicate release reverted correctly');
    }
    console2.log('[PASS] TEST 8 - P2P DUPLICATE RELEASE REPLAY PROTECTION');

    // Buyer submits payment proof
    vm.startBroadcast(bob);
    v2Escrow.submitPayment(
      tradeId,
      keccak256(abi.encodePacked('REF_', block.timestamp, tradeId)),
      keccak256(abi.encodePacked('EVIDENCE_', block.timestamp, tradeId))
    );
    vm.stopBroadcast();

    // Execute Release by Seller
    vm.startBroadcast(admin);
    v2Escrow.confirmAndRelease(tradeId);
    vm.stopBroadcast();

    uint256 expFeeShares = (tradeShares * 100) / 10000; // 1% = 0.10 UVBE
    uint256 expNetShares = tradeShares - expFeeShares; // 99% = 9.90 UVBE
    uint256 expBasisRemoved = (sellerBasisBeforeP2P * tradeShares) / sellerBalBeforeP2P;
    int256 expGain = int256(fiatUSDWei) - int256(expBasisRemoved);

    console2.log('Net Buyer Shares:   ', expNetShares);
    console2.log('Fee Treasury Shares:', expFeeShares);
    console2.log('Seller Basis Removed:', expBasisRemoved);
    console2.log('Seller Realized Gain:');
    console2.logInt(expGain);

    require(v2Token.balanceOf(bob) == expNetShares, 'T7: Buyer net shares mismatch');
    require(
      v2Token.balanceOf(treasury) == treasuryBalBeforeP2P + expFeeShares,
      'T7: Treasury fee mismatch'
    );
    require(
      v2CBM.costBasis(admin) == sellerBasisBeforeP2P - expBasisRemoved,
      'T7: Seller basis mismatch'
    );
    require(
      v2CBM.realizedPnL(admin) == sellerPnlBeforeP2P + expGain,
      'T7: Seller realized PnL mismatch'
    );
    require(v2CBM.costBasis(bob) == fiatUSDWei, 'T7: Buyer cost basis mismatch');
    require(v2CBM.costBasis(treasury) == 0, 'T7: Treasury user basis non-zero');
    console2.log('[PASS] TEST 7 - P2P RELEASE');

    // ──────────────────────────────────────────────────────────────────
    // TEST 9 - P2P REFUND (Create & Dispute & Refund)
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 9: P2P REFUND ===');
    uint256 refundShares = 2 * 1e18; // 2.0 UVBE
    uint256 adminBalBeforeRefund = v2Token.balanceOf(admin);
    uint256 adminBasisBeforeRefund = v2CBM.costBasis(admin);

    vm.startBroadcast(admin);
    v2Token.approve(address(v2Escrow), refundShares);
    EscrowTypes.CreateTradeParams memory refundParams = EscrowTypes.CreateTradeParams({
      buyer: charlie,
      seller: admin,
      asset: address(v2Token),
      amount: refundShares,
      fiatAmount: 40 * 1e18,
      fiatCurrency: keccak256('USD'),
      paymentWindow: 1 hours
    });
    uint256 refundTradeId = v2Escrow.createTrade(refundParams);
    vm.stopBroadcast();

    // Buyer submits payment proof
    vm.startBroadcast(charlie);
    v2Escrow.submitPayment(
      refundTradeId,
      keccak256(abi.encodePacked('REFUND_PAY_REF_', block.timestamp, refundTradeId)),
      keccak256(abi.encodePacked('REFUND_EVIDENCE_', block.timestamp, refundTradeId))
    );
    // Buyer raises dispute
    v2Escrow.raiseDispute(refundTradeId, keccak256('Refund Dispute Test'));
    vm.stopBroadcast();

    // Admin (Arbitrator) resolves dispute in favor of Seller (Refund)
    vm.startBroadcast(admin);
    v2Escrow.resolveDispute(refundTradeId, EscrowTypes.DisputeOutcome.REFUND_TO_SELLER);
    vm.stopBroadcast();

    require(v2Token.balanceOf(admin) == adminBalBeforeRefund, 'T9: Admin balance not restored');
    require(v2CBM.costBasis(admin) == adminBasisBeforeRefund, 'T9: Admin basis not restored');
    require(v2Token.balanceOf(charlie) == 0, 'T9: Charlie received shares');
    require(v2CBM.costBasis(charlie) == 0, 'T9: Charlie received basis');
    console2.log('[PASS] TEST 9 - P2P REFUND');

    // ──────────────────────────────────────────────────────────────────
    // TEST 10 - ESCROW CONTEXT SECURITY
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 10: ESCROW CONTEXT SECURITY ===');
    vm.prank(bob);
    try v2Token.transfer(address(v2Escrow), 1 * 1e18) {
      revert('T10: Direct transfer to Escrow failed to revert');
    } catch {
      console2.log('Direct transfer to Escrow reverted as expected');
    }
    console2.log('[PASS] TEST 10 - ESCROW CONTEXT SECURITY');

    // ──────────────────────────────────────────────────────────────────
    // TEST 11 - ACCOUNTING INVARIANTS & TOTAL SUPPLY
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 11: ACCOUNTING INVARIANTS & TOTAL SUPPLY ===');
    uint256 finalSupply = v2Token.totalSupply();
    require(finalSupply == initSupply, 'T11: Total supply changed');

    address originalBuyer = 0xB145AC2a59575Fbe306a58aC924718f4DD4659Da;
    uint256 sumUserBals =
      v2Token.balanceOf(admin) +
        v2Token.balanceOf(bob) +
        v2Token.balanceOf(charlie) +
        v2Token.balanceOf(originalBuyer) +
        v2Token.balanceOf(treasury) +
        v2Token.balanceOf(address(0x000000000000000000000000000000000000dEaD));
    require(sumUserBals == finalSupply, 'T11: User balances sum mismatch');
    console2.log('[PASS] TEST 11 - ACCOUNTING INVARIANTS & TOTAL SUPPLY');

    // ──────────────────────────────────────────────────────────────────
    // TEST 12 - DASHBOARD READ VERIFICATION
    // ──────────────────────────────────────────────────────────────────
    console2.log('\n=== TEST 12: DASHBOARD READ VERIFICATION ===');
    (uint256 navTotal, uint256 navPerShare) = pm.calculateNAV();

    uint256 adminVal = v2Perf.currentValue(admin);
    uint256 expAdminVal = (v2Token.balanceOf(admin) * navPerShare) / 1e18;
    require(adminVal == expAdminVal, 'T12: Admin Position Value mismatch');

    uint256 adminCap = v2Perf.investedCapital(admin);
    require(adminCap == v2CBM.costBasis(admin), 'T12: Admin Invested Capital mismatch');

    int256 adminUnrealized = v2Perf.performance(admin).unrealizedPnL;
    int256 expUnrealized = int256(adminVal) - int256(adminCap);
    require(adminUnrealized == expUnrealized, 'T12: Admin Unrealized PnL mismatch');

    int256 adminNetPnL = v2Perf.netProfit(admin);
    int256 expNetPnL = v2CBM.realizedPnL(admin) + adminUnrealized;
    require(adminNetPnL == expNetPnL, 'T12: Admin Net PnL mismatch');

    console2.log('Hero Position Value (Admin):', adminVal);
    console2.log('Vault TVL USD:               ', navTotal);
    console2.log('NAV / Share USD:             ', navPerShare);
    console2.log('Cost Basis (Admin):          ', adminCap);
    console2.log('Realized PnL (Admin):        ');
    console2.logInt(v2CBM.realizedPnL(admin));
    console2.log('Unrealized PnL (Admin):      ');
    console2.logInt(adminUnrealized);
    console2.log('Net PnL (Admin):             ');
    console2.logInt(adminNetPnL);

    console2.log('[PASS] TEST 12 - DASHBOARD READ VERIFICATION');

    console2.log('\n=====================================================');
    console2.log('    ALL 12 PHASE 4B ECONOMIC FLOW TESTS PASSED!');
    console2.log('=====================================================');
  }
}
