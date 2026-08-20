// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import { ProtocolDirectory } from '../../src/ProtocolDirectory.sol';
import { UVBEV2 } from '../../src/token/UVBEV2.sol';
import { UnifyVaultController } from '../../src/controller/UnifyVaultController.sol';
import { CustodyVault } from '../../src/vault/CustodyVault.sol';
import { Treasury } from '../../src/vault/Treasury.sol';
import { CostBasisManagerV2 } from '../../src/treasury/CostBasisManagerV2.sol';
import { PortfolioManager } from '../../src/strategy/PortfolioManager.sol';
import { P2PEscrowV2 } from '../../src/escrow/P2PEscrowV2.sol';
import { P2PReputation } from '../../src/reputation/P2PReputation.sol';
import { EscrowTypes } from '../../src/types/EscrowTypes.sol';
import { ReputationTypes } from '../../src/types/ReputationTypes.sol';
import { ModuleIds } from '../../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envString(string calldata key) external returns (string memory);
}

/**
 * @title P2PReputationLiveForkTest
 * @notice Live Base Sepolia fork test validating P2PReputation against canonical deployed P2PEscrowV2.
 * Strictly verifies zero accounting mutation and 100% protocol isolation.
 */
contract P2PReputationLiveForkTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  // Canonical Base Sepolia V2 Deployment Directory
  address public constant DIRECTORY_ADDR = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;

  // Actors
  address public seller = address(0x1111111111111111111111111111111111111111);
  address public buyer = address(0x2222222222222222222222222222222222222222);

  // Contracts
  ProtocolDirectory public directory;
  P2PEscrowV2 public p2pEscrow;
  P2PReputation public reputation;
  UVBEV2 public tokenV2;
  PortfolioManager public portfolioManager;
  CustodyVault public vault;
  Treasury public treasury;
  CostBasisManagerV2 public cbmV2;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    directory = ProtocolDirectory(DIRECTORY_ADDR);
    p2pEscrow = P2PEscrowV2(payable(directory.getAddress(ModuleIds.P2P_ESCROW)));
    reputation = new P2PReputation(address(p2pEscrow));
    tokenV2 = UVBEV2(directory.getAddress(ModuleIds.TOKEN));
    portfolioManager = PortfolioManager(directory.getAddress(ModuleIds.PORTFOLIO_MANAGER));
    vault = CustodyVault(payable(directory.getAddress(ModuleIds.VAULT)));
    treasury = Treasury(payable(directory.getAddress(ModuleIds.TREASURY)));
    cbmV2 = CostBasisManagerV2(directory.getAddress(ModuleIds.COST_BASIS_MANAGER));

    // Deal seller 50 UVBE tokens on fork
    deal(address(tokenV2), seller, 50 * 1e18);

    vm.prank(seller);
    tokenV2.approve(address(p2pEscrow), type(uint256).max);

    vm.prank(buyer);
    tokenV2.approve(address(p2pEscrow), type(uint256).max);
  }

  function test_Fork_LiveEscrowTrade_RatingLifecycleAndAccountingIsolation() public {
    // 1. Snapshot Protocol Metrics Before Reputation Cycle
    (uint256 navBefore, uint256 sharePriceBefore) = portfolioManager.calculateUVPrice();
    uint256 supplyBefore = tokenV2.totalSupply();

    // 2. Execute Real P2P Escrow Trade on Fork
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: address(tokenV2),
      amount: 10 * 1e18,
      fiatAmount: 1000 * 1e2, // 1000 INR
      fiatCurrency: keccak256('INR'),
      paymentWindow: 15 minutes
    });

    vm.prank(seller);
    uint256 tradeId = p2pEscrow.createTrade(params);

    vm.prank(buyer);
    p2pEscrow.submitPayment(tradeId, keccak256('FORK_UTR_1'), keccak256('FORK_EVID_1'));

    vm.prank(seller);
    p2pEscrow.confirmAndRelease(tradeId);

    // 3. Verify Escrow State Is RELEASED
    EscrowTypes.Trade memory t = p2pEscrow.getTrade(tradeId);
    assertEq(uint8(t.state), uint8(EscrowTypes.TradeState.RELEASED));

    // 4. Submit Ratings via P2PReputation
    vm.prank(buyer);
    reputation.submitRating(
      tradeId,
      ReputationTypes.RatingValue.FIVE_STAR,
      keccak256('Fast payment receipt confirmed')
    );

    vm.prank(seller);
    reputation.submitRating(
      tradeId,
      ReputationTypes.RatingValue.FIVE_STAR,
      keccak256('Smooth buyer')
    );

    // 5. Verify Seller & Buyer Reputation Stats
    ReputationTypes.UserReputationProfile memory sellerProfile = reputation.getProfile(seller);
    assertEq(sellerProfile.sellerStats.ratingsCount, 1);
    assertEq(sellerProfile.sellerStats.scoreSum, 5);

    uint16 sellerTrustScore = reputation.getSellerTrustScore(seller);
    assertGt(sellerTrustScore, 5000); // Greater than baseline 50.00%

    // 6. Invariant Check: Zero Protocol Economic Impact
    (uint256 navAfter, uint256 sharePriceAfter) = portfolioManager.calculateUVPrice();
    uint256 supplyAfter = tokenV2.totalSupply();

    assertEq(navAfter, navBefore, 'NAV must remain unchanged');
    assertEq(sharePriceAfter, sharePriceBefore, 'Share price must remain unchanged');
    assertEq(supplyAfter, supplyBefore, 'Total supply must remain unchanged');

    console.log('[PASS] P2PReputation Live Fork Test verified against canonical deployment');
  }
}
