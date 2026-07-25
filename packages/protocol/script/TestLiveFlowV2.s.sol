// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/Test.sol';
import '../src/ProtocolDirectory.sol';
import '../src/controller/UnifyVaultController.sol';
import '../src/vault/CustodyVault.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/strategy/StrategyManager.sol';
import '../src/constants/ModuleIds.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface ITreasuryView {
  function balance(address asset) external view returns (uint256);
  function totalAssetBalance(address asset) external view returns (uint256);
}

contract TestLiveFlowV2Script is Script, Test {
  address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

  function runWithDirectory(address directoryAddress) external {
    vm.startBroadcast();

    address user = msg.sender;
    ProtocolDirectory directory = ProtocolDirectory(directoryAddress);

    address controllerAddr = directory.getAddress(ModuleIds.DEPOSIT_MANAGER);
    address vaultAddr = directory.getAddress(ModuleIds.VAULT);
    address treasuryAddr = directory.getAddress(ModuleIds.TREASURY);
    address tokenAddr = directory.getAddress(ModuleIds.TOKEN);
    address strategyAddr = directory.getAddress(ModuleIds.STRATEGY_MANAGER);
    address portfolioAddr = directory.getAddress(ModuleIds.PORTFOLIO_MANAGER);

    UnifyVaultController controller = UnifyVaultController(controllerAddr);
    CustodyVault vault = CustodyVault(vaultAddr);
    UVBTCETHToken token = UVBTCETHToken(tokenAddr);
    StrategyManager strategy = StrategyManager(strategyAddr);
    PortfolioManager portfolio = PortfolioManager(portfolioAddr);
    IERC20 usdc = IERC20(BASE_SEPOLIA_USDC);

    uint256 depositAmount = 1_000_000; // 1 USDC (6 decimals)

    uint256 userUsdcBefore = usdc.balanceOf(user);
    require(userUsdcBefore >= depositAmount, 'Insufficient USDC balance for test');

    // 1. Approve controller
    usdc.approve(address(controller), depositAmount);

    // 2. Deposit USDC -> multi-asset strategy custody -> mint UVBTCETH shares
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      BASE_SEPOLIA_USDC,
      depositAmount,
      0,
      user
    );

    uint256 sharesMinted = token.balanceOf(user);
    require(sharesMinted > 0, 'No shares minted on deposit');
    require(
      usdc.balanceOf(address(controller)) == 0,
      'Controller USDC balance non-zero after deposit'
    );

    (address[] memory targetAssets, ) = strategy.getTargetWeights();
    console.log('=== LIVE DEPOSIT RESULTS ===');
    console.log('Deposit Gross Amount:   ', depositAmount);
    console.log('Protocol Fee (Treasury):', quote.protocolFee);
    console.log('Net Deposit:            ', quote.netDeposit);
    console.log('Shares Minted:          ', sharesMinted);
    console.log(
      'Treasury USDC Balance:  ',
      ITreasuryView(treasuryAddr).totalAssetBalance(BASE_SEPOLIA_USDC)
    );

    for (uint256 i = 0; i < targetAssets.length; i++) {
      uint256 vBal = vault.totalAssets(targetAssets[i]);
      console.log('Vault Strategy Asset Bal:', targetAssets[i], vBal);
    }

    (, uint256 navAfterDeposit) = portfolio.calculateNAV();
    console.log('NAV after Deposit:      ', navAfterDeposit);

    // 3. Redeem shares -> release vault assets -> swap to USDC -> burn shares -> return USDC to user
    uint256 redeemShares = sharesMinted;
    usdc.approve(address(controller), 0);

    uint256 netAssetsOut = controller.redeem(
      BASE_SEPOLIA_USDC,
      redeemShares,
      0,
      user,
      block.timestamp + 300
    );

    uint256 userSharesAfter = token.balanceOf(user);
    require(userSharesAfter == 0, 'Shares not fully burned on redemption');
    require(
      usdc.balanceOf(address(controller)) == 0,
      'Controller USDC balance non-zero after redeem'
    );

    console.log('=== LIVE REDEEM RESULTS ===');
    console.log('Shares Burned:          ', redeemShares);
    console.log('Net Assets Out (USDC):  ', netAssetsOut);
    console.log('Remaining User Shares:  ', userSharesAfter);
    console.log(
      'Treasury USDC Balance:  ',
      ITreasuryView(treasuryAddr).totalAssetBalance(BASE_SEPOLIA_USDC)
    );

    for (uint256 i = 0; i < targetAssets.length; i++) {
      uint256 vBal = vault.totalAssets(targetAssets[i]);
      console.log('Vault Strategy Asset Bal after:', targetAssets[i], vBal);
    }

    (, uint256 navAfterRedeem) = portfolio.calculateNAV();
    console.log('NAV after Redeem:       ', navAfterRedeem);

    vm.stopBroadcast();
  }

  function run() external {
    // Default fallback run method
  }
}
