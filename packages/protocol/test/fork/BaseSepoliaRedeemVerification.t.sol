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
}

contract BaseSepoliaRedeemVerificationTest is Test {
  VmExt internal constant vmExt = VmExt(address(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D));

  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;
  address public constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant ADMIN = 0xd905920c91853039060246Ed5724AA72B91a96DA;

  ProtocolDirectory public dir;
  PortfolioManager public newPM;
  UnifyVaultController public newController;

  function setUp() public {
    string memory rpcUrl = 'https://base-sepolia.g.alchemy.com/v2/MkIl1aCbfeHNPO7ZBU7S8';
    vmExt.createSelectFork(rpcUrl);

    dir = ProtocolDirectory(DIRECTORY);

    address strategyManager = dir.getAddress(ModuleIds.STRATEGY_MANAGER);
    address oracleManager = dir.getAddress(ModuleIds.ORACLE);
    address custodyVault = dir.getAddress(ModuleIds.VAULT);
    address treasury = dir.getAddress(ModuleIds.TREASURY);
    address indexToken = dir.getAddress(ModuleIds.TOKEN);

    // Deploy updated PortfolioManager & UnifyVaultController on live fork
    vm.startPrank(ADMIN);

    newPM = new PortfolioManager(
      ADMIN,
      DIRECTORY,
      strategyManager,
      oracleManager,
      custodyVault,
      indexToken
    );

    newController = new UnifyVaultController(
      DIRECTORY,
      oracleManager,
      custodyVault,
      treasury,
      indexToken
    );

    dir.updateAddress(ModuleIds.PORTFOLIO_MANAGER, address(newPM));
    dir.updateAddress(
      0xa547798b70ae101787ea36fec5847dd1faff4b09e03b38e66e0951618bb267af,
      address(newController)
    );

    newPM.syncModules();
    vm.stopPrank();
  }

  function test_VerifyLiveBaseSepoliaRedeemQuote1Share() public {
    // Call previewRedeem for 1 share (1e18 wei)
    uint256 previewNetUSDC = newController.previewRedeem(USDC, 1e18);

    console.log('=== Base Sepolia Fork Verification ===');
    console.log('Raw previewRedeem net USDC output:', previewNetUSDC);

    UnifyVaultController.RedeemQuote memory quote = newController.getRedeemQuote(USDC, 1e18, ADMIN);

    // Net USDC payout must equal gross minus 2% redeem fee
    uint256 expectedNet = quote.grossCollateral - ((quote.grossCollateral * 200) / 10000);
    assertEq(previewNetUSDC, expectedNet);
    assertEq(quote.netPayout, expectedNet);
    assertEq(quote.protocolFee, quote.grossCollateral - quote.netPayout);
    assertTrue(quote.grossValueUSD > 0, 'Gross USD value must be positive');
    assertTrue(quote.grossValueUSD < 1000 * 1e18, 'Must be under $1000 USD');
  }

  function test_VerifyLiveBaseSepoliaRedeemQuote10Shares() public {
    uint256 previewNetUSDC10 = newController.previewRedeem(USDC, 10 * 1e18);
    uint256 previewNetUSDC1 = newController.previewRedeem(USDC, 1e18);
    // 10 shares preview should be ~10x 1 share preview (within rounding)
    assertTrue(previewNetUSDC10 >= previewNetUSDC1 * 9, '10 shares payout must scale linearly');
  }
}
