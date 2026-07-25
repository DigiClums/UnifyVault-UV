// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Test.sol';
import '../src/ProtocolDirectory.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract LiveSimTest is Test {
  address public constant PROTOCOL_DIRECTORY = 0xDd29e54f91b86f3e4609AA2e279e04E98dcAb722;
  address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  function testLiveDepositAndRedeemOnFork() public {
    address user = address(0x1234567890123456789012345678901234567890);
    ProtocolDirectory directory = ProtocolDirectory(PROTOCOL_DIRECTORY);

    address controllerAddr = directory.getAddress(ModuleIds.DEPOSIT_MANAGER);
    address vaultAddr = directory.getAddress(ModuleIds.VAULT);
    address tokenAddr = directory.getAddress(ModuleIds.TOKEN);
    address strategyAddr = directory.getAddress(ModuleIds.STRATEGY_MANAGER);
    address portfolioAddr = directory.getAddress(ModuleIds.PORTFOLIO_MANAGER);

    UnifyVaultController controller = UnifyVaultController(controllerAddr);
    CustodyVault vault = CustodyVault(vaultAddr);
    UVBTCETHToken token = UVBTCETHToken(tokenAddr);
    IERC20 usdc = IERC20(BASE_SEPOLIA_USDC);

    uint256 depositAmount = 10_000_000; // 10 USDC

    // Give user 10 USDC on fork
    deal(BASE_SEPOLIA_USDC, user, depositAmount);

    vm.startPrank(user);

    // 1. Approve controller
    usdc.approve(address(controller), depositAmount);

    // 2. Deposit
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      BASE_SEPOLIA_USDC,
      depositAmount,
      0,
      user
    );

    uint256 sharesMinted = token.balanceOf(user);
    assertGt(sharesMinted, 0, 'Shares should be minted');

    // 3. Redeem
    uint256 netAssetsOut = controller.redeem(
      BASE_SEPOLIA_USDC,
      sharesMinted,
      0,
      user,
      block.timestamp + 300
    );

    assertGt(netAssetsOut, 0, 'Net assets out should be > 0');
    assertEq(token.balanceOf(user), 0, 'Shares should be burned');

    vm.stopPrank();
  }
}
