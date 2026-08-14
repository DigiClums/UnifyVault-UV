// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import 'forge-std/Script.sol';
import '../src/aa/UnifyVaultPaymaster.sol';
import '../src/aa/GasTreasury.sol';
import '../src/aa/interfaces/IPaymasterV07.sol';
import '../src/controller/UnifyVaultController.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title DeployAAAndExecuteLiveVerification
 * @notice Production deployment script for UnifyVault Account Abstraction on Base Sepolia
 */
contract DeployAAAndExecuteLiveVerification is Script {
  address public constant CANONICAL_ENTRYPOINT_V07 = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
  address public constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
  address public constant DEPLOYED_DIRECTORY = 0x8040006d6907a84911aaC0a9aC08278311B156e2;
  address public constant DEPLOYED_CONTROLLER = 0x424F3D9874BD97dDFDc9C267498dc4E8769B13ec;
  address public constant DEPLOYED_TOKEN = 0x006c5DF13C716E5224b33956651C4356BB90DEc0;
  address public constant DEPLOYED_ESCROW = 0xd2A5489618759a6c8CA07163ACdC845Cf7D104Bb;

  function run() external {
    address deployer = msg.sender;

    console.log('=== UNIFYVAULT AA BASE SEPOLIA LIVE DEPLOYMENT ===');
    console.log('Deployer Address:', deployer);
    console.log('Deployer Balance:', deployer.balance);

    vm.startBroadcast();

    // 1. Deploy UnifyVaultPaymaster
    UnifyVaultPaymaster paymaster = new UnifyVaultPaymaster(
      CANONICAL_ENTRYPOINT_V07,
      deployer,
      address(0), // Pure on-chain policy verification
      0.05 ether // Max 0.05 ETH per UserOp
    );
    console.log('UnifyVaultPaymaster Deployed At:', address(paymaster));

    // 2. Deploy GasTreasury
    GasTreasury gasTreasury = new GasTreasury(
      deployer,
      deployer, // Refill operator
      address(paymaster),
      0.5 ether, // Max refill per tx
      2.0 ether // Daily refill cap
    );
    console.log('GasTreasury Deployed At:', address(gasTreasury));

    // 3. Configure Paymaster Policy (Targets & Selectors)
    paymaster.setApprovedTarget(BASE_SEPOLIA_USDC, true);
    paymaster.setApprovedTarget(DEPLOYED_CONTROLLER, true);
    paymaster.setApprovedTarget(DEPLOYED_TOKEN, true);
    paymaster.setApprovedTarget(DEPLOYED_ESCROW, true);

    paymaster.setApprovedSelector(BASE_SEPOLIA_USDC, IERC20.approve.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_CONTROLLER, UnifyVaultController.deposit.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_CONTROLLER, UnifyVaultController.redeem.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_TOKEN, IERC20.transfer.selector, true);
    paymaster.setApprovedSelector(DEPLOYED_TOKEN, IERC20.approve.selector, true);
    console.log('Paymaster Policy Configured Successfully');

    // 4. Fund GasTreasury with 0.015 ETH testnet reserve
    (bool sent, ) = address(gasTreasury).call{ value: 0.015 ether }('');
    require(sent, 'Failed to fund GasTreasury');
    console.log('GasTreasury Funded with 0.015 ETH');

    // 5. Execute Refill to Paymaster EntryPoint deposit (0.01 ETH)
    gasTreasury.refillPaymaster(0.01 ether);
    console.log('Paymaster EntryPoint Deposit Refilled. Balance:', paymaster.getDeposit());

    vm.stopBroadcast();

    console.log('=== DEPLOYMENT AND CONFIGURATION COMPLETED ===');
  }
}
