// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../../src/ProtocolDirectory.sol';
import '../../src/strategy/PortfolioManager.sol';
import '../../src/controller/UnifyVaultController.sol';
import '../../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface VmExt {
  function createSelectFork(string calldata urlOrAlias) external returns (uint256);
  function envString(string calldata key) external returns (string memory);
}

contract BaseSepoliaRedeemVerificationTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  address public constant DIRECTORY = 0xD2715141a0F5998B707BaA963990bFC2E94cF145;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant ADMIN = 0x441dbf8076d0b143EC17199baE94Daa884161454;
  address public constant CBBTC = 0xB0B47F113Bcab2b0e49fD5d3Bd2CC0e9Aa408b29;
  address public constant WETH = 0xd116ab1c943cf15904eC4c8dd701086f175FA323;
  address public constant TEST_SWAP_ROUTER = 0x63f3432b1ca616bb8fdF46058e6d855262C195f7;

  ProtocolDirectory public dir;
  PortfolioManager public pm;
  UnifyVaultController public controller;

  function setUp() public {
    string memory rpcUrl = vmExt.envString('BASE_SEPOLIA_RPC_URL');
    vmExt.createSelectFork(rpcUrl);

    dir = ProtocolDirectory(DIRECTORY);
    pm = PortfolioManager(dir.getAddress(ModuleIds.PORTFOLIO_MANAGER));
    controller = UnifyVaultController(dir.getAddress(ModuleIds.DEPOSIT_MANAGER));

    // Provide initial liquidity to router and fund vault via deposit so shares/collateral exist
    deal(CBBTC, TEST_SWAP_ROUTER, 100_000_000);
    deal(WETH, TEST_SWAP_ROUTER, 10 ether);
    deal(USDC, ADMIN, 100 * 1e6);

    vm.startPrank(ADMIN);
    IERC20(USDC).approve(address(controller), 100 * 1e6);
    controller.deposit(USDC, 50 * 1e6, 0, ADMIN);
    vm.stopPrank();
  }

  function test_VerifyLiveBaseSepoliaRedeemQuote1Share() public {
    // Call previewRedeem for 1 share (1e18 wei)
    uint256 previewNetUSDC = controller.previewRedeem(USDC, 1e18);

    console.log('=== Base Sepolia Fork Verification ===');
    console.log('Raw previewRedeem net USDC output:', previewNetUSDC);

    UnifyVaultController.RedeemQuote memory quote = controller.getRedeemQuote(USDC, 1e18, ADMIN);

    // Net USDC payout must equal gross minus 2% redeem fee
    uint256 expectedNet = quote.grossCollateral - ((quote.grossCollateral * 200) / 10000);
    assertEq(previewNetUSDC, expectedNet);
    assertEq(quote.netPayout, expectedNet);
    assertEq(quote.protocolFee, quote.grossCollateral - quote.netPayout);
    assertTrue(quote.grossValueUSD > 0, 'Gross USD value must be positive');
    assertTrue(quote.grossValueUSD < 1000 * 1e18, 'Must be under $1000 USD');
  }

  function test_VerifyLiveBaseSepoliaRedeemQuote10Shares() public {
    uint256 previewNetUSDC10 = controller.previewRedeem(USDC, 10 * 1e18);
    uint256 previewNetUSDC1 = controller.previewRedeem(USDC, 1e18);
    // 10 shares preview should be ~10x 1 share preview (within rounding)
    assertTrue(previewNetUSDC10 >= previewNetUSDC1 * 9, '10 shares payout must scale linearly');
  }
}
