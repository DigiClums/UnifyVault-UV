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
    _executeFlow(msg.sender, directoryAddress);
    vm.stopBroadcast();
  }

  function _executeFlow(address user, address directoryAddress) internal {
    ProtocolDirectory directory = ProtocolDirectory(directoryAddress);
    UnifyVaultController controller = UnifyVaultController(
      directory.getAddress(ModuleIds.DEPOSIT_MANAGER)
    );
    IERC20 usdc = IERC20(BASE_SEPOLIA_USDC);

    uint256 depositAmount = 1_000_000;
    require(usdc.balanceOf(user) >= depositAmount, 'Insufficient USDC balance for test');

    usdc.approve(address(controller), depositAmount);
    UnifyVaultController.DepositQuote memory quote = controller.deposit(
      BASE_SEPOLIA_USDC,
      depositAmount,
      0,
      user
    );

    _logDeposit(directoryAddress, depositAmount, quote);

    usdc.approve(address(controller), 0);
    UVBTCETHToken token = UVBTCETHToken(directory.getAddress(ModuleIds.TOKEN));
    uint256 redeemShares = token.balanceOf(user);

    uint256 netAssetsOut = controller.redeem(
      BASE_SEPOLIA_USDC,
      redeemShares,
      0,
      user,
      block.timestamp + 300
    );
    _logRedeem(directoryAddress, redeemShares, netAssetsOut);
  }

  function _logDeposit(
    address directoryAddress,
    uint256 depositAmount,
    UnifyVaultController.DepositQuote memory quote
  ) internal {
    ProtocolDirectory directory = ProtocolDirectory(directoryAddress);
    address treasuryAddr = directory.getAddress(ModuleIds.TREASURY);
    UVBTCETHToken token = UVBTCETHToken(directory.getAddress(ModuleIds.TOKEN));

    console.log('=== LIVE DEPOSIT RESULTS ===');
    console.log('Deposit Gross Amount:   ', depositAmount);
    console.log('Protocol Fee (Treasury):', quote.protocolFee);
    console.log('Net Deposit:            ', quote.netDeposit);
    console.log('Shares Minted:          ', token.balanceOf(msg.sender));
    console.log(
      'Treasury USDC Balance:  ',
      ITreasuryView(treasuryAddr).totalAssetBalance(BASE_SEPOLIA_USDC)
    );
  }

  function _logRedeem(
    address directoryAddress,
    uint256 redeemShares,
    uint256 netAssetsOut
  ) internal {
    ProtocolDirectory directory = ProtocolDirectory(directoryAddress);
    address treasuryAddr = directory.getAddress(ModuleIds.TREASURY);

    console.log('=== LIVE REDEEM RESULTS ===');
    console.log('Shares Burned:          ', redeemShares);
    console.log('Net Assets Out (USDC):  ', netAssetsOut);
    console.log(
      'Treasury USDC Balance:  ',
      ITreasuryView(treasuryAddr).totalAssetBalance(BASE_SEPOLIA_USDC)
    );
  }

  function run() external {
    // Default fallback run method
  }
}
