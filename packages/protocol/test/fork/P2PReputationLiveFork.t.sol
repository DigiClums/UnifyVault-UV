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

  // Canonical Base Sepolia V2 Deployment Addresses
  address public constant DIRECTORY_ADDR = 0x8040006d6907a84911aaC0a9aC08278311B156e2;
  address public constant TREASURY_ADDR = 0xB8c8113a042f39936dD966A5983fAaE2bF7b7290;
  address public constant VAULT_ADDR = 0x5534469dA659dC4bB092Df9F7421Ec08fD2588A0;
  address public constant TOKEN_V2_ADDR = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant CONTROLLER_ADDR = 0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec;
  address public constant PORTFOLIO_MGR_ADDR = 0xd34A8d9cE90ebc2987c40ceafE126E5EF2931D9b;
  address public constant CBM_V2_ADDR = 0x57869372AFbd7b61752f2f8d3e7F37701e28517B;
  address public constant P2P_ESCROW_ADDR = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;
  address public constant REPUTATION_ADDR = 0x49460e2fF8c20ba96121C18e7D36Fd4aE293C70c;

  // Actors
  address public seller = address(0x1111111111111111111111111111111111111111);
  address public buyer = address(0x2222222222222222222222222222222222222222);

  // Contracts
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

    p2pEscrow = P2PEscrowV2(payable(P2P_ESCROW_ADDR));
    reputation = P2PReputation(REPUTATION_ADDR);
    tokenV2 = UVBEV2(TOKEN_V2_ADDR);
    portfolioManager = PortfolioManager(PORTFOLIO_MGR_ADDR);
    vault = CustodyVault(payable(VAULT_ADDR));
    treasury = Treasury(payable(TREASURY_ADDR));
    cbmV2 = CostBasisManagerV2(CBM_V2_ADDR);

    // Deal seller 50 UVBE tokens on fork
    deal(TOKEN_V2_ADDR, seller, 50 * 1e18);

    vm.prank(seller);
    tokenV2.approve(P2P_ESCROW_ADDR, type(uint256).max);

    vm.prank(buyer);
    tokenV2.approve(P2P_ESCROW_ADDR, type(uint256).max);
  }

  function test_Fork_LiveEscrowTrade_RatingLifecycleAndAccountingIsolation() public {
    // 1. Snapshot Protocol Metrics Before Reputation Cycle
    (uint256 navBefore, uint256 sharePriceBefore) = portfolioManager.calculateUVPrice();
    uint256 supplyBefore = tokenV2.totalSupply();

    // 2. Execute Real P2P Escrow Trade on Fork
    EscrowTypes.CreateTradeParams memory params = EscrowTypes.CreateTradeParams({
      buyer: buyer,
      seller: seller,
      asset: TOKEN_V2_ADDR,
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
      keccak256('EXCELLENT_SELLER')
    );

    vm.prank(seller);
    reputation.submitRating(
      tradeId,
      ReputationTypes.RatingValue.FIVE_STAR,
      keccak256('EXCELLENT_BUYER')
    );

    // 5. Verify Reputation Metrics
    assertEq(reputation.getSellerTrustScore(seller), 6666);
    assertEq(reputation.getBuyerTrustScore(buyer), 6666);
    assertEq(
      uint8(reputation.getSellerTrustTier(seller)),
      uint8(ReputationTypes.TrustTier.PROBATIONARY)
    );
    assertEq(
      uint8(reputation.getBuyerTrustTier(buyer)),
      uint8(ReputationTypes.TrustTier.PROBATIONARY)
    );

    // 6. STRICT INVARIANT: Prove 100% Zero Accounting Contamination
    (uint256 navAfter, uint256 sharePriceAfter) = portfolioManager.calculateUVPrice();
    assertEq(navAfter, navBefore, 'Vault NAV must be 100% untouched by P2PReputation');
    assertEq(
      sharePriceAfter,
      sharePriceBefore,
      'UV share price must be 100% untouched by P2PReputation'
    );
    assertEq(
      tokenV2.totalSupply(),
      supplyBefore,
      'Token supply must be 100% untouched by P2PReputation'
    );
    assertEq(address(reputation).balance, 0, 'P2PReputation ETH balance must strictly be zero');
    assertEq(
      tokenV2.balanceOf(address(reputation)),
      0,
      'P2PReputation token balance must strictly be zero'
    );
  }
}
