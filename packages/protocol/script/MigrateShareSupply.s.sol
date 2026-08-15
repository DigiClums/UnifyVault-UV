// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import 'forge-std/console2.sol';
import '../src/ProtocolDirectory.sol';
import '../src/strategy/PortfolioManager.sol';
import '../src/token/UVBTCETHToken.sol';
import '../src/treasury/CostBasisManager.sol';
import '../src/treasury/PerformanceManager.sol';
import '../src/constants/ModuleIds.sol';

contract MigrateShareSupplyScript is Script {
  address public constant DIRECTORY = 0x329158A24DdC8ED267cc5D3f3D9C2905149C596D;
  address public constant ADMIN = 0xd905920c91853039060246Ed5724AA72B91a96DA;
  address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

  function run() external {
    vm.startBroadcast();

    address deployer = msg.sender;
    console2.log('=== UNIFYVAULT V2 $1 GENESIS NAV REBASE MIGRATION ===');
    console2.log('Deployer / Admin:', deployer);
    console2.log('ProtocolDirectory:', DIRECTORY);

    ProtocolDirectory dir = ProtocolDirectory(DIRECTORY);
    PortfolioManager pm = PortfolioManager(dir.getAddress(ModuleIds.PORTFOLIO_MANAGER));
    UVBTCETHToken token = UVBTCETHToken(dir.getAddress(ModuleIds.TOKEN));
    CostBasisManager cbm = CostBasisManager(dir.getAddress(ModuleIds.COST_BASIS_MANAGER));

    (uint256 portfolioNAV, uint256 oldNAVPerShare) = pm.calculateNAV();
    uint256 oldTotalSupply = token.totalSupply();
    uint256 oldAdminShares = token.balanceOf(ADMIN);
    uint256 oldDeadShares = token.balanceOf(DEAD);
    uint256 oldCostBasis = cbm.costBasis(ADMIN);

    console2.log('Portfolio NAV (USD 18 dec):', portfolioNAV);
    console2.log('Old Total Supply:          ', oldTotalSupply);
    console2.log('Old NAV / Share (USD 18):  ', oldNAVPerShare);
    console2.log('Old Admin Shares:          ', oldAdminShares);
    console2.log('Old Dead Shares:           ', oldDeadShares);
    console2.log('Old Admin Cost Basis:      ', oldCostBasis);

    require(oldTotalSupply > 0, 'Total supply must be positive to rebase');
    require(portfolioNAV > 0, 'Portfolio NAV must be positive to rebase');

    // Target NAV per share = 1e18 ($1.00 USD)
    uint256 newDeadShares = (oldDeadShares * portfolioNAV) / oldTotalSupply;
    uint256 newAdminShares = portfolioNAV - newDeadShares;
    uint256 newTotalSupply = newAdminShares + newDeadShares;

    console2.log('\n--- Executing Rebase ---');
    console2.log('New Target NAV / Share: 1.000000 USD (1e18)');
    console2.log('New Total Supply:      ', newTotalSupply);
    console2.log('New Admin Shares:      ', newAdminShares);
    console2.log('New Dead Shares:       ', newDeadShares);

    bytes32 controllerRole = token.CONTROLLER_ROLE();
    bool hadController = token.hasRole(controllerRole, ADMIN);
    if (!hadController) {
      token.grantRole(controllerRole, ADMIN);
      console2.log('Granted temporary CONTROLLER_ROLE to ADMIN');
    }

    if (oldAdminShares > 0) {
      token.burn(ADMIN, oldAdminShares);
      console2.log('Burned old Admin shares:', oldAdminShares);
    }
    if (oldDeadShares > 0) {
      token.burn(DEAD, oldDeadShares);
      console2.log('Burned old Dead shares: ', oldDeadShares);
    }

    token.mint(ADMIN, newAdminShares);
    console2.log('Minted new rebased Admin shares:', newAdminShares);

    token.mint(DEAD, newDeadShares);
    console2.log('Minted new rebased Dead shares: ', newDeadShares);

    if (!hadController) {
      token.revokeRole(controllerRole, ADMIN);
      console2.log('Revoked temporary CONTROLLER_ROLE from ADMIN');
    }

    (uint256 postNAV, uint256 postNAVPerShare) = pm.calculateNAV();
    uint256 postTotalSupply = token.totalSupply();
    uint256 postAdminShares = token.balanceOf(ADMIN);
    uint256 postDeadShares = token.balanceOf(DEAD);
    uint256 postCostBasis = cbm.costBasis(ADMIN);

    console2.log('\n=== POST-MIGRATION VERIFICATION ===');
    console2.log('Post Portfolio NAV:  ', postNAV);
    console2.log('Post Total Supply:   ', postTotalSupply);
    console2.log('Post NAV / Share:    ', postNAVPerShare);
    console2.log('Post Admin Shares:   ', postAdminShares);
    console2.log('Post Dead Shares:    ', postDeadShares);
    console2.log('Post Admin Cost Basis:', postCostBasis);

    require(postNAVPerShare == 1e18, 'NAV per share must be exactly $1.00 (1e18)');
    require(postTotalSupply == portfolioNAV, 'Total supply must equal portfolio NAV');
    require(postCostBasis == oldCostBasis, 'Cost basis must be unchanged');

    vm.stopBroadcast();
  }
}
